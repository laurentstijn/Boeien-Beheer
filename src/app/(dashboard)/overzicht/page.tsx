import { getAssets, getAssemblyPotential } from "@/lib/db";
import { BuoyIcon } from "@/components/BuoyIcon";
import { ChainIcon } from "@/components/ChainIcon";
import { StoneIcon } from "@/components/StoneIcon";
import { CheckCircle2, Lightbulb, Anchor, Tag, Layers, Share2 } from "lucide-react";
import clsx from "clsx";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function OverzichtPage() {
  // Fetch all assets
  const [
    buoyAssets,
    chainAssets,
    stoneAssets,
    topmarkAssets,
    lampAssets,
    shackleAssets,
    zincAssets,
    assemblyPotentials
  ] = await Promise.all([
    getAssets("Boei"),
    getAssets("Ketting"),
    getAssets("Steen"),
    getAssets("Topteken"),
    getAssets("Lamp"),
    getAssets("Sluiting"),
    getAssets("Zinkblok"),
    getAssemblyPotential()
  ]);

  // Filter for available stock ONLY for the inventory counts
  const availableBuoys = buoyAssets.filter((a: any) => a.status === 'in_stock');
  const availableChains = chainAssets.filter((a: any) => a.status === 'in_stock');
  const availableStones = stoneAssets.filter((a: any) => a.status === 'in_stock');
  const availableTopmarks = topmarkAssets.filter((a: any) => a.status === 'in_stock');
  const availableLamps = lampAssets.filter((a: any) => a.status === 'in_stock');
  const availableShackles = shackleAssets.filter((a: any) => a.status === 'in_stock');
  const availableZinc = zincAssets.filter((a: any) => a.status === 'in_stock');

  // Group buoys by color
  const buoyColorCounts: Record<string, number> = {};
  availableBuoys.forEach((asset: any) => {
    const color = asset.metadata?.color || 'Onbekend';
    buoyColorCounts[color] = (buoyColorCounts[color] || 0) + 1;
  });

  // Calculate assembly potential per color
  const colorAssemblyPotential: Record<string, number> = {};
  assemblyPotentials.forEach((p: any) => {
    if (p.potential > 0) {
      colorAssemblyPotential[p.color] = (colorAssemblyPotential[p.color] || 0) + p.potential;
    }
  });

  // Group chairs by color and swivel status
  const chainColorCounts: Record<string, number> = {};
  const chainColorSwivelCounts: Record<string, { withSwivel: number; withoutSwivel: number }> = {};
  availableChains.forEach((asset: any) => {
    const colorMatch = asset.name?.match(/Ketting\s+(.+)/);
    const color = colorMatch ? colorMatch[1].split(' ')[0] : 'Onbekend';
    const hasSwivel = asset.metadata?.swivel === "Ja" || asset.metadata?.swivel === "True";
    chainColorCounts[color] = (chainColorCounts[color] || 0) + 1;
    if (!chainColorSwivelCounts[color]) chainColorSwivelCounts[color] = { withSwivel: 0, withoutSwivel: 0 };
    if (hasSwivel) chainColorSwivelCounts[color].withSwivel++;
    else chainColorSwivelCounts[color].withoutSwivel++;
  });

  // Group stones by weight/shape
  const stoneWeightCounts: Record<string, number> = {};
  availableStones.forEach((asset: any) => {
    let weight = asset.specs?.weight || asset.metadata?.weight || 'Onbekend';
    let shape = asset.specs?.shape || asset.metadata?.shape || 'Onbekend';
    const key = `${weight}|${shape}`;
    stoneWeightCounts[key] = (stoneWeightCounts[key] || 0) + 1;
  });

  // Group lamps by color
  const lampColorCounts: Record<string, number> = {};
  availableLamps.forEach((asset: any) => {
    const color = asset.metadata?.color || asset.metadata?.lamp_color || 'Onbekend';
    lampColorCounts[color] = (lampColorCounts[color] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-app-text-primary">Overzicht Beschikbaar</h1>
        <div className="px-3 py-1 bg-green-500/10 text-green-500 text-[10px] font-bold uppercase tracking-wider rounded-full border border-green-500/20">
          Actuele Voorraad
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Boeien', value: availableBuoys.length, icon: Anchor, color: 'blue' },
          { label: 'Kettingen', value: availableChains.length, icon: Share2, color: 'orange' },
          { label: 'Stenen', value: availableStones.length, icon: Layers, color: 'gray' },
          { label: 'Lampen', value: availableLamps.length, icon: Lightbulb, color: 'yellow' },
        ].map((stat) => {
          const IconComponent = stat.icon;
          return (
            <div key={stat.label} className="bg-app-surface rounded-2xl border border-app-border p-4 shadow-sm flex items-center gap-4">
              <div className={clsx(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                stat.color === 'blue' && "bg-blue-500/10 text-blue-500",
                stat.color === 'orange' && "bg-orange-500/10 text-orange-500",
                stat.color === 'gray' && "bg-gray-500/10 text-gray-500",
                stat.color === 'yellow' && "bg-yellow-500/10 text-yellow-500",
              )}>
                <IconComponent className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-app-text-secondary">{stat.label}</p>
                <p className="text-xl font-black text-app-text-primary">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Available Buoys */}
        <div className="bg-app-surface rounded-2xl border border-app-border p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Anchor className="w-5 h-5 text-blue-500" />
            <h2 className="font-bold text-app-text-primary">Boeien</h2>
          </div>
          <div className="space-y-2">
            {Object.entries(buoyColorCounts).sort(([, a], [, b]) => b - a).map(([color, count]) => (
              <div key={color} className="flex flex-col gap-1">
                <div className="flex items-center justify-between bg-app-bg/50 rounded-xl px-3 py-2 border border-app-border/10">
                  <div className="flex items-center gap-2">
                    <BuoyIcon color={color} size="sm" />
                    <span className="text-sm font-medium text-app-text-secondary">{color}</span>
                  </div>
                  <span className="font-bold text-app-text-primary">{count}</span>
                </div>
                {colorAssemblyPotential[color] > 0 && (
                  <div className="mx-3 flex items-center gap-1.5 text-[10px] font-bold text-green-500 uppercase tracking-wider">
                    <CheckCircle2 className="w-3 h-3" />
                    {colorAssemblyPotential[color]} mogelijk samen te stellen
                  </div>
                )}
              </div>
            ))}
            {availableBuoys.length === 0 && (
              <div className="text-xs text-app-text-secondary italic px-3">Geen boeien beschikbaar</div>
            )}
          </div>
        </div>

        {/* Available Chains */}
        <div className="bg-app-surface rounded-2xl border border-app-border p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Share2 className="w-5 h-5 text-orange-500" />
            <h2 className="font-bold text-app-text-primary">Kettingen</h2>
          </div>
          <div className="space-y-2">
            {Object.entries(chainColorCounts).sort(([, a], [, b]) => b - a).map(([color, count]) => (
              <div key={color} className="flex flex-col gap-1">
                <div className="flex items-center justify-between bg-app-bg/50 rounded-xl px-3 py-2 border border-app-border/10">
                  <div className="flex items-center gap-2">
                    <ChainIcon color={color} size="sm" />
                    <span className="text-sm font-medium text-app-text-secondary">{color}</span>
                  </div>
                  <span className="font-bold text-app-text-primary">{count}</span>
                </div>
                <div className="mx-3 flex gap-3 text-[9px] font-bold text-app-text-secondary/60 uppercase tracking-wider">
                  <span className="flex items-center gap-1">↳ <span className="text-app-text-primary">{chainColorSwivelCounts[color]?.withSwivel || 0}</span> met draainagel</span>
                  <span className="flex items-center gap-1">↳ <span className="text-app-text-primary">{chainColorSwivelCounts[color]?.withoutSwivel || 0}</span> zonder</span>
                </div>
              </div>
            ))}
            {availableChains.length === 0 && (
              <div className="text-xs text-app-text-secondary italic px-3">Geen kettingen beschikbaar</div>
            )}
          </div>
        </div>

        {/* Available Lamps */}
        <div className="bg-app-surface rounded-2xl border border-app-border p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            <h2 className="font-bold text-app-text-primary">Lampen</h2>
          </div>
          <div className="space-y-2">
            {Object.entries(lampColorCounts).sort(([, a], [, b]) => b - a).map(([color, count]) => (
              <div key={color} className="flex items-center justify-between bg-app-bg/50 rounded-xl px-3 py-2 border border-app-border/10">
                <div className="flex items-center gap-2">
                  <div className={clsx(
                    "w-2.5 h-2.5 rounded-full",
                    color === 'Geel' ? 'bg-yellow-400' :
                      color === 'Groen' ? 'bg-green-500' :
                        color === 'Rood' ? 'bg-red-500' :
                          color === 'Wit' ? 'bg-white border border-gray-300' :
                            'bg-gray-400'
                  )} />
                  <span className="text-sm font-medium text-app-text-secondary">{color}</span>
                </div>
                <span className="font-bold text-app-text-primary">{count}</span>
              </div>
            ))}
            {availableLamps.length === 0 && (
              <div className="text-xs text-app-text-secondary italic px-3">Geen lampen beschikbaar</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Stones */}
        <div className="bg-app-surface rounded-2xl border border-app-border p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-5 h-5 text-gray-500" />
            <h2 className="font-bold text-app-text-primary">Stenen</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(stoneWeightCounts)
              .sort(([keyA], [keyB]) => parseFloat(keyB.split('|')[0]) - parseFloat(keyA.split('|')[0]))
              .map(([key, count]) => {
                const [weight, shape] = key.split('|');
                return (
                  <div key={key} className="flex items-center justify-between bg-app-bg/50 rounded-xl px-3 py-2 border border-app-border/10">
                    <div className="flex items-center gap-2">
                      <StoneIcon shape={shape as any} size="sm" />
                      <span className="text-sm font-medium text-app-text-secondary">{weight} ton {shape}</span>
                    </div>
                    <span className="font-bold text-app-text-primary">{count}</span>
                  </div>
                );
              })}
            {availableStones.length === 0 && (
              <div className="text-xs text-app-text-secondary italic px-3 col-span-2">Geen stenen beschikbaar</div>
            )}
          </div>
        </div>

        {/* Small Items Combined */}
        <div className="bg-app-surface rounded-2xl border border-app-border p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Tag className="w-5 h-5 text-purple-500" />
            <h2 className="font-bold text-app-text-primary">Kleine Onderdelen</h2>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-app-text-secondary/40 uppercase tracking-widest pl-1">Sluitingen</p>
              <div className="space-y-1.5">
                {Object.entries(availableShackles.reduce((acc: any, curr: any) => {
                  acc[curr.name] = (acc[curr.name] || 0) + 1;
                  return acc;
                }, {})).sort(([, a]: any, [, b]: any) => b - a).map(([name, count]: any) => (
                  <div key={name} className="flex items-center justify-between text-xs px-2 py-1 rounded-lg hover:bg-app-bg/50 transition-colors">
                    <span className="text-app-text-secondary">{name}</span>
                    <span className="font-black text-app-text-primary">{count}</span>
                  </div>
                ))}
                {availableShackles.length === 0 && <div className="text-[10px] text-app-text-secondary/50 italic pl-1">Geen sluitingen</div>}
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-app-text-secondary/40 uppercase tracking-widest pl-1">Zink & Top</p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <p className="text-[9px] font-bold text-blue-500/60 uppercase pl-1">Zinkblokken</p>
                  {Object.entries(availableZinc.reduce((acc: any, curr: any) => {
                    acc[curr.name] = (acc[curr.name] || 0) + 1;
                    return acc;
                  }, {})).map(([name, count]: any) => (
                    <div key={name} className="flex items-center justify-between text-xs px-2">
                      <span className="text-app-text-secondary">{name}</span>
                      <span className="font-black text-app-text-primary">{count}</span>
                    </div>
                  ))}
                  {availableZinc.length === 0 && <div className="text-[10px] text-app-text-secondary/50 italic pl-1">Geen zinkblokken</div>}
                </div>
                <div className="space-y-1.5 pt-2 border-t border-app-border/10">
                  <p className="text-[9px] font-bold text-yellow-500/60 uppercase pl-1">Toptekens</p>
                  {Object.entries(availableTopmarks.reduce((acc: any, curr: any) => {
                    acc[curr.name] = (acc[curr.name] || 0) + 1;
                    return acc;
                  }, {})).map(([name, count]: any) => (
                    <div key={name} className="flex items-center justify-between text-xs px-2">
                      <span className="text-app-text-secondary">{name}</span>
                      <span className="font-black text-app-text-primary">{count}</span>
                    </div>
                  ))}
                  {availableTopmarks.length === 0 && <div className="text-[10px] text-app-text-secondary/50 italic pl-1">Geen toptekens</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
