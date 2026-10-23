import markAsset from '@/assets/careerkind_mark.png';

export function Brand() {
  return (
    <div className="flex items-center gap-3">
      <img src={markAsset} alt="Career Kind logo" className="h-9 w-auto sm:h-11" />
      <div className="relative flex items-center">
        <span className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Career <span className="text-accent-foreground">Kind</span>
        </span>
        <span className="absolute left-0 top-full mt-1 hidden text-[10px] font-bold uppercase text-muted-foreground sm:block">AI career intelligence</span>
      </div>
    </div>
  );
}
