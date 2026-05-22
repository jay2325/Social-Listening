import { useBrandContext } from "../../contexts/BrandContext";
import { useBrands } from "../../hooks/useBrands";
import { useRealtimeMentionCount } from "../../hooks/useRealtimeMentionCount";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

export function Header() {
  const { brandId, setBrandId } = useBrandContext();
  const { data: brands = [] } = useBrands();
  const liveCount = useRealtimeMentionCount(brandId);

  return (
    <header className="h-14 flex-shrink-0 border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-between px-6">
      {/* Brand switcher */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] text-zinc-600 font-medium uppercase tracking-widest hidden sm:block">
          Brand
        </span>
        <Select value={brandId ?? ""} onValueChange={setBrandId}>
          <SelectTrigger className="w-44 h-8 text-sm bg-zinc-800 border-zinc-700">
            <SelectValue placeholder="Select a brand…" />
          </SelectTrigger>
          <SelectContent>
            {brands.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                <span className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: b.color }}
                  />
                  {b.name}
                </span>
              </SelectItem>
            ))}
            {brands.length === 0 && (
              <div className="px-3 py-2 text-xs text-zinc-600">
                No brands yet — POST /brands
              </div>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Live mention counter */}
      {liveCount > 0 && (
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
          </span>
          <span className="text-xs text-zinc-400 tabular-nums">
            +{liveCount.toLocaleString()} live
          </span>
        </div>
      )}
    </header>
  );
}
