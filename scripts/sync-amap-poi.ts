/**
 * Sync Shanghai residential POIs from AMap Web Service API into the Property table.
 *
 * Usage:
 *   npm run sync:amap                    # all districts
 *   npm run sync:amap -- --district pudong
 *
 * Requires AMAP_WEB_SERVICE_KEY in .env.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { SH_DISTRICTS, findDistrict } from "../lib/districts";
import { normalizeSupabaseUrl } from "../lib/supabase";

config();

const AMAP_KEY = process.env.AMAP_WEB_SERVICE_KEY;
const SUPABASE_URL = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      })
    : null;
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

type PropertyRow = {
  id: string;
  source: "AMAP";
  sourceId: string;
  name: string;
  type: "BOTH";
  address: string | null;
  district: string;
  lng: number;
  lat: number;
  phone: string | null;
  updatedAt: string;
};

// cuid-like id (collision-resistant enough for our scale); matches Prisma's @default(cuid()) column type
function genId() {
  return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

async function syncDistrict(district: (typeof SH_DISTRICTS)[number]) {
  console.log(`[${district.cn}] start syncing (adcode=${district.adcode})...`);
  let page = 1;
  let total = 0;

  while (true) {
    const pois = await fetchPage(district.adcode, page);
    if (pois.length === 0) break;

    const rows: PropertyRow[] = [];
    for (const poi of pois) {
      const loc = poi.location?.split(",");
      if (!loc || loc.length !== 2) continue;
      const lng = parseFloat(loc[0]);
      const lat = parseFloat(loc[1]);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;

      rows.push({
        id: genId(),
        source: "AMAP",
        sourceId: poi.id,
        name: poi.name,
        type: "BOTH",
        address: poi.address ?? null,
        district: poi.adname ?? district.cn,
        lng,
        lat,
        phone: poi.tel ?? null,
        updatedAt: new Date().toISOString(),
      });
    }

    if (rows.length > 0) {
      const { error } = await supabase!
        .from("properties")
        .upsert(rows, { onConflict: "source,sourceId", ignoreDuplicates: false });
      if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
      total += rows.length;
    }

    console.log(`[${district.cn}] page ${page}: +${rows.length} (cumulative ${total})`);
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
  if (!supabase) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env");
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
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
