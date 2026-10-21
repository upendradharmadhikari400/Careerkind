// Server-only: on-demand retrieval of official source pages with caching.
// Fetches only the official page relevant to the user's question, caches the
// extracted text in source_records, and records when it was last verified.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { matchSources, type SourceRecord } from './source-registry';

const CACHE_FRESH_MS = 7 * 24 * 60 * 60 * 1000; // re-fetch pages older than 7 days
const FETCH_TIMEOUT_MS = 9000;
const MAX_EXCERPT_CHARS = 2500;

export type RetrievedSource = {
  title: string;
  url: string;
  authority: string;
  category: string;
  verifiedAt: string | null;
  excerpt: string | null;
  fetchFailed: boolean;
};

/** Very small HTML → text extraction (no DOM parser on the worker runtime). */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'CareerKind-SourceVerifier/1.0', Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
    });
    clearTimeout(timer);
    if (!response.ok) return null;
    const html = await response.text();
    const text = htmlToText(html);
    return text.length > 40 ? text.slice(0, MAX_EXCERPT_CHARS) : null;
  } catch {
    return null;
  }
}

type SourceClient = SupabaseClient<Database>;

/**
 * Retrieve the official sources relevant to a user message.
 * Reads the registry with the caller's client, fetches only the matched
 * pages, and refreshes the cache through the service role.
 */
export async function retrieveSources(
  supabase: SourceClient,
  message: string,
  limit = 2,
): Promise<RetrievedSource[]> {
  const { data: registry } = await supabase
    .from('source_records')
    .select('id,url,title,authority,category,keywords,content,fetched_at,verified_at,status')
    .order('created_at', { ascending: true });
  if (!registry?.length) return [];

  const matched = matchSources(registry, message, limit);
  if (!matched.length) return [];

  const results: RetrievedSource[] = [];
  for (const record of matched) {
    const fresh = record.content && record.fetched_at && Date.now() - new Date(record.fetched_at).getTime() < CACHE_FRESH_MS;
    if (fresh) {
      results.push({
        title: record.title,
        url: record.url,
        authority: record.authority,
        category: record.category,
        verifiedAt: record.verified_at ?? record.fetched_at,
        excerpt: record.content,
        fetchFailed: false,
      });
      continue;
    }

    const excerpt = await fetchPage(record.url);
    const now = new Date().toISOString();
    if (excerpt) {
      try {
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
        await supabaseAdmin
          .from('source_records')
          .update({ content: excerpt, fetched_at: now, verified_at: now, status: 'verified' })
          .eq('id', record.id);
      } catch (error) {
        console.error('Caching source record failed', error);
      }
    } else {
      try {
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
        await supabaseAdmin
          .from('source_records')
          .update({ fetched_at: now, status: 'unreachable' })
          .eq('id', record.id);
      } catch (error) {
        console.error('Updating source record failed', error);
      }
    }

    results.push({
      title: record.title,
      url: record.url,
      authority: record.authority,
      category: record.category,
      verifiedAt: excerpt ? now : (record.verified_at ?? record.fetched_at),
      excerpt: excerpt ?? record.content,
      fetchFailed: !excerpt && !record.content,
    });
  }
  return results;
}
