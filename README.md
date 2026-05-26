# 上海买房助手

个人用网页工具：在地图上看上海楼盘（新房 + 二手房），记录看楼经历和反馈。

## 技术栈

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4
- 高德地图 JS API（地图）+ Web 服务 API（POI 拉取）
- Supabase Postgres (Prisma ORM) + Supabase Storage（看楼照片）
- Playwright（爬上海网上房地产新房数据，本地手动跑）
- 部署：Vercel

## 数据策略（方案 D · 新房聚焦）

| 数据 | 来源 | 方式 |
|---|---|---|
| 楼盘位置 / 名称 | 高德 Web 服务 POI | `npm run sync:amap` |
| 新房预售证 / 备案均价 / 批次 | 上海网上房地产 fangdi.com.cn | `npm run crawl:fangdi -- --district pudong` |
| 楼盘补充信息（容积率 / 户型 / 物业） | 手动录入 | `/property/[id]/edit` |
| 二手房单价 / 物业 | 手动录入 + 链家外链 | `/property/[id]/edit` |
| 看楼记录 | 手动录入 + 上传照片 | `/visits/new` |

**不爬链家/贝壳/安居客**——避免法律风险，需要看二手房挂牌就点详情页的「在链家查看」外链。

## 本地开发

```bash
# 1. 复制并填写环境变量
cp .env.example .env.local
# 填入 DATABASE_URL / NEXT_PUBLIC_AMAP_KEY / AMAP_WEB_SERVICE_KEY / Supabase keys

# 2. 跑 Prisma migration
npx prisma migrate dev --name init

# 3. 同步高德 POI（一次性）
npm run sync:amap                # 全上海
npm run sync:amap -- --district pudong  # 只浦东

# 4. 抓新房数据
npx playwright install chromium
npm run crawl:fangdi -- --district pudong

# 5. 启动开发服务器
npm run dev
```

## 路由

| 路径 | 说明 |
|---|---|
| `/map` | 主地图页 |
| `/property/[id]` | 楼盘详情 |
| `/property/[id]/edit` | 编辑楼盘 |
| `/property/new` | 手动新增楼盘 |
| `/visits` | 看楼记录时间线 |
| `/visits/new` | 新增看楼记录 |
| `/visits/[id]` | 看楼记录详情 |

## 部署到 Vercel

把仓库连到 Vercel，环境变量填入：
- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_AMAP_KEY`、`NEXT_PUBLIC_AMAP_SECURITY_CODE`

**注意**：爬虫脚本不在 Vercel 跑（serverless 不适合），只在本地手动跑后写入同一个 Supabase 数据库。
