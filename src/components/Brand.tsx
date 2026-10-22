import markAsset from '@/assets/careerkind_mark.png';

export function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <img src={markAsset} alt="Career Kind logo" className="h-9 w-auto sm:h-11" />
      <div className="flex flex-col leading-none">
        <span className="font-display text-lg font-extrabold tracking-tight text-foreground sm:text-xl">
          Career <span className="text-accent-foreground">Kind</span>
        </span>
        <span className="mt-1 hidden text-[10px] font-bold uppercase text-muted-foreground sm:block">AI career intelligence</span>
      </div>
    </div>
  );
}
