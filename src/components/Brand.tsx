import logoAsset from '@/assets/careerkind_logo.png.asset.json';

export function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <img src={logoAsset.url} alt="CareerKind logo" className="h-12 w-auto" />
      <div className="mt-1 hidden text-[10px] font-bold uppercase text-muted-foreground sm:block">AI career intelligence</div>
    </div>
  );
}
