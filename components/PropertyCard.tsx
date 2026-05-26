"use client";

import Link from "next/link";
import type { MarkerPoint } from "./AMap";

type Props = {
  point: MarkerPoint;
  onClose: () => void;
};

export default function PropertyCard({ point, onClose }: Props) {
  return (
    <div className="absolute top-4 right-4 w-80 bg-white rounded-lg shadow-lg border p-4 z-10">
      <div className="flex justify-between items-start">
        <h3 className="font-semibold text-base">{point.name}</h3>
        <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 text-lg leading-none">
          ×
        </button>
      </div>
      <dl className="mt-3 text-sm space-y-1 text-neutral-700">
        <div className="flex justify-between">
          <dt className="text-neutral-500">单价</dt>
          <dd>{point.avgPrice ? `${Math.round(point.avgPrice).toLocaleString()} 元/㎡` : "—"}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-neutral-500">看楼次数</dt>
          <dd>{point.visitCount}</dd>
        </div>
      </dl>
      <Link
        href={`/property/${point.id}`}
        className="mt-4 block text-center bg-blue-600 text-white text-sm py-2 rounded hover:bg-blue-700"
      >
        查看详情 →
      </Link>
    </div>
  );
}
