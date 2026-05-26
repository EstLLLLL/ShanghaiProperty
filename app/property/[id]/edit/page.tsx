"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";

type Form = {
  name: string;
  type: "NEW" | "SECONDHAND" | "BOTH";
  developer: string;
  propertyCompany: string;
  address: string;
  district: string;
  phone: string;
  yearBuilt: string;
  plotRatio: string;
  greenRatio: string;
  deliveryDate: string;
  lianjiaUrl: string;
  manualUnitPrice: string;
  notes: string;
};

const EMPTY: Form = {
  name: "",
  type: "BOTH",
  developer: "",
  propertyCompany: "",
  address: "",
  district: "",
  phone: "",
  yearBuilt: "",
  plotRatio: "",
  greenRatio: "",
  deliveryDate: "",
  lianjiaUrl: "",
  manualUnitPrice: "",
  notes: "",
};

export default function EditProperty({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/properties/${id}`)
      .then((r) => r.json())
      .then((p) =>
        setForm({
          name: p.name ?? "",
          type: p.type ?? "BOTH",
          developer: p.developer ?? "",
          propertyCompany: p.propertyCompany ?? "",
          address: p.address ?? "",
          district: p.district ?? "",
          phone: p.phone ?? "",
          yearBuilt: p.yearBuilt?.toString() ?? "",
          plotRatio: p.plotRatio?.toString() ?? "",
          greenRatio: p.greenRatio?.toString() ?? "",
          deliveryDate: p.deliveryDate ? p.deliveryDate.slice(0, 10) : "",
          lianjiaUrl: p.lianjiaUrl ?? "",
          manualUnitPrice: p.manualUnitPrice?.toString() ?? "",
          notes: p.notes ?? "",
        })
      );
  }, [id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        name: form.name,
        type: form.type,
        developer: form.developer || null,
        propertyCompany: form.propertyCompany || null,
        address: form.address || null,
        district: form.district || null,
        phone: form.phone || null,
        yearBuilt: form.yearBuilt ? parseInt(form.yearBuilt) : null,
        plotRatio: form.plotRatio ? parseFloat(form.plotRatio) : null,
        greenRatio: form.greenRatio ? parseFloat(form.greenRatio) : null,
        deliveryDate: form.deliveryDate || null,
        lianjiaUrl: form.lianjiaUrl || null,
        manualUnitPrice: form.manualUnitPrice ? parseFloat(form.manualUnitPrice) : null,
        notes: form.notes || null,
      };
      const res = await fetch(`/api/properties/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push(`/property/${id}`);
    } finally {
      setSaving(false);
    }
  }

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm({ ...form, [k]: v });

  return (
    <form onSubmit={save} className="max-w-3xl mx-auto p-6 w-full space-y-4">
      <h1 className="text-2xl font-bold">编辑楼盘</h1>

      <Field label="名称">
        <input
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          className="w-full border rounded px-2 py-1"
          required
        />
      </Field>

      <Field label="类型">
        <select
          value={form.type}
          onChange={(e) => set("type", e.target.value as Form["type"])}
          className="border rounded px-2 py-1"
        >
          <option value="NEW">新房</option>
          <option value="SECONDHAND">二手房</option>
          <option value="BOTH">两者皆有</option>
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="开发商">
          <input
            value={form.developer}
            onChange={(e) => set("developer", e.target.value)}
            className="w-full border rounded px-2 py-1"
          />
        </Field>
        <Field label="物业公司">
          <input
            value={form.propertyCompany}
            onChange={(e) => set("propertyCompany", e.target.value)}
            className="w-full border rounded px-2 py-1"
          />
        </Field>
        <Field label="区">
          <input
            value={form.district}
            onChange={(e) => set("district", e.target.value)}
            className="w-full border rounded px-2 py-1"
          />
        </Field>
        <Field label="电话">
          <input
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            className="w-full border rounded px-2 py-1"
          />
        </Field>
        <Field label="建成年代">
          <input
            type="number"
            value={form.yearBuilt}
            onChange={(e) => set("yearBuilt", e.target.value)}
            className="w-full border rounded px-2 py-1"
          />
        </Field>
        <Field label="交付时间">
          <input
            type="date"
            value={form.deliveryDate}
            onChange={(e) => set("deliveryDate", e.target.value)}
            className="w-full border rounded px-2 py-1"
          />
        </Field>
        <Field label="容积率">
          <input
            type="number"
            step="0.01"
            value={form.plotRatio}
            onChange={(e) => set("plotRatio", e.target.value)}
            className="w-full border rounded px-2 py-1"
          />
        </Field>
        <Field label="绿化率 (%)">
          <input
            type="number"
            step="0.1"
            value={form.greenRatio}
            onChange={(e) => set("greenRatio", e.target.value)}
            className="w-full border rounded px-2 py-1"
          />
        </Field>
        <Field label="手动录入单价 (元/㎡)">
          <input
            type="number"
            value={form.manualUnitPrice}
            onChange={(e) => set("manualUnitPrice", e.target.value)}
            className="w-full border rounded px-2 py-1"
          />
        </Field>
        <Field label="链家 URL">
          <input
            value={form.lianjiaUrl}
            onChange={(e) => set("lianjiaUrl", e.target.value)}
            className="w-full border rounded px-2 py-1"
            placeholder="留空使用默认搜索链接"
          />
        </Field>
      </div>

      <Field label="地址">
        <input
          value={form.address}
          onChange={(e) => set("address", e.target.value)}
          className="w-full border rounded px-2 py-1"
        />
      </Field>

      <Field label="备注">
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={4}
          className="w-full border rounded px-2 py-1"
        />
      </Field>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "保存中…" : "保存"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="border px-4 py-2 rounded"
        >
          取消
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1">{label}</span>
      {children}
    </label>
  );
}
