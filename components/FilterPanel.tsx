"use client";

import { SH_DISTRICTS } from "@/lib/districts";

export type Filters = {
  type: "NEW" | "SECONDHAND" | "ALL";
  district: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  visitedOnly: boolean;
};

export const defaultFilters: Filters = {
  type: "ALL",
  district: null,
  minPrice: null,
  maxPrice: null,
  visitedOnly: false,
};

type Props = {
  value: Filters;
  onChange: (next: Filters) => void;
};

export default function FilterPanel({ value, onChange }: Props) {
  return (
    <div className="p-4 space-y-4 w-72 border-r bg-white overflow-y-auto">
      <div>
        <label className="block text-sm font-medium mb-1">类型</label>
        <div className="flex gap-2">
          {(["ALL", "NEW", "SECONDHAND"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange({ ...value, type: t })}
              className={`flex-1 text-sm px-2 py-1 rounded border ${
                value.type === t ? "bg-blue-600 text-white border-blue-600" : "bg-white"
              }`}
            >
              {t === "ALL" ? "全部" : t === "NEW" ? "新房" : "二手房"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">行政区</label>
        <select
          value={value.district ?? ""}
          onChange={(e) => onChange({ ...value, district: e.target.value || null })}
          className="w-full border rounded px-2 py-1 text-sm"
        >
          <option value="">全部区</option>
          {SH_DISTRICTS.map((d) => (
            <option key={d.code} value={d.cn}>
              {d.cn}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">单价区间（元/㎡）</label>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            placeholder="最低"
            value={value.minPrice ?? ""}
            onChange={(e) =>
              onChange({ ...value, minPrice: e.target.value ? Number(e.target.value) : null })
            }
            className="w-full border rounded px-2 py-1 text-sm"
          />
          <span>-</span>
          <input
            type="number"
            placeholder="最高"
            value={value.maxPrice ?? ""}
            onChange={(e) =>
              onChange({ ...value, maxPrice: e.target.value ? Number(e.target.value) : null })
            }
            className="w-full border rounded px-2 py-1 text-sm"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.visitedOnly}
          onChange={(e) => onChange({ ...value, visitedOnly: e.target.checked })}
        />
        只看已写过看楼记录的
      </label>

      <div className="text-xs text-neutral-500 leading-relaxed pt-2 border-t">
        <p className="mb-1 font-medium">marker 颜色：</p>
        <p>🟢 &lt;5万 / 🔵 5-8万 / 🟠 8-12万 / 🔴 &gt;12万 / ⚪ 价格未知</p>
        <p className="mt-1">⭐ 表示已写过看楼记录</p>
      </div>
    </div>
  );
}
