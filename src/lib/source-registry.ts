// Matches a user's question against the official-source registry keywords.
// Shared (browser-safe) module: no server-only imports here.

export type SourceRecord = {
  id: string;
  url: string;
  title: string;
  authority: string;
  category: string;
  keywords: string[];
  content: string | null;
  fetched_at: string | null;
  verified_at: string | null;
  status: string;
};

/** Score a registry row against a user message. Higher = more relevant. */
export function scoreSource(record: Pick<SourceRecord, 'keywords' | 'category' | 'title'>, message: string): number {
  const text = message.toLowerCase();
  let score = 0;
  for (const keyword of record.keywords) {
    const k = keyword.toLowerCase();
    if (!k) continue;
    // Whole-phrase match on word boundaries where possible.
    const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${escaped}\\b`, 'i');
    if (re.test(text)) score += k.includes(' ') ? 3 : 2;
  }
  return score;
}

/** Pick the most relevant registry rows for a message, best first. */
export function matchSources(records: SourceRecord[], message: string, limit = 2): SourceRecord[] {
  return records
    .map((record) => ({ record, score: scoreSource(record, message) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.record);
}
