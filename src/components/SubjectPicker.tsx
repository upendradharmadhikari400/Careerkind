import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SUBJECTS } from '@/lib/india-data';

export function SubjectPicker({ selected, other, onSelected, onOther }: { selected: string[]; other: string; onSelected: (s: string[]) => void; onOther: (s: string) => void }) {
  return <div className="space-y-3">
    <Label htmlFor="subjects-select">Subjects</Label>
    <select id="subjects-select" aria-label="Add a subject" className="h-10 w-full rounded-md border bg-card px-3 text-sm" value="" onChange={e => { if (e.target.value === '__other') onOther(other || ' '); else if (e.target.value) onSelected([...selected, e.target.value]); }}>
      <option value="">Add a subject…</option>
      {SUBJECTS.filter(s => !selected.includes(s)).map(s => <option key={s}>{s}</option>)}
      <option value="__other">Other subjects — write your own</option>
    </select>
    <div className="flex flex-wrap gap-2">{selected.map(s => <Button key={s} variant="secondary" size="sm" type="button" aria-label={`Remove ${s}`} onClick={() => onSelected(selected.filter(v => v !== s))}>{s}<X className="size-3" /></Button>)}</div>
    {other !== '' ? <div className="space-y-2"><Label htmlFor="other-subjects">Other subjects</Label><textarea id="other-subjects" className="min-h-20 w-full rounded-md border bg-card p-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" maxLength={500} value={other.trim() === '' ? '' : other} onChange={e => onOther(e.target.value || ' ')} placeholder="Write subjects, separated by commas" /></div> : <Button type="button" variant="ghost" size="sm" onClick={() => onOther(' ')}><Plus />Other subjects</Button>}
  </div>;
}