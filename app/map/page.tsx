"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import FilterPanel, { defaultFilters, type Filters } from "@/components/FilterPanel";
import PropertyCard from "@/components/PropertyCard";
import type { MarkerPoint } from "@/components/AMap";

const AMap = dynamic(() => import("@/components/AMap"), { ssr: false });

export default function MapPage() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [points, setPoints] = useState<MarkerPoint[]>([]);
  const [selected, setSelected] = useState<MarkerPoint | null>(null);
  const [bbox, setBbox] = useState<[number, number, number, number] | null>(null);
  const [loading, setLoading] = useState(false);
  const [missingKey, setMissingKey] = useState(false);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_AMAP_KEY) setMissingKey(true);
  }, []);

  const fetchPoints = useCallback(async () => {
    if (!bbox) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("bbox", bbox.join(","));
      if (filters.type !== "ALL") params.set("type", filters.type);
      if (filters.district) params.set("district", filters.district);
      if (filters.minPrice != null) params.set("minPrice", String(filters.minPrice));
      if (filters.maxPrice != null) params.set("maxPrice", String(filters.maxPrice));
      if (filters.visitedOnly) params.set("visited", "1");

      const res = await fetch(`/api/properties?${params}`);
      const data = (await res.json()) as { properties: MarkerPoint[] };
      setPoints(data.properties);
    } finally {
      setLoading(false);
    }
  }, [bbox, filters]);

  useEffect(() => {
    fetchPoints();
  }, [fetchPoints]);

  return (
    <div className="flex flex-1 min-h-0">
      <FilterPanel value={filters} onChange={setFilters} />
      <div className="relative flex-1">
        {missingKey ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-500 bg-neutral-100">
            <div className="max-w-md p-6 bg-white border rounded shadow-sm">
              <h3 className="font-semibold mb-2">未配置高德 API key</h3>
              <p className="leading-relaxed text-neutral-600">
                请在 <code>.env.local</code> 设置 <code>NEXT_PUBLIC_AMAP_KEY</code>，参考 <code>.env.example</code>。
              </p>
            </div>
          </div>
        ) : (
          <AMap points={points} onBoundsChange={setBbox} onMarkerClick={setSelected} />
        )}
        {loading && (
          <div className="absolute top-4 left-4 bg-white border px-3 py-1 rounded shadow text-xs z-10">
            加载中… ({points.length} 个楼盘)
          </div>
        )}
        {selected && <PropertyCard point={selected} onClose={() => setSelected(null)} />}
      </div>
    </div>
  );
}
