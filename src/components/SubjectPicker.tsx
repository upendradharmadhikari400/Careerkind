import { useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SUBJECTS } from '@/lib/india-data';

export function SubjectPicker({ selected, other, onSelected, onOther }: { selected: string[]; other: string; onSelected: (s: string[]) => void; onOther: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const toggle = (s: string) => onSelected(selected.includes(s) ? selected.filter(v => v !== s) : [...selected, s]);
  return <div className="space-y-3">
    <Label htmlFor="subjects-toggle">Subjects</Label>
    <button id="subjects-toggle" type="button" aria-expanded={open} onClick={() => setOpen(o => !o)} className="flex h-10 w-full items-center justify-between rounded-md border bg-card px-3 text-left text-sm">
      <span className="truncate">{selected.length ? selected.join(', ') : 'Select subjects…'}</span><ChevronDown className="size-4 shrink-0" />
    </button>
    {open && <fieldset className="grid max-h-64 gap-1 overflow-y-auto rounded-md border bg-card p-3 sm:grid-cols-2">
      <legend className="sr-only">Tick all subjects that apply</legend>
      {SUBJECTS.map(s => <label key={s} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1.5 text-sm hover:bg-muted"><input type="checkbox" className="size-4 accent-primary" checked={selected.includes(s)} onChange={() => toggle(s)} />{s}</label>)}
      <div className="sm:col-span-2 pt-2"><Button type="button" size="sm" variant="secondary" onClick={() => setOpen(false)}>Done</Button></div>
    </fieldset>}
    {other !== '' ? <div className="space-y-2"><Label htmlFor="other-subjects">Other subjects</Label><textarea id="other-subjects" className="min-h-20 w-full rounded-md border bg-card p-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" maxLength={500} value={other.trim() === '' ? '' : other} onChange={e => onOther(e.target.value || ' ')} placeholder="Write subjects, separated by commas" /></div> : <Button type="button" variant="ghost" size="sm" onClick={() => onOther(' ')}><Plus />Other subjects</Button>}
  </div>;
}
