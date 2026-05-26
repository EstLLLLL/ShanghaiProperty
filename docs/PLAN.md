# 上海买房地图工具 — 实施方案（方案 D · 新房聚焦）

## Context

用户正在考虑在上海买房，希望有个人用的网页工具辅助决策。需求三块：

1. **地图浏览**：在高德地图上看楼盘的位置、开发商、物业、价格、开盘/成交信息（新房 + 二手房都要）
2. **看楼记录板**：实地看楼后记录多维评分、文字反馈、照片
3. **后续可拓展**：基于看楼反馈推荐下一个值得看的楼盘（MVP 不做）

**交付策略**：新房和二手房都在产品范围内，但**第一版先把新房链路打通**（数据脚本 + 地图 + 详情 + 看楼记录），二手房复用同一套数据模型和 UI，挂牌价靠手动录入 + 链家外链，不爬。

仓库为空，从零搭建。个人自用，不对外服务。

## 已确认决策

| 维度 | 选择 |
|---|---|
| **数据策略** | 方案 D：高德 POI + 上海网上房地产 + 手动录入 + 链家外链（不爬链家/贝壳） |
| **交付顺序** | 新房先打通（含官方数据脚本），二手房同一套 UI，挂牌信息手动录入 |
| 地图 | 高德 AMap JS API |
| 框架 | Next.js (App Router) + TypeScript |
| 部署 | Vercel |
| 数据库 | Supabase (Postgres + Storage 存看楼照片) |
| 爬虫运行 | 本地手动 `npm run crawl`（MVP） |
| AI 推荐 | 本期不做 |

---

## 数据来源分层

| 数据 | 来源 | 方式 | 合规性 |
|---|---|---|---|
| **所有**楼盘名/地址/经纬度/电话（新房 + 二手房） | 高德 Web 服务 API（POI type=120300 住宅小区 / 120302 别墅） | 官方 API | ✅ 完全合规 |
| **新房**预售证、备案均价、总套数、开发商、批次 | 上海市房地产交易中心 [网上房地产](http://www.fangdi.com.cn) | 爬虫（每周一次，低频） | ✅ 政府公开信息 |
| 新房项目详情：容积率、绿化率、户型、面积段、交付时间 | 手动录入（去售楼处看完后补） | 表单 | ✅ |
| **二手房**挂牌价 / 单价 / 物业公司 | 详情页放"在链家查看"外链 + 自己手动录入关键数字 | 跳转 + 表单 | ✅ |
| 我的看楼记录（新房 + 二手房通用） | 手动录入 | 表单 + 上传 | ✅ |

> 高德 POI 同时覆盖新建小区和老小区，所以**地图基底**对新房和二手房是一样的。差异只在"详情页显示什么数据" 和 "靠什么补充信息"。

> **不爬链家/贝壳/安居客** — 规避法律风险，需要看实时挂牌就在详情页点外链跳过去。

---

## 架构总览

```
┌──────────────────────────────┐       ┌─────────────────────────┐
│ scripts/                      │ upsert│  Supabase (Postgres)    │
│  - sync-amap-poi.ts (官方 API)│ ─────▶│  - properties           │
│  - crawl-fangdi.ts (爬官网)   │       │  - new_house_batches    │
└──────────────────────────────┘       │  - visits               │
                                       │  - visit_photos         │
                                       │  - tags                 │
                                       └──────────▲──────────────┘
                                                  │ Prisma
                                       ┌──────────┴──────────────┐
                                       │  Next.js App (Vercel)   │
                                       │  - /map  (高德 AMap)    │
                                       │  - /property/[id]       │
                                       │  - /property/[id]/edit  │
                                       │  - /visits  /visits/new │
                                       └─────────────────────────┘
```

---

## 数据模型 (Prisma schema)

`prisma/schema.prisma`：

- **Property** 楼盘（新房和二手房共用一张表）
  - `id, source(AMAP|FANGDI|MANUAL), sourceId, name, type(NEW|SECONDHAND|BOTH), developer, propertyCompany, address, district, lng, lat, phone, yearBuilt, plotRatio, greenRatio, deliveryDate, lianjiaUrl, manualUnitPrice, manualPriceUpdatedAt, notes, createdAt, updatedAt`
  - 唯一 `(source, sourceId)` 用于 upsert；高德 POI 和官网项目通过 `name + 地址模糊匹配` 合并
  - `manualUnitPrice` 给二手房手动录入用，新房展示批次均价

- **NewHouseBatch** 新房批次（仅新房，一个楼盘多次开盘）
  - `id, propertyId, presaleLicense(预售证号), batchName, totalUnits, soldUnits, avgPrice, priceRangeMin, priceRangeMax, openDate, recordedAt, sourceUrl`

- **HouseType** 户型（新房和二手房都可以手动录入）
  - `id, propertyId, rooms, area, orientation, totalPriceEst, notes`

- **Visit** 看楼记录
  - `id, propertyId, visitedAt, overallRating(1-5), locationRating, layoutRating, priceRating, propertyMgmtRating, salesAttitudeRating, notes(markdown), createdAt`

- **VisitPhoto** `id, visitId, url(Supabase Storage), caption`

- **Tag** + **PropertyTag**（多对多：地铁/学区/南北通透/精装/毛坯/远郊 等自由打标签）

---

## 数据脚本 (scripts/)

### `scripts/sync-amap-poi.ts`
- 调高德 Web 服务 [搜索 POI 2.0](https://lbs.amap.com/api/webservice/guide/api/newpoisearch)，按上海各区（徐汇/浦东/闵行...）拉 type=120300 住宅小区
- upsert 到 `Property`，`source=AMAP`
- 一次性同步即可，后续偶尔补全

### `scripts/crawl-fangdi.ts`
- 目标：上海网上房地产新建商品房预销售信息查询
- 流程：列表页（按区/按时间筛）→ 项目详情 → 抓 `预售证号 / 项目名 / 开发商 / 总套数 / 可售套数 / 备案均价 / 批次`
- 解析后：
  - 用 `项目名 + 区` 模糊匹配已有的 AMAP Property，匹配上就关联，匹配不上就新建一条 `source=FANGDI` 的 Property
  - 写入 `NewHouseBatch`
- 频率：每周手动跑一次 `npm run crawl:fangdi`，每请求间 5-10s 延迟（政府站，谨慎）

### `scripts/lib/db.ts`、`scripts/lib/match-property.ts`
- Prisma 单例 + 楼盘合并逻辑（去除常见后缀「花园/苑/广场」+ 行政区匹配）

---

## Web 应用 (Next.js App Router)

### 关键文件

| 路径 | 作用 |
|---|---|
| `app/layout.tsx` | 全局布局：左侧导航（地图 / 看楼记录） |
| `app/page.tsx` | 重定向到 `/map` |
| `app/map/page.tsx` | **主地图页**：高德全屏 + 左侧筛选 + 右侧楼盘卡片 |
| `app/property/[id]/page.tsx` | 楼盘详情：基本信息、批次/备案均价、户型、看楼记录、"在链家查看"外链 |
| `app/property/[id]/edit/page.tsx` | 编辑楼盘（手动补容积率/户型/物业等） |
| `app/property/new/page.tsx` | 手动新增一个楼盘（高德官网都没有的） |
| `app/visits/page.tsx` | 看楼记录时间线 |
| `app/visits/new/page.tsx` | 新建看楼记录表单 |
| `app/visits/[id]/page.tsx` | 单条看楼记录详情 |
| `app/api/properties/route.ts` | GET 按 bbox/筛选条件返回地图楼盘 |
| `app/api/properties/[id]/route.ts` | GET/PATCH 楼盘详情 |
| `app/api/visits/route.ts` | GET/POST 看楼记录 |
| `app/api/upload/route.ts` | 看楼照片上传 → Supabase Storage |
| `components/AMap.tsx` | 高德地图 React 封装（dynamic import 避免 SSR） |
| `components/PropertyMarker.tsx` | marker 按均价档着色，已看过加星标 |
| `components/FilterPanel.tsx` | 筛选：区/价格区间/总价区间/有看楼记录/已打开盘批次 |
| `lib/prisma.ts` | Prisma 单例 |
| `lib/amap-client.ts` | 高德 JS API loader (NEXT_PUBLIC_AMAP_KEY) |

### 高德地图集成
- `@amap/amap-jsapi-loader` 动态加载
- 用 `AMap.MarkerCluster` 做点聚合（上海几千个 POI 不聚合会卡）
- 地图 `moveend` 取 bbox → `/api/properties?bbox=...` → 重绘
- marker 颜色按均价分档（<5万/5-8万/8-12万/>12万）
- 已写过看楼记录的楼盘加金色星标

### 看楼记录板
- 新建表单：先搜楼盘关联（Property 全文搜索）；如果是没入库的，给「+ 新建楼盘」按钮跳到 `/property/new`
- 多维评分（地段/户型/价格/物业/销售态度），整体星级取均值（可手动覆盖）
- Markdown 文字反馈
- 照片上传 → Supabase Storage → 缩略图列表
- 列表页支持按区/评分/日期排序

---

## 实施顺序（建议分 5 个 commit，新房先打通）

1. **脚手架**：`create-next-app` + Tailwind + shadcn/ui + Prisma + Supabase 连接 + 环境变量模板
2. **数据模型 + POI 同步**：Prisma schema（含 `type=NEW|SECONDHAND|BOTH`） + migration + `sync-amap-poi.ts` 把上海住宅 POI 全量入库（这一步同时给新房和二手房铺好地图基底）
3. **新房数据脚本**：`crawl-fangdi.ts` 抓一个区的新房批次跑通，能匹配到对应 Property 并写入 `NewHouseBatch`
4. **地图 + 楼盘详情**：高德接入 + `/api/properties` + 聚合 marker + 筛选（含「新房/二手房」切换） + `/property/[id]`（新房显示批次表格，二手房显示手动单价 + 链家外链） + 编辑表单
5. **看楼记录板**：新建/列表/详情 + 多维评分 + 照片上传 + 标签（新房二手房通用）

> 二手房在第 4 步就有了 UI——只是它的数据靠手动录入和外链，不需要额外的脚本。

---

## 验证方式

- **POI 同步**：`npm run sync:amap` 后，Supabase `properties` 表有 5000+ 条上海住宅 POI（含经纬度）
- **新房数据**：`npm run crawl:fangdi -- --district pudong` 后，`new_house_batches` 表有近 1 年浦东的新房预售批次，能在对应 Property 上看到备案均价
- **地图**：`npm run dev` → `/map` 缩放浦东能看到 marker 聚合，点击展开后弹楼盘卡片，按均价着色正确
- **详情**：点 marker 进 `/property/[id]`，能看到批次列表、备案均价、"在链家查看 →" 按钮跳转到 `https://sh.lianjia.com/xiaoqu/rs<name>/`
- **手动补全**：在 `/property/[id]/edit` 加户型/物业/容积率，保存后详情页能看到
- **记录板**：`/visits/new` 关联一个楼盘、打 5 维分、写 markdown、上传 2 张照片 → `/visits` 列表能看到，地图上该楼盘有金色星标
- **部署**：推到 `claude/determined-einstein-fRPh6` → Vercel preview 能跑（Vercel 只跑 Web，不跑爬虫）

---

## 你需要准备的

1. 高德开放平台账号 → 申请 **Web 端 JS API key**（地图） 和 **Web 服务 API key**（POI 搜索，两个 key 不同）
2. Supabase 项目 → `DATABASE_URL` + `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY`
3. Vercel 项目（连 GitHub 仓库即可）
4. 本地 Node 20+ 环境（爬 fangdi 用 Playwright，首次 `npx playwright install chromium`）

---

## 后续可加（不在 MVP）

- AI 推荐：基于看楼记录的多维评分 + Claude API 推荐下一个值得看的
- 自动提醒：新增预售批次时给关注的区发邮件/微信
- 通勤时间计算：高德路径规划 API，输入公司地址算到每个楼盘的通勤时间
- 二手房成交备案数据（网上房地产也有月度成交备案，但延迟几个月，作为补充）
