/**
 * Crawl Shanghai 网上房地产 (fangdi.com.cn) for new house prices.
 *
 * Usage:
 *   npm run crawl:fangdi -- --district baoshan
 *   npm run crawl:fangdi -- --district-id 2385fa574f10a564
 *
 * Notes:
 *   - Run LOCALLY (uses Playwright headed Chromium). The cloud sandbox can't
 *     show a browser window and may be blocked by fangdi's WAF.
 *   - Run `npx playwright install chromium` once before first use.
 *   - Polite delay between detail-page hits (5-8s random).
 */
import { chromium, type Page } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { normalizeSupabaseUrl } from "../lib/supabase";

config();

const FANGDI_BASE = "https://www.fangdi.com.cn";

// districtID is a hash specific to fangdi. Populate as needed by visiting the
// site and selecting each district from the dropdown — the URL will show ?districtID=...
const DISTRICT_IDS: Record<string, string> = {
  baoshan: "2385fa574f10a564",
  // pudong: "...",      // TODO
  // minhang: "...",     // TODO
  // xuhui: "...",       // TODO
  // jingan: "...",      // TODO
  // huangpu: "...",     // TODO
  // changning: "...",   // TODO
  // putuo: "...",       // TODO
  // hongkou: "...",     // TODO
  // yangpu: "...",      // TODO
  // jiading: "...",     // TODO
  // jinshan: "...",     // TODO
  // songjiang: "...",   // TODO
  // qingpu: "...",      // TODO
  // fengxian: "...",    // TODO
  // chongming: "...",   // TODO
};

const SUPABASE_URL = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    : null;

type ListItem = {
  status: string;
  name: string;
  address: string;
  totalUnits: number | null;
  district: string;
  projectId: string;
};

type DetailData = {
  developer: string | null;
  presaleLicense: string | null;
  totalUnits: number | null;
  soldUnits: number | null;
  avgPrice: number | null; // 元/㎡, averaged across buildings
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function scrapeListPage(page: Page): Promise<ListItem[]> {
  // Wait for the table body to populate
  await page.waitForSelector("table tbody tr", { timeout: 15000 });
  return page.$$eval("table tbody tr", (trs) =>
    trs.flatMap((tr) => {
      const cells = Array.from(tr.querySelectorAll("td"));
      if (cells.length < 6) return [];
      const anchor = cells[1].querySelector("a");
      const onclick = anchor?.getAttribute("onclick") ?? "";
      const m = onclick.match(/houseDetail\('([a-f0-9]+)'\)/);
      if (!m) return [];
      const num = (s: string) => {
        const n = parseInt(s.replace(/[^\d]/g, ""), 10);
        return Number.isFinite(n) ? n : null;
      };
      return [
        {
          status: cells[0].textContent?.trim() ?? "",
          name: anchor!.textContent?.trim() ?? "",
          address: cells[2].textContent?.trim() ?? "",
          totalUnits: num(cells[3].textContent ?? ""),
          district: cells[5].textContent?.trim() ?? "",
          projectId: m[1],
        },
      ];
    }),
  );
}

async function scrapeDetail(page: Page, projectId: string): Promise<DetailData> {
  await page.goto(`${FANGDI_BASE}/new_house/new_house_detail.html?project_id=${projectId}`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector("table", { timeout: 15000 });

  return page.evaluate(() => {
    const labelValue = (label: string): string | null => {
      const tds = Array.from(document.querySelectorAll("td"));
      const idx = tds.findIndex((t) => (t.textContent ?? "").includes(label));
      if (idx < 0) return null;
      const v = tds[idx + 1]?.textContent?.trim();
      return v && v !== "—" ? v : null;
    };

    const developer = labelValue("企业名称");
    const presaleLicense = labelValue("预售许可证");

    const totalUnitsRaw = labelValue("总套数");
    const soldUnitsRaw = labelValue("已售总套数");
    const toNum = (s: string | null) => {
      if (!s) return null;
      const n = parseInt(s.replace(/[^\d]/g, ""), 10);
      return Number.isFinite(n) ? n : null;
    };

    // 销售表: each <tr> has a cell with format "MAX/MIN" (e.g. "5945/5945" 元/㎡)
    const prices: number[] = [];
    document.querySelectorAll("table tr").forEach((tr) => {
      const cells = Array.from(tr.querySelectorAll("td"));
      for (const c of cells) {
        const txt = (c.textContent ?? "").trim();
        const m = txt.match(/^(\d+)\s*\/\s*(\d+)$/);
        if (m) {
          const hi = Number(m[1]);
          const lo = Number(m[2]);
          if (hi > 0 && lo > 0) prices.push((hi + lo) / 2);
          break;
        }
      }
    });
    const avgPrice = prices.length
      ? prices.reduce((a, b) => a + b, 0) / prices.length
      : null;

    return {
      developer,
      presaleLicense,
      totalUnits: toNum(totalUnitsRaw),
      soldUnits: toNum(soldUnitsRaw),
      avgPrice,
    };
  });
}

const NOISE_SUFFIXES = ["花园", "苑", "广场", "公寓", "府", "城", "里", "庭", "园", "邸"];

function normalizeName(name: string): string {
  let n = name
    .replace(/[（(].*?[)）]/g, "") // strip 括号 (e.g. "(一、二组团)")
    .replace(/[\s·\-]+/g, "")
    .trim();
  for (const s of NOISE_SUFFIXES) {
    if (n.endsWith(s)) n = n.slice(0, -s.length);
  }
  return n;
}

async function findPropertyByName(name: string, district: string) {
  const norm = normalizeName(name);
  const { data, error } = await supabase!
    .from("properties")
    .select("id,name")
    .eq("district", district);
  if (error) throw new Error(`supabase select: ${error.message}`);
  return (data ?? []).find((p) => normalizeName(p.name) === norm) ?? null;
}

async function persist(item: ListItem, detail: DetailData) {
  const hit = await findPropertyByName(item.name, item.district);
  if (!hit) {
    console.log(`  ! no match in DB: ${item.name} (${item.district})`);
    return;
  }
  await supabase!
    .from("properties")
    .update({
      type: "NEW",
      developer: detail.developer,
      updatedAt: new Date().toISOString(),
    })
    .eq("id", hit.id);

  if (detail.avgPrice != null || detail.presaleLicense) {
    const { error } = await supabase!.from("new_house_batches").insert({
      id: "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10),
      propertyId: hit.id,
      presaleLicense: detail.presaleLicense,
      totalUnits: detail.totalUnits,
      soldUnits: detail.soldUnits,
      avgPrice: detail.avgPrice,
      sourceUrl: `${FANGDI_BASE}/new_house/new_house_detail.html?project_id=${item.projectId}`,
      recordedAt: new Date().toISOString(),
    });
    if (error) console.warn(`  insert batch failed: ${error.message}`);
  }
  console.log(
    `  ✓ ${item.name} → avg ${detail.avgPrice?.toFixed(0) ?? "—"} 元/㎡  (${detail.soldUnits ?? "?"}/${detail.totalUnits ?? "?"} sold)`,
  );
}

async function main() {
  if (!supabase) {
    console.error("Supabase env vars missing. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const distArg = args[args.indexOf("--district") + 1];
  const distIdArg = args[args.indexOf("--district-id") + 1];

  const districtId = distIdArg || (distArg ? DISTRICT_IDS[distArg] : undefined);
  if (!districtId) {
    console.error(
      `Need --district <name> or --district-id <hash>.\nKnown districts: ${Object.keys(DISTRICT_IDS).join(", ")}`,
    );
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  });
  const page = await ctx.newPage();

  try {
    const url = `${FANGDI_BASE}/new_house/new_house_list.html?districtID=${districtId}`;
    console.log(`→ ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded" });

    // Collect all projects across all pages
    const all: ListItem[] = [];
    let pageNum = 1;
    while (true) {
      const items = await scrapeListPage(page);
      console.log(`[list page ${pageNum}] ${items.length} projects`);
      all.push(...items);

      const nextBtn = page.locator("text=下一页").first();
      const visible = await nextBtn.isVisible().catch(() => false);
      if (!visible) break;
      const disabled = await nextBtn.evaluate(
        (el) =>
          el.classList.contains("disabled") || el.classList.contains("disable") || el.hasAttribute("disabled"),
      );
      if (disabled) break;
      await nextBtn.click();
      await sleep(2000);
      pageNum += 1;
      if (pageNum > 200) break; // safety
    }

    console.log(`\nTotal projects: ${all.length}\n`);

    let matched = 0;
    let unmatched = 0;
    for (let i = 0; i < all.length; i++) {
      const item = all[i];
      try {
        console.log(`[${i + 1}/${all.length}] ${item.name}`);
        const detail = await scrapeDetail(page, item.projectId);
        const before = unmatched;
        await persist(item, detail);
        if (unmatched === before) matched += 1;
        else unmatched += 1;
      } catch (err) {
        console.warn(`  ! detail scrape failed: ${(err as Error).message}`);
      }
      await sleep(5000 + Math.random() * 3000);
    }

    console.log(`\n✓ done. matched ${matched}, unmatched ${unmatched}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
