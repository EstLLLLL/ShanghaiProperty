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
};

export async function GET(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const bbox = searchParams.get("bbox");
  const district = searchParams.get("district");
  const type = searchParams.get("type");
  const minPrice = numParam(searchParams.get("minPrice"));
  const maxPrice = numParam(searchParams.get("maxPrice"));
  const onlyVisited = searchParams.get("visited") === "1";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "2000", 10), 5000);

  // PostgREST caps each request at 1000 rows. Fire all page-windows in parallel.
  const PAGE_SIZE = 1000;
  const ranges: [number, number][] = [];
  for (let offset = 0; offset < limit; offset += PAGE_SIZE) {
    ranges.push([offset, Math.min(offset + PAGE_SIZE, limit) - 1]);
  }

  const buildQuery = (from: number, to: number) => {
    let q = supabaseAdmin!
      .from("properties")
      .select("id,name,type,district,lng,lat,manualUnitPrice")
      .range(from, to);
    if (bbox) {
      const [minLng, minLat, maxLng, maxLat] = bbox.split(",").map(Number);
      if ([minLng, minLat, maxLng, maxLat].every(Number.isFinite)) {
        q = q.gte("lng", minLng).lte("lng", maxLng).gte("lat", minLat).lte("lat", maxLat);
      }
    }
    if (district) q = q.eq("district", district);
    if (type) q = q.eq("type", type);
    return q;
  };

  const responses = await Promise.all(ranges.map(([f, t]) => buildQuery(f, t)));
  const rows: PropertyRow[] = [];
  for (const r of responses) {
    if (r.error) {
      return NextResponse.json({ error: r.error.message }, { status: 500 });
    }
    rows.push(...((r.data as PropertyRow[]) ?? []));
  }

  const result = rows
    .map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      district: p.district,
      lng: p.lng,
      lat: p.lat,
      avgPrice: p.manualUnitPrice ?? null,
      visitCount: 0,
    }))
    .filter((r) => {
      if (onlyVisited) return false;
      if (minPrice != null && (r.avgPrice == null || r.avgPrice < minPrice)) return false;
      if (maxPrice != null && (r.avgPrice == null || r.avgPrice > maxPrice)) return false;
      return true;
    });

  return NextResponse.json(
    { properties: result },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}

function numParam(v: string | null) {
  if (v == null || v === "") return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}
