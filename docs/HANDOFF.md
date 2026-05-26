# 接力棒 / Session handoff

> 给下一个 Claude 会话看：用户是 Esther，正在做上海买房的个人地图工具。
> 上一个会话因为云沙箱网络策略不允许访问 Supabase Postgres 5432 端口而中断。
> 这个文档总结进度，新会话从这里继续。

## 项目背景

- 目的：在地图上看上海楼盘（新房 + 二手房）、记录看楼经历
- 方案：高德 POI + 上海网上房地产官网 + 手动录入 + 链家外链（不爬链家/贝壳）
- 部署：Vercel + Supabase
- 详细设计：见 `docs/PLAN.md`

## 当前进度

### ✅ 已完成（commit `a8ac25e`）

- Next.js 16 + TypeScript + Tailwind v4 脚手架
- Prisma schema（含 directUrl）
- 所有页面：`/map` `/property/[id]` `/property/[id]/edit` `/property/new` `/visits` `/visits/new` `/visits/[id]`
- 所有 API 路由：`/api/properties` `/api/visits` `/api/upload` `/api/properties/manual`
- 高德地图 React 组件（点聚合 + 价格分档着色）
- 数据脚本：`scripts/sync-amap-poi.ts`（直接可跑）、`scripts/crawl-fangdi.ts`（selector 待填）
- `npm run build` 通过

### ⏳ 下一步该做的（按顺序）

1. **验证 env vars 已注入**：`env | grep -E "(SUPABASE|AMAP|DATABASE_URL)"` 应该能看到值
   - 如果没有，提醒用户去 Claude Code on the web → 当前 environment → Environment variables 检查
   - 必需的变量列表见 `.env.example`
2. **跑 Prisma migration**：`node_modules/.bin/prisma migrate dev --name init`
   - 必须用本地 prisma（package.json 锁 5.x），`npx prisma` 会拉 7.x 报 schema 不兼容
   - 这会在 Supabase Postgres 里建出所有表
   - DIRECT_URL 实际指向 `aws-1-ap-northeast-1.pooler.supabase.com:5432`（session pooler）
3. **同步高德 POI**：`npm run sync:amap -- --district pudong` 先试一个区
   - 跑通后再 `npm run sync:amap` 全上海
4. **启动 dev server**：`npm run dev`
   - 访问 `/map` 检查地图能加载、能看到 POI marker
5. **网上房地产爬虫**：`scripts/crawl-fangdi.ts` 里的 selector 还是占位的。需要先打开 fangdi.com.cn 看 DOM 才能填——这一步建议等用户主动提

### 🔑 环境变量（应该已在 Claude Code Environment 里设好）

```
NEXT_PUBLIC_AMAP_KEY            高德 JS API key
NEXT_PUBLIC_AMAP_SECURITY_CODE  可选，空也行
AMAP_WEB_SERVICE_KEY            高德 Web 服务 key（POI 用）
DATABASE_URL                    Supabase pooler URL，端口 6543，含 ?pgbouncer=true
DIRECT_URL                      Supabase direct URL，端口 5432（migration 用）
NEXT_PUBLIC_SUPABASE_URL        https://<ref>.supabase.co （注意不要带 /rest/v1/）
NEXT_PUBLIC_SUPABASE_ANON_KEY   sb_publishable_... 格式
SUPABASE_SERVICE_ROLE_KEY       sb_secret_... 格式
SUPABASE_STORAGE_BUCKET         SHproperty（用户在 Supabase Storage 已建好的 bucket）
```

数据库密码里有特殊字符（`!#?/`），URL 里**必须 encode**：
- `!` → `%21`、`#` → `%23`、`?` → `%3F`、`/` → `%2F`

### 🚧 已知约束

- **云沙箱网络**：Full 策略实测仍挡 Postgres 端口（DNS 通、443 通、5432/6543 挂）。
  必须用 **Custom**，至少加这些规则：
  - `aws-1-ap-northeast-1.pooler.supabase.com:5432`（migration / session pooler）
  - `aws-1-ap-northeast-1.pooler.supabase.com:6543`（runtime / transaction pooler）
  - `*.supabase.co:443`（Storage、REST）
  - `*.supabase.in:443`
  - `restapi.amap.com:443` / `webapi.amap.com:443`（高德 Web 服务）
  改完策略后**必须重启会话**，旧会话不会热更新网络规则。
- **Supabase Storage bucket**：用户的 bucket 叫 `SHproperty`，需要确认是 public（看楼照片要直接 URL 访问）。
- **fangdi.com.cn 爬虫**：DOM selector 是占位的，跑会报"未填 selector"。等用户准备好再补。

## 跟用户沟通的偏好（基于上一个会话）

- 用中文，简洁
- 不要堆术语，遇到 UI 找不到时让她截图
- 推荐方案的时候给 2-3 个选项 + 简短的取舍说明
- AskUserQuestion 工具能用就用，不要让她在文本里挑选项

## 上一个会话的对话脉络（可选阅读）

1. 讨论数据源 → 选了方案 D（不爬链家/贝壳，用高德 POI + 网上房地产 + 手动录入）
2. 焦点放在新房（二手房 UI 复用，靠手动 + 链家外链）
3. 脚手架完成、push 到 `claude/determined-einstein-fRPh6`
4. 用户拿到高德 + Supabase keys
5. 发现云沙箱网络策略 Trusted 挡了 Postgres 端口
6. 用户改成 Full + 启动新会话 → 当前这个会话
