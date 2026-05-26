import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      batches: { orderBy: { openDate: "desc" } },
      houseTypes: true,
      visits: {
        orderBy: { visitedAt: "desc" },
        include: { photos: true },
      },
      tags: { include: { tag: true } },
    },
  });
  if (!property) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(property);
}

const patchSchema = z.object({
  name: z.string().optional(),
  type: z.enum(["NEW", "SECONDHAND", "BOTH"]).optional(),
  developer: z.string().nullable().optional(),
  propertyCompany: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  district: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  yearBuilt: z.number().int().nullable().optional(),
  plotRatio: z.number().nullable().optional(),
  greenRatio: z.number().nullable().optional(),
  deliveryDate: z.string().nullable().optional(),
  lianjiaUrl: z.string().nullable().optional(),
  manualUnitPrice: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.parse(body);

  const data: Record<string, unknown> = { ...parsed };
  if (parsed.deliveryDate) data.deliveryDate = new Date(parsed.deliveryDate);
  if (parsed.manualUnitPrice != null) data.manualPriceUpdatedAt = new Date();

  const property = await prisma.property.update({ where: { id }, data });
  return NextResponse.json(property);
}
