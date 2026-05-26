import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  const visits = await prisma.visit.findMany({
    orderBy: { visitedAt: "desc" },
    include: {
      property: { select: { id: true, name: true, district: true } },
      photos: true,
    },
  });
  return NextResponse.json({ visits });
}

const createSchema = z.object({
  propertyId: z.string(),
  visitedAt: z.string(),
  overallRating: z.number().int().min(1).max(5).optional(),
  locationRating: z.number().int().min(1).max(5).optional(),
  layoutRating: z.number().int().min(1).max(5).optional(),
  priceRating: z.number().int().min(1).max(5).optional(),
  propertyMgmtRating: z.number().int().min(1).max(5).optional(),
  salesAttitudeRating: z.number().int().min(1).max(5).optional(),
  notes: z.string().optional(),
  photoUrls: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createSchema.parse(body);

  const visit = await prisma.visit.create({
    data: {
      propertyId: parsed.propertyId,
      visitedAt: new Date(parsed.visitedAt),
      overallRating: parsed.overallRating,
      locationRating: parsed.locationRating,
      layoutRating: parsed.layoutRating,
      priceRating: parsed.priceRating,
      propertyMgmtRating: parsed.propertyMgmtRating,
      salesAttitudeRating: parsed.salesAttitudeRating,
      notes: parsed.notes,
      photos: parsed.photoUrls?.length
        ? { create: parsed.photoUrls.map((url) => ({ url })) }
        : undefined,
    },
    include: { photos: true },
  });

  return NextResponse.json(visit, { status: 201 });
}
