import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1),
  district: z.string().optional(),
  lng: z.number(),
  lat: z.number(),
  address: z.string().optional(),
  type: z.enum(["NEW", "SECONDHAND", "BOTH"]).default("NEW"),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.parse(body);
  const sourceId = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const property = await prisma.property.create({
    data: {
      source: "MANUAL",
      sourceId,
      name: parsed.name,
      district: parsed.district,
      lng: parsed.lng,
      lat: parsed.lat,
      address: parsed.address,
      type: parsed.type,
    },
  });
  return NextResponse.json(property, { status: 201 });
}
