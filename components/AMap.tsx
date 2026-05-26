"use client";

import { useEffect, useRef } from "react";
import { loadAMap } from "@/lib/amap-client";

export type MarkerPoint = {
  id: string;
  name: string;
  lng: number;
  lat: number;
  avgPrice: number | null;
  visitCount: number;
};

type Props = {
  center?: [number, number];
  zoom?: number;
  points: MarkerPoint[];
  onBoundsChange?: (bbox: [number, number, number, number]) => void;
  onMarkerClick?: (point: MarkerPoint) => void;
};

function colorForPrice(price: number | null): string {
  if (price == null) return "#9ca3af"; // gray
  // 元/㎡
  if (price < 50000) return "#22c55e"; // green
  if (price < 80000) return "#3b82f6"; // blue
  if (price < 120000) return "#f97316"; // orange
  return "#ef4444"; // red
}

export default function AMap({
  center = [121.4737, 31.2304], // 上海人民广场
  zoom = 12,
  points,
  onBoundsChange,
  onMarkerClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<AMap.Map | null>(null);
  const clusterRef = useRef<AMap.MarkerCluster | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadAMap()
      .then((AMap) => {
        if (cancelled || !containerRef.current) return;
        const map = new AMap.Map(containerRef.current, {
          center,
          zoom,
          viewMode: "2D",
        });
        mapRef.current = map;
        map.on("moveend", () => {
          if (!onBoundsChange) return;
          const b = map.getBounds();
          const sw = b.getSouthWest();
          const ne = b.getNorthEast();
          onBoundsChange([sw.getLng(), sw.getLat(), ne.getLng(), ne.getLat()]);
        });
        if (onBoundsChange) {
          const b = map.getBounds();
          const sw = b.getSouthWest();
          const ne = b.getNorthEast();
          onBoundsChange([sw.getLng(), sw.getLat(), ne.getLng(), ne.getLat()]);
        }
      })
      .catch((err) => {
        console.error("AMap load failed", err);
      });

    return () => {
      cancelled = true;
      mapRef.current?.destroy();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    loadAMap().then((AMap) => {
      clusterRef.current?.setMap(null);
      const data = points.map((p) => ({
        lnglat: [p.lng, p.lat] as [number, number],
        ...p,
      }));

      const cluster = new AMap.MarkerCluster(map, data, {
        gridSize: 60,
        renderClusterMarker: (ctx: {
          count: number;
          marker: AMap.Marker;
        }) => {
          const size = Math.max(40, Math.min(80, 30 + ctx.count));
          const div = document.createElement("div");
          div.style.cssText = `width:${size}px;height:${size}px;line-height:${size}px;border-radius:50%;background:rgba(59,130,246,0.85);color:#fff;text-align:center;font-weight:600;border:2px solid #fff;`;
          div.innerText = String(ctx.count);
          ctx.marker.setContent(div);
          ctx.marker.setOffset(new AMap.Pixel(-size / 2, -size / 2));
        },
        renderMarker: (ctx: {
          data: Array<MarkerPoint & { lnglat: [number, number] }>;
          marker: AMap.Marker;
        }) => {
          const d = ctx.data[0];
          const color = colorForPrice(d.avgPrice);
          const visited = d.visitCount > 0;
          const div = document.createElement("div");
          div.style.cssText = `width:16px;height:16px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.3);cursor:pointer;position:relative;`;
          if (visited) {
            const star = document.createElement("div");
            star.innerText = "★";
            star.style.cssText =
              "position:absolute;top:-10px;right:-8px;color:#facc15;font-size:14px;text-shadow:0 0 2px #000;";
            div.appendChild(star);
          }
          ctx.marker.setContent(div);
          ctx.marker.setOffset(new AMap.Pixel(-8, -8));
          ctx.marker.on("click", () => onMarkerClick?.(d));
        },
      });
      clusterRef.current = cluster;
    });
  }, [points, onMarkerClick]);

  return <div ref={containerRef} className="w-full h-full" />;
}
