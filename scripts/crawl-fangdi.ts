/**
 * Crawl Shanghai 网上房地产 (fangdi.com.cn) for new house presale data.
 *
 * Usage:
 *   npm run crawl:fangdi -- --district pudong
 *
 * Notes:
 *   - 政府公开站，请控制频率 (5-10s per request)。
 *   - Site layout changes occasionally — selectors here are scaffolded as TODOs;
 *     run once, inspect, and adjust selectors.
 *   - Uses Playwright Chromium (run `npx playwright install chromium` first).
 */
import { chromium, type Page } from "playwright";
import { prisma } from "./lib/db";
import { findDistrict } from "../lib/districts";
import { findOrCreatePropertyByName } from "./lib/match-property";

const FANGDI_BASE = "https://www.fangdi.com.cn";

type RawProject = {
  name: string;
  developer?: string;
  district: string;
  presaleLicense?: string;
  totalUnits?: number;
  soldUnits?: number;
  avgPrice?: number;
  detailUrl?: string;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function listProjects(page: Page, districtCn: string): Promise<RawProject[]> {
  // TODO: navigate to the search page for new house presale (商品房预销售信息查询).
  // The exact URL & form differ; this scaffold opens the home page and expects
  // you to fill in selectors after inspecting the page.
  await page.goto(FANGDI_BASE, { waitUntil: "domcontentloaded" });
  await sleep(2000);

  // Placeholder: return empty list until selectors are filled in.
  console.warn(
    `[fangdi] Selectors are not yet filled in. Inspect ${FANGDI_BASE} in the opened browser ` +
      `and adjust listProjects() to scrape the ${districtCn} list page.`
  );
  return [];
}

async function persistProject(p: RawProject) {
  const property = await findOrCreatePropertyByName({
    name: p.name,
    district: p.district,
    fallbackSource: "FANGDI",
    fallbackSourceId: p.presaleLicense ?? p.name,
  });
  if (!property) {
    console.warn(`  ! could not match or create property: ${p.name}`);
    return;
  }

  await prisma.property.update({
    where: { id: property.id },
    data: {
      type: property.type === "SECONDHAND" ? "BOTH" : "NEW",
      developer: p.developer ?? property.developer,
    },
  });

  if (p.presaleLicense) {
    await prisma.newHouseBatch.create({
      data: {
        propertyId: property.id,
        presaleLicense: p.presaleLicense,
        totalUnits: p.totalUnits,
        soldUnits: p.soldUnits,
        avgPrice: p.avgPrice,
        sourceUrl: p.detailUrl,
      },
    });
  }
}

async function main() {
  const args = process.argv.slice(2);
  const distArgIdx = args.indexOf("--district");
  if (distArgIdx < 0 || !args[distArgIdx + 1]) {
    console.error("Usage: npm run crawl:fangdi -- --district pudong");
    process.exit(1);
  }
  const district = findDistrict(args[distArgIdx + 1]);
  if (!district) {
    console.error(`Unknown district: ${args[distArgIdx + 1]}`);
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  try {
    const projects = await listProjects(page, district.cn);
    console.log(`[fangdi] ${district.cn}: parsed ${projects.length} projects`);

    for (const p of projects) {
      await persistProject(p);
      await sleep(5000 + Math.random() * 3000);
    }
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
