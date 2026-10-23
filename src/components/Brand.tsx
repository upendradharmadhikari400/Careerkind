import markAsset from '@/assets/careerkind_mark.png';

export function Brand() {
  return (
    <div className="flex items-center gap-3">
      <img src={markAsset} alt="Career Kind logo" className="h-9 w-auto sm:h-11" />
      <span className="font-display text-2xl font-extrabold leading-none tracking-tight text-foreground sm:text-3xl">
        Career <span className="text-accent-foreground">Kind</span>
      </span>
    </div>
  );
}
