import { describe, expect, it } from 'vitest';
import { matchSources, scoreSource, type SourceRecord } from '@/lib/source-registry';
import { htmlToText } from '@/lib/source-fetch.server';

const registry: SourceRecord[] = [
  { id: '1', url: 'https://jeemain.nta.ac.in', title: 'JEE Main', authority: 'NTA', category: 'entrance_exam', keywords: ['jee', 'jee main', 'engineering entrance'], content: null, fetched_at: null, verified_at: null, status: 'registered' },
  { id: '2', url: 'https://neet.nta.nic.in', title: 'NEET (UG)', authority: 'NTA', category: 'entrance_exam', keywords: ['neet', 'medical entrance', 'mbbs'], content: null, fetched_at: null, verified_at: null, status: 'registered' },
  { id: '3', url: 'https://josaa.nic.in', title: 'JoSAA', authority: 'JoSAA', category: 'counselling', keywords: ['josaa', 'cutoff', 'closing rank'], content: null, fetched_at: null, verified_at: null, status: 'registered' },
];

describe('matchSources', () => {
  it('matches the JEE Main source for a JEE question', () => {
    const matched = matchSources(registry, 'What are the JEE Main 2026 exam dates?');
    expect(matched[0]?.url).toBe('https://jeemain.nta.ac.in');
  });

  it('matches NEET for a medical question and not JEE', () => {
    const matched = matchSources(registry, 'When is the NEET UG result expected?');
    expect(matched.map((m) => m.url)).toContain('https://neet.nta.nic.in');
    expect(matched.map((m) => m.url)).not.toContain('https://jeemain.nta.ac.in');
  });

  it('returns nothing for an unrelated question', () => {
    expect(matchSources(registry, 'How do I talk to my parents about my career?')).toHaveLength(0);
  });

  it('limits the number of matches', () => {
    const matched = matchSources(registry, 'jee main neet josaa cutoff', 2);
    expect(matched.length).toBeLessThanOrEqual(2);
  });

  it('scores multi-word keywords higher than single words', () => {
    const record = registry[0]!;
    expect(scoreSource(record, 'jee main')).toBeGreaterThan(scoreSource(record, 'jee'));
  });
});

describe('htmlToText', () => {
  it('strips scripts, styles and tags', () => {
    const html = '<html><head><style>body{color:red}</style><script>alert(1)</script></head><body><h1>JEE Main 2026</h1><p>Exam in &nbsp;January</p></body></html>';
    const text = htmlToText(html);
    expect(text).toContain('JEE Main 2026');
    expect(text).toContain('Exam in January');
    expect(text).not.toContain('alert');
    expect(text).not.toContain('color:red');
    expect(text).not.toContain('<');
  });
});
