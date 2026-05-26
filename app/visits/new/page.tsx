"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type PropertyOption = {
  id: string;
  name: string;
  district: string | null;
};

type RatingKey =
  | "overallRating"
  | "locationRating"
  | "layoutRating"
  | "priceRating"
  | "propertyMgmtRating"
  | "salesAttitudeRating";

const RATING_LABELS: Record<RatingKey, string> = {
  overallRating: "整体",
  locationRating: "地段",
  layoutRating: "户型",
  priceRating: "价格",
  propertyMgmtRating: "物业",
  salesAttitudeRating: "销售态度",
};

export default function NewVisitPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-neutral-500">加载中…</div>}>
      <NewVisitForm />
    </Suspense>
  );
}

function NewVisitForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const initialPropertyId = sp.get("propertyId");

  const [propertyId, setPropertyId] = useState<string | null>(initialPropertyId);
  const [propertyName, setPropertyName] = useState("");
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<PropertyOption[]>([]);
  const [visitedAt, setVisitedAt] = useState(new Date().toISOString().slice(0, 10));
  const [ratings, setRatings] = useState<Record<RatingKey, number | null>>({
    overallRating: null,
    locationRating: null,
    layoutRating: null,
    priceRating: null,
    propertyMgmtRating: null,
    salesAttitudeRating: null,
  });
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialPropertyId) {
      fetch(`/api/properties/${initialPropertyId}`)
        .then((r) => r.json())
        .then((p) => setPropertyName(p.name));
    }
  }, [initialPropertyId]);

  useEffect(() => {
    if (!search || propertyId) {
      setOptions([]);
      return;
    }
    const ctrl = new AbortController();
    fetch(`/api/properties?limit=20`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((data: { properties: PropertyOption[] }) => {
        const q = search.toLowerCase();
        setOptions(data.properties.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 20));
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [search, propertyId]);

  const overall = useMemo(() => {
    if (ratings.overallRating != null) return ratings.overallRating;
    const dims = (["locationRating", "layoutRating", "priceRating", "propertyMgmtRating", "salesAttitudeRating"] as const)
      .map((k) => ratings[k])
      .filter((v): v is number => v != null);
    if (dims.length === 0) return null;
    return Math.round(dims.reduce((a, b) => a + b, 0) / dims.length);
  }, [ratings]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!propertyId) {
      alert("请先选择楼盘");
      return;
    }
    setSaving(true);
    try {
      const photoUrls: string[] = [];
      for (const f of files) {
        const fd = new FormData();
        fd.append("file", f);
        const up = await fetch("/api/upload", { method: "POST", body: fd });
        if (up.ok) {
          const { url } = await up.json();
          photoUrls.push(url);
        }
      }

      const res = await fetch("/api/visits", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          propertyId,
          visitedAt,
          ...ratings,
          overallRating: overall,
          notes: notes || undefined,
          photoUrls,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const v = await res.json();
      router.push(`/visits/${v.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-2xl mx-auto p-6 w-full space-y-5">
      <h1 className="text-2xl font-bold">新增看楼记录</h1>

      <div>
        <label className="block text-sm font-medium mb-1">楼盘</label>
        {propertyId ? (
          <div className="flex items-center gap-2 border rounded px-3 py-2">
            <span className="flex-1">{propertyName || propertyId}</span>
            <button
              type="button"
              onClick={() => {
                setPropertyId(null);
                setPropertyName("");
              }}
              className="text-xs text-neutral-500 hover:text-red-600"
            >
              更换
            </button>
          </div>
        ) : (
          <>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索楼盘名称…"
              className="w-full border rounded px-2 py-1"
            />
            {options.length > 0 && (
              <ul className="border rounded mt-1 max-h-60 overflow-y-auto">
                {options.map((o) => (
                  <li
                    key={o.id}
                    onClick={() => {
                      setPropertyId(o.id);
                      setPropertyName(o.name);
                      setSearch("");
                      setOptions([]);
                    }}
                    className="px-3 py-2 hover:bg-neutral-50 cursor-pointer text-sm"
                  >
                    <div>{o.name}</div>
                    <div className="text-xs text-neutral-500">{o.district}</div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">看楼日期</label>
        <input
          type="date"
          value={visitedAt}
          onChange={(e) => setVisitedAt(e.target.value)}
          className="border rounded px-2 py-1"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">多维评分（1-5 星）</label>
        <div className="space-y-2">
          {(Object.keys(RATING_LABELS) as RatingKey[]).map((k) => (
            <div key={k} className="flex items-center gap-3">
              <span className="text-sm w-16">{RATING_LABELS[k]}</span>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  onClick={() =>
                    setRatings({ ...ratings, [k]: ratings[k] === n ? null : n })
                  }
                  className={`w-8 h-8 rounded ${
                    (ratings[k] ?? 0) >= n ? "text-amber-500" : "text-neutral-300"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          ))}
        </div>
        {ratings.overallRating == null && overall != null && (
          <p className="text-xs text-neutral-500 mt-1">
            整体评分将自动设为各维度均值：{overall} 星
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">反馈（支持 Markdown）</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={6}
          placeholder="位置、户型、销售态度、周边、价格感受……"
          className="w-full border rounded px-2 py-2 font-mono text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">照片</label>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className="text-sm"
        />
        {files.length > 0 && (
          <p className="text-xs text-neutral-500 mt-1">已选 {files.length} 张</p>
        )}
      </div>

      <button
        type="submit"
        disabled={saving || !propertyId}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "保存中…" : "保存"}
      </button>
    </form>
  );
}
