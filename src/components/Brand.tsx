import { Compass } from 'lucide-react';

export function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground"><Compass className="size-5" /></div>
      <div>
        <div className="font-display text-base font-extrabold leading-none">CareerKind</div>
        <div className="mt-1 text-[10px] font-bold uppercase text-muted-foreground">AI career intelligence</div>
      </div>
    </div>
  );
}
