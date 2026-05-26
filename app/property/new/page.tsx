"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SH_DISTRICTS } from "@/lib/districts";

export default function NewPropertyPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    district: "",
    lng: "",
    lat: "",
    address: "",
    type: "NEW" as "NEW" | "SECONDHAND" | "BOTH",
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.lng || !form.lat) return;
    setSaving(true);
    try {
      // create via PATCH on a synthetic id is awkward; we POST via a thin endpoint instead
      const res = await fetch("/api/properties/manual", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          lng: parseFloat(form.lng),
          lat: parseFloat(form.lat),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const p = await res.json();
      router.push(`/property/${p.id}/edit`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-xl mx-auto p-6 w-full space-y-4">
      <h1 className="text-2xl font-bold">新增楼盘（手动）</h1>
      <p className="text-sm text-neutral-500">
        如果高德 POI 和官网都没有这个楼盘，可以手动加。位置可以在地图上找到后填经纬度。
      </p>

      <label className="block">
        <span className="block text-sm font-medium mb-1">名称</span>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full border rounded px-2 py-1"
          required
        />
      </label>

      <label className="block">
        <span className="block text-sm font-medium mb-1">行政区</span>
        <select
          value={form.district}
          onChange={(e) => setForm({ ...form, district: e.target.value })}
          className="border rounded px-2 py-1"
          required
        >
          <option value="">选择…</option>
          {SH_DISTRICTS.map((d) => (
            <option key={d.code} value={d.cn}>
              {d.cn}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-sm font-medium mb-1">经度</span>
          <input
            type="number"
            step="0.000001"
            value={form.lng}
            onChange={(e) => setForm({ ...form, lng: e.target.value })}
            className="w-full border rounded px-2 py-1"
            required
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium mb-1">纬度</span>
          <input
            type="number"
            step="0.000001"
            value={form.lat}
            onChange={(e) => setForm({ ...form, lat: e.target.value })}
            className="w-full border rounded px-2 py-1"
            required
          />
        </label>
      </div>

      <label className="block">
        <span className="block text-sm font-medium mb-1">地址</span>
        <input
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          className="w-full border rounded px-2 py-1"
        />
      </label>

      <label className="block">
        <span className="block text-sm font-medium mb-1">类型</span>
        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value as "NEW" | "SECONDHAND" | "BOTH" })}
          className="border rounded px-2 py-1"
        >
          <option value="NEW">新房</option>
          <option value="SECONDHAND">二手房</option>
          <option value="BOTH">两者皆有</option>
        </select>
      </label>

      <button
        type="submit"
        disabled={saving}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "保存中…" : "创建"}
      </button>
    </form>
  );
}
