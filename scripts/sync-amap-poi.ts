/**
 * Sync Shanghai residential POIs from AMap Web Service API into the Property table.
 *
 * Usage:
 *   npm run sync:amap                    # all districts
 *   npm run sync:amap -- --district pudong
 *
 * Requires AMAP_WEB_SERVICE_KEY in .env.
 */
import { prisma } from "./lib/db";
import { SH_DISTRICTS, findDistrict } from "../lib/districts";

const AMAP_KEY = process.env.AMAP_WEB_SERVICE_KEY;
const POI_TYPES = "120300|120302"; // 住宅小区 | 别墅

type AMapPoi = {
  id: string;
  name: string;
  type: string;
  typecode: string;
  address?: string;
  location?: string; // "lng,lat"
  tel?: string;
  adname?: string;
  pname?: string;
  cityname?: string;
};

async function fetchPage(adcode: string, page: number, pageSize = 25) {
  const url = new URL("https://restapi.amap.com/v5/place/text");
  url.searchParams.set("key", AMAP_KEY!);
  url.searchParams.set("types", POI_TYPES);
  url.searchParams.set("region", adcode);
  url.searchParams.set("city_limit", "true");
  url.searchParams.set("page_size", String(pageSize));
  url.searchParams.set("page_num", String(page));
  url.searchParams.set("show_fields", "business");

  const res = await fetch(url);
  if (!res.ok) throw new Error(`AMap HTTP ${res.status}`);
  const data = (await res.json()) as { status: string; info: string; pois?: AMapPoi[] };
  if (data.status !== "1") {
    throw new Error(`AMap API error: ${data.info}`);
  }
  return data.pois ?? [];
}

async function syncDistrict(district: (typeof SH_DISTRICTS)[number]) {
  console.log(`[${district.cn}] start syncing (adcode=${district.adcode})...`);
  let page = 1;
  let total = 0;

  while (true) {
    const pois = await fetchPage(district.adcode, page);
    if (pois.length === 0) break;

    for (const poi of pois) {
      const loc = poi.location?.split(",");
      if (!loc || loc.length !== 2) continue;
      const lng = parseFloat(loc[0]);
      const lat = parseFloat(loc[1]);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;

      await prisma.property.upsert({
        where: { source_sourceId: { source: "AMAP", sourceId: poi.id } },
        create: {
          source: "AMAP",
          sourceId: poi.id,
          name: poi.name,
          type: "BOTH",
          address: poi.address,
          district: poi.adname ?? district.cn,
          lng,
          lat,
          phone: poi.tel,
        },
        update: {
          name: poi.name,
          address: poi.address,
          district: poi.adname ?? district.cn,
          lng,
          lat,
          phone: poi.tel,
        },
      });
      total += 1;
    }

    console.log(`[${district.cn}] page ${page}: +${pois.length} (cumulative ${total})`);
    if (pois.length < 25) break;
    page += 1;
    // AMap free tier: be polite
    await sleep(500);
    // AMap text search caps at 100 pages
    if (page > 100) break;
  }

  console.log(`[${district.cn}] done. total upserted: ${total}`);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  if (!AMAP_KEY) {
    console.error("AMAP_WEB_SERVICE_KEY is not set in .env");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const distArgIdx = args.indexOf("--district");
  const targets =
    distArgIdx >= 0 && args[distArgIdx + 1]
      ? (() => {
          const d = findDistrict(args[distArgIdx + 1]);
          if (!d) throw new Error(`Unknown district: ${args[distArgIdx + 1]}`);
          return [d];
        })()
      : SH_DISTRICTS;

  for (const d of targets) {
    await syncDistrict(d);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
