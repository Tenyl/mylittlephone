# 小手机 Vercel 托管 API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将默认 API 地址、Key、模型和完整迷迭香角色卡移至 Vercel 服务端，同时让默认预设保持前端可编辑，并保留自定义 API 与导入角色卡能力。

**Architecture:** 前端新增托管/自定义 API 模式。托管模式把非敏感会话上下文和完整前端预设发送到同源 `/api/chat`；Vercel Function 注入服务端模型配置与私有默认角色卡，复用现有提示词与生成参数组装模块调用上游。自定义模式继续在浏览器直连。公开 PNG 只保留角色展示外壳。

**Tech Stack:** React 19、TypeScript、Dexie/IndexedDB、Vite、Vitest、Vercel Functions、OpenAI-compatible SSE。

**Spec:** `docs/superpowers/specs/2026-09-01-vercel-managed-api-design.md`

## Global Constraints

- 不实现邀请码、账号、数据库或服务端预设。
- 真实地址、Key、模型和完整默认角色卡不得提交到 Git、进入前端 bundle、IndexedDB 或托管请求体。
- 默认预设继续从 `assets` 加载到前端，允许编辑、导入和切换。
- 每项生产行为先写失败测试，再实现最小改动。
- 保持现有沉浸式聊天、隐藏思维链、最终回复整条展示及站内错误通知。
- 完成后自动提交并推送 `main`。

---

### Task 1: 定义托管协议与服务端核心

**Files:**
- Create: `src/sillytavern/managed-api.ts`
- Create: `src/server/managed-chat.ts`
- Create: `src/server/managed-chat.test.ts`
- Create: `api/chat.ts`
- Modify: `tsconfig.node.json`（或新增服务端 tsconfig）

- [ ] 先写环境变量缺失、内置角色覆盖、导入角色、生成参数、流转发和通用错误的失败测试。
- [ ] 定义无密钥、无模型字段的托管请求协议和运行时校验。
- [ ] 实现私有角色卡 Base64 解码、输入限制、提示词组装、参数上限与上游 SSE 转发。
- [ ] 创建 `/api/chat` Vercel Function 入口。
- [ ] 复跑服务端定向测试。

### Task 2: 接入前端托管路由

**Files:**
- Modify: `src/hooks/useApiRouter.ts`
- Modify: `src/hooks/useSillytavern.ts`
- Modify: `src/sillytavern/api-router.ts`
- Test: `src/sillytavern/api-router.test.ts`
- Test: `src/hooks/useSillytavern.test.tsx`
- Test: `src/App.test.tsx`

- [ ] 先写托管模式只请求 `/api/chat`、不带认证与默认角色内容的失败测试。
- [ ] 将发送参数改为托管/自定义判别联合类型。
- [ ] 托管模式发送当前预设、世界书、历史、变量和角色标识；只有导入角色发送角色内容。
- [ ] 自定义模式保留浏览器提示词组装和直连路由。
- [ ] 验证停止生成和最终消息净化行为不回归。

### Task 3: 设置模式与数据迁移

**Files:**
- Modify: `src/sillytavern/types.ts`
- Modify: `src/sillytavern/database.ts`
- Modify: `src/sillytavern/readiness.ts`
- Modify: `src/features/settings/SettingsPanel.tsx`
- Test: `src/sillytavern/database.test.ts`
- Test: `src/sillytavern/readiness.test.ts`
- Test: `src/features/settings/SettingsModal.test.tsx`

- [ ] 先写默认托管可用、自定义空配置阻塞、旧完整配置迁移为自定义的失败测试。
- [ ] 增加 `apiSource: managed | custom`，默认使用 managed。
- [ ] 托管模式隐藏地址、Key、模型和辅助 API；自定义模式显示原控件且切换不清空值。
- [ ] 更新准备向导与可发送状态。

### Task 4: 脱敏前端默认角色卡

**Files:**
- Modify: `assets/character/迷迭香.png`
- Modify: `src/sillytavern/default-content.ts`
- Modify: `src/test/bundled-defaults.ts`
- Modify: `src/sillytavern/default-content.test.ts`

- [ ] 先把测试改为要求 `chara`/`ccv3` 同步且所有敏感字段为空，并要求内置版本升级。
- [ ] 机械重写两个 PNG 文本块，只保留公开展示字段。
- [ ] 将内置角色版本升级，确保旧 IndexedDB 记录被脱敏外壳刷新。
- [ ] 验证默认预设内容和可编辑性未改变。

### Task 5: 部署工具与文档

**Files:**
- Create: `.env.example`
- Create: `scripts/encode-managed-character.mjs`
- Create: `docs/vercel-managed-api.md`
- Modify: `README.md`
- Modify: `.gitignore`

- [ ] 提供仅含变量名的环境变量示例。
- [ ] 提供读取本地私有 JSON 并输出 Base64 的工具，不写入仓库文件。
- [ ] 记录 Vercel 环境变量、Cloudflare `/api/*` 绕过缓存、域名与持续部署步骤。
- [ ] 更新 README 中“纯前端”等已失效说明，并解释托管/自定义模式。

### Task 6: 全量验证与交付

- [ ] 运行所有 Vitest 测试。
- [ ] 运行 TypeScript typecheck。
- [ ] 运行 Vite production build，并检查产物不含敏感角色提示词锚点或环境变量值。
- [ ] 进行代码审查并修复高置信问题。
- [ ] 提交所有变更、推送 `origin/main`，核对远端 SHA。
- [ ] 将 goal 标记完成并报告验证结果。
