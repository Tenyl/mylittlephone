# 角色聊天前端原型 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个高完成度、全中文、纯前端的手机即时通讯式 LLM 角色聊天原型。

**Architecture:** React 组件负责界面，领域 reducer 负责聊天与配置状态，浏览器适配层负责 LocalStorage、JSON 文件导入和模拟流式回复。所有外部边界都通过小型函数隔离，未来可将模拟回复服务替换为真实 LLM 客户端而不改动页面组件。

**Tech Stack:** Vite 7、React 19、TypeScript 5、Vitest、Testing Library、Phosphor Icons、CSS Modules/全局设计令牌。

**Spec:** `docs/superpowers/specs/2026-09-01-character-chat-design.md`

## Global Constraints

- 只实现前端，不创建服务端、数据库或真实 LLM 调用。
- 所有用户可见文案使用简体中文，禁止 Emoji 功能图标。
- 所有交互元素具有唯一且可描述的 ID，图标按钮具有中文可访问名称。
- 所有确认、警告和通知使用站内组件，不调用浏览器原生对话框。
- 支持 375、768、1024、1440px，并支持 `prefers-reduced-motion`。
- 新增行为遵循测试先行：先观察失败，再写最小实现并回归全部测试。

---

### Task 1: 项目骨架与领域模型

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`
- Create: `src/domain/types.ts`, `src/domain/demoData.ts`, `src/domain/chatReducer.ts`
- Test: `src/domain/chatReducer.test.ts`

**Interfaces:**
- Produces: `AppState`, `AppAction`, `chatReducer(state, action): AppState`, `createInitialState(): AppState`。

- [ ] 写 reducer 失败测试，覆盖发送消息、流式追加、停止、切换预设和世界书启停。
- [ ] 运行 `npm test -- src/domain/chatReducer.test.ts`，确认因为模块缺失而失败。
- [ ] 实现领域类型、真实演示数据和最小 reducer。
- [ ] 再次运行该测试并确认通过。

### Task 2: 导入、持久化与模拟回复边界

**Files:**
- Create: `src/services/importers.ts`, `src/services/storage.ts`, `src/services/mockLlm.ts`
- Test: `src/services/importers.test.ts`, `src/services/storage.test.ts`, `src/services/mockLlm.test.ts`

**Interfaces:**
- Consumes: `CharacterCard`, `WorldBook`, `Preset`, `PersistedState`。
- Produces: `parseCharacterCard`, `parseWorldBook`, `parsePreset`, `loadPersistedState`, `savePersistedState`, `streamReply`。

- [ ] 写失败测试，使用手工 JSON 固定值验证成功解析、格式错误、2MB 限制、持久化回退和中断流式回复。
- [ ] 运行服务测试并确认因函数缺失而失败。
- [ ] 实现最小解析、存储和可取消异步生成器。
- [ ] 运行全部服务测试并确认通过。

### Task 3: 应用壳、聊天流与输入交互

**Files:**
- Create: `src/main.tsx`, `src/App.tsx`, `src/hooks/useChatApp.ts`
- Create: `src/components/AppShell.tsx`, `src/components/ChatHeader.tsx`, `src/components/MessageList.tsx`, `src/components/Composer.tsx`
- Create: `src/styles/tokens.css`, `src/styles/global.css`, `src/styles/app.css`
- Create: `src/assets/avatar-lin.svg`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: Task 1 reducer 与 Task 2 服务。
- Produces: 可发送、停止、重新生成、编辑和删除最近一轮的聊天主界面。

- [ ] 写组件失败测试，覆盖发送、Enter/Shift+Enter、生成状态和停止操作。
- [ ] 运行组件测试并确认入口组件缺失导致失败。
- [ ] 实现应用状态 hook、三栏壳、消息流、输入区和核心设计令牌。
- [ ] 运行组件测试和领域测试并确认通过。

### Task 4: 配置抽屉、导入与会话操作

**Files:**
- Create: `src/components/ContextRail.tsx`, `src/components/PanelDrawer.tsx`
- Create: `src/features/character/CharacterPanel.tsx`
- Create: `src/features/worldbook/WorldBookPanel.tsx`
- Create: `src/features/presets/PresetPanel.tsx`
- Create: `src/features/session/SessionPanel.tsx`
- Create: `src/components/ToastRegion.tsx`, `src/components/ConfirmDialog.tsx`
- Test: `src/features/panels.test.tsx`

**Interfaces:**
- Consumes: `useChatApp` 暴露的领域状态和操作。
- Produces: 四类完整面板、JSON 导入、预设切换、条目启停、导出、重置与清空确认。

- [ ] 写面板失败测试，覆盖入口可达、预设切换、条目展开和清空确认。
- [ ] 运行面板测试并确认组件缺失导致失败。
- [ ] 实现面板、站内通知、确认对话框和导入状态。
- [ ] 运行全部测试并确认通过。

### Task 5: 响应式、动效与可访问性收尾

**Files:**
- Modify: `src/styles/app.css`, `src/styles/global.css`
- Modify: `src/components/PanelDrawer.tsx`, `src/components/MessageList.tsx`, `src/components/Composer.tsx`
- Test: `src/App.accessibility.test.tsx`

**Interfaces:**
- Produces: 375px 单视图、1024px 三栏布局、键盘焦点、Escape 关闭、live region 与 reduced-motion 回退。

- [ ] 写失败测试验证中文可访问名称、dialog 语义、live region 和键盘关闭。
- [ ] 运行测试并确认缺失语义导致失败。
- [ ] 完成响应式 CSS、焦点管理、可中断动效和性能细节。
- [ ] 运行 `npm test` 与 `npm run build` 并确认通过。

### Task 6: 浏览器验收

**Files:**
- Modify only if verification discovers a defect.

**Interfaces:**
- Produces: 经 375px 与 1440px 真实浏览器验证的最终原型。

- [ ] 启动 Vite 预览并检查桌面三栏、移动聊天、所有抽屉和确认弹窗。
- [ ] 检查无水平溢出、输入区遮挡、控制台错误和焦点可见性。
- [ ] 对发现的每个缺陷先增加失败回归测试，再修复并重跑验证。
- [ ] 运行最终 `npm test`、`npm run build` 和类型检查，保存结果。
