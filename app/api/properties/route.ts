import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma, PropertyType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const bbox = searchParams.get("bbox"); // "minLng,minLat,maxLng,maxLat"
  const district = searchParams.get("district");
  const type = searchParams.get("type") as PropertyType | null;
  const minPrice = numParam(searchParams.get("minPrice"));
  const maxPrice = numParam(searchParams.get("maxPrice"));
  const onlyVisited = searchParams.get("visited") === "1";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "2000", 10), 5000);

  const where: Prisma.PropertyWhereInput = {};

  if (bbox) {
    const [minLng, minLat, maxLng, maxLat] = bbox.split(",").map(Number);
    if ([minLng, minLat, maxLng, maxLat].every(Number.isFinite)) {
      where.lng = { gte: minLng, lte: maxLng };
      where.lat = { gte: minLat, lte: maxLat };
    }
  }
  if (district) where.district = district;
  if (type) where.type = type;
  if (onlyVisited) where.visits = { some: {} };

  // Price filter: union of fangdi avg batch price and manual unit price
  if (minPrice != null || maxPrice != null) {
    const priceConds: Prisma.PropertyWhereInput[] = [];
    const range: Prisma.FloatNullableFilter = {};
    if (minPrice != null) range.gte = minPrice;
    if (maxPrice != null) range.lte = maxPrice;
    priceConds.push({ manualUnitPrice: range });
    priceConds.push({ batches: { some: { avgPrice: range } } });
    where.OR = priceConds;
  }

  const props = await prisma.property.findMany({
    where,
    take: limit,
    select: {
      id: true,
      name: true,
      type: true,
      district: true,
      lng: true,
      lat: true,
      manualUnitPrice: true,
      _count: { select: { visits: true } },
      batches: {
        orderBy: { recordedAt: "desc" },
        take: 1,
        select: { avgPrice: true },
      },
    },
  });

  const result = props.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    district: p.district,
    lng: p.lng,
    lat: p.lat,
    avgPrice: p.batches[0]?.avgPrice ?? p.manualUnitPrice ?? null,
    visitCount: p._count.visits,
  }));

  return NextResponse.json({ properties: result });
}

function numParam(v: string | null) {
  if (v == null || v === "") return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}
