import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type PropertyRow = {
  id: string;
  name: string;
  type: "NEW" | "SECONDHAND" | "BOTH";
  district: string | null;
  lng: number;
  lat: number;
  manualUnitPrice: number | null;
  new_house_batches: { avgPrice: number | null; recordedAt: string }[] | null;
  visits: { id: string }[] | null;
};

export async function GET(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const bbox = searchParams.get("bbox"); // "minLng,minLat,maxLng,maxLat"
  const district = searchParams.get("district");
  const type = searchParams.get("type");
  const minPrice = numParam(searchParams.get("minPrice"));
  const maxPrice = numParam(searchParams.get("maxPrice"));
  const onlyVisited = searchParams.get("visited") === "1";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "2000", 10), 5000);

  // Paginate around Supabase's 1000-row per-request cap.
  const PAGE_SIZE = 1000;
  const rows: PropertyRow[] = [];
  for (let offset = 0; offset < limit; offset += PAGE_SIZE) {
    const end = Math.min(offset + PAGE_SIZE, limit) - 1;
    let q = supabaseAdmin
      .from("properties")
      .select(
        "id,name,type,district,lng,lat,manualUnitPrice,new_house_batches(avgPrice,recordedAt),visits(id)"
      )
      .range(offset, end);

    if (bbox) {
      const [minLng, minLat, maxLng, maxLat] = bbox.split(",").map(Number);
      if ([minLng, minLat, maxLng, maxLat].every(Number.isFinite)) {
        q = q.gte("lng", minLng).lte("lng", maxLng).gte("lat", minLat).lte("lat", maxLat);
      }
    }
    if (district) q = q.eq("district", district);
    if (type) q = q.eq("type", type);

    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const batch = (data as PropertyRow[]) ?? [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }

  const result = rows
    .map((p) => {
      const latestBatch = p.new_house_batches?.sort((a, b) =>
        (b.recordedAt ?? "").localeCompare(a.recordedAt ?? "")
      )[0];
      const avgPrice = latestBatch?.avgPrice ?? p.manualUnitPrice ?? null;
      return {
        id: p.id,
        name: p.name,
        type: p.type,
        district: p.district,
        lng: p.lng,
        lat: p.lat,
        avgPrice,
        visitCount: p.visits?.length ?? 0,
      };
    })
    .filter((r) => {
      if (onlyVisited && r.visitCount === 0) return false;
      if (minPrice != null && (r.avgPrice == null || r.avgPrice < minPrice)) return false;
      if (maxPrice != null && (r.avgPrice == null || r.avgPrice > maxPrice)) return false;
      return true;
    });

  return NextResponse.json({ properties: result });
}

function numParam(v: string | null) {
  if (v == null || v === "") return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}
