import { prisma } from "./db";

const NOISE_SUFFIXES = [
  "花园", "苑", "广场", "公寓", "府", "城", "里", "庭", "园", "邸",
  "国际", "中心", "(一期)", "(二期)", "(三期)", "(四期)", "一期", "二期", "三期", "四期",
];

export function normalizeName(name: string): string {
  let n = name.replace(/\s+/g, "").trim();
  for (const s of NOISE_SUFFIXES) {
    if (n.endsWith(s)) n = n.slice(0, -s.length);
  }
  return n;
}

export async function findOrCreatePropertyByName(args: {
  name: string;
  district?: string;
  fallbackLng?: number;
  fallbackLat?: number;
  fallbackSource: "FANGDI" | "MANUAL";
  fallbackSourceId: string;
}) {
  const normalized = normalizeName(args.name);

  const candidates = await prisma.property.findMany({
    where: args.district ? { district: args.district } : undefined,
    select: { id: true, name: true },
  });

  const hit = candidates.find((p) => normalizeName(p.name) === normalized);
  if (hit) return prisma.property.findUnique({ where: { id: hit.id } });

  if (args.fallbackLng == null || args.fallbackLat == null) return null;

  return prisma.property.upsert({
    where: {
      source_sourceId: { source: args.fallbackSource, sourceId: args.fallbackSourceId },
    },
    create: {
      source: args.fallbackSource,
      sourceId: args.fallbackSourceId,
      name: args.name,
      district: args.district,
      lng: args.fallbackLng,
      lat: args.fallbackLat,
      type: "NEW",
    },
    update: { name: args.name, district: args.district },
  });
}
