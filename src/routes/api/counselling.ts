import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';
import { createOpenAI } from '@ai-sdk/openai';
import { convertToModelMessages, streamText, type UIMessage } from 'ai';
import type { Database } from '@/integrations/supabase/types';
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId, withLovableAiGatewayRunIdHeader } from '@/lib/run-id.server';
import { counsellorInstructions } from '@/lib/counselling-prompt';
import { retrieveSources } from '@/lib/source-fetch.server';
import { counsellingAccess } from '@/lib/counselling-config';

const json = (status: number, message: string) => Response.json({ error: message }, { status });

export const Route = createFileRoute('/api/counselling')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
        if (!token) return json(401, 'Please sign in again.');
        const supabase = createClient<Database>(process.env['SUPABASE_URL'] ?? import.meta.env['VITE_SUPABASE_URL'], process.env['SUPABASE_PUBLISHABLE_KEY'] ?? import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'], {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: userData, error: userError } = await supabase.auth.getUser(token);
        if (userError || !userData.user) return json(401, 'Please sign in again.');
        const userId = userData.user.id;

        // Only trusted payment verification can write this account's entitlement.
        // Check before saving a new question or invoking retrieval/AI; history reads stay independent.
        const { data: access, error: accessError } = await supabase.from('counselling_access').select('verified_paid_at').eq('user_id', userId).maybeSingle();
        if (accessError) return json(503, 'Could not check session validity. Please try again.');
        if (!counsellingAccess(access?.verified_paid_at ?? null).canAsk) {
          return json(403, 'A paid session is needed for new questions. Your old questions, answers and saved reports remain available for your lifetime. Please purchase a 28-day personal session to ask new questions.');
        }

        const body = (await request.json().catch(() => null)) as { messages?: UIMessage[] } | null;
        const messages = Array.isArray(body?.messages) ? body.messages.slice(-40) : [];
        const last = messages[messages.length - 1];
        const lastText = last?.role === 'user' ? last.parts.map((p) => (p.type === 'text' ? p.text : '')).join('').trim() : '';
        if (!lastText || lastText.length > 2000) return json(400, 'Please write a message (up to 2000 characters).');

        const [{ data: profile }, { data: assessments }] = await Promise.all([
          supabase.from('student_profiles').select('student_name,parent_name,category,board,school,city,state,subjects').eq('user_id', userId).maybeSingle(),
          supabase.from('assessments').select('mode,answers,result').eq('user_id', userId).eq('status', 'complete').order('updated_at', { ascending: false }).limit(1),
        ]);
        if (!profile) return json(403, 'Complete your student profile first.');
        const assessment = assessments?.[0];
        if (!assessment) return json(403, 'Complete a free assessment before starting counselling.');

        const { error: saveUserError } = await supabase.from('counselling_messages').insert({ user_id: userId, role: 'user', parts: [{ type: 'text', text: lastText }] });
        if (saveUserError) return json(500, 'Could not save your message. Please try again.');

        // Hybrid official-source retrieval: fetch only the official page(s)
        // relevant to this question, with cached verified results.
        const sources = await retrieveSources(supabase, lastText).catch((error) => {
          console.error('Source retrieval failed', error);
          return [];
        });

        const apiKey = process.env['LOVABLE_API_KEY'];
        if (!apiKey) return json(500, 'AI counselling is not configured.');
        const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
        const provider = createOpenAI({
          baseURL: 'https://ai.gateway.lovable.dev/v1',
          apiKey,
          headers: { 'Lovable-API-Key': apiKey, 'X-Lovable-AIG-SDK': 'vercel-ai-sdk' },
          fetch: runIdFetch.fetch,
        });
        const result = streamText({
          model: provider.responses('openai/gpt-6-astra'),
          instructions: counsellorInstructions(profile, assessment, sources),
          messages: await convertToModelMessages(messages),
          abortSignal: request.signal,
          maxRetries: 0,
          providerOptions: { openai: { store: false, forceReasoning: true, reasoningEffort: 'medium', reasoningSummary: 'auto', include: ['reasoning.encrypted_content'] } },
        });
        return withLovableAiGatewayRunIdHeader(
          result.toUIMessageStreamResponse({
            originalMessages: messages,
            onFinish: async ({ responseMessage }) => {
              const parts = responseMessage.parts.filter((p) => p.type === 'text');
              if (!parts.length) return;
              const { error } = await supabase.from('counselling_messages').insert({ user_id: userId, role: 'assistant', parts: JSON.parse(JSON.stringify(parts)) });
              if (error) console.error('Saving counsellor reply failed', error);
            },
            onError: (error) => {
              console.error('Counselling stream failed', error);
              const status = error && typeof error === 'object' && 'statusCode' in error ? error.statusCode : 0;
              if (status === 402) return 'AI credits have run out. The app owner can add credits in Settings → Plans & credits.';
              if (status === 429) return 'The counsellor is busy right now. Please wait a moment and try again.';
              return 'The counsellor could not reply just now. Please try again.';
            },
          }),
          runIdFetch,
        );
      },
    },
  },
});
