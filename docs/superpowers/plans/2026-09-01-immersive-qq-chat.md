# 澄语全窗口 QQ 沉浸聊天 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将三栏酒馆管理界面改为全窗口 QQ 聊天，并把配置收进齿轮管理中心；生成期间仅显示输入状态，完成后一次性展示无思维链、无选项的最终回复。

**Architecture:** `App` 继续拥有面板编排状态，但统一通过新的 `ManagementCenter` 呈现。`AppShell` 只负责准备态或全窗口聊天态；`MessageList` 把流式助手消息渲染为输入气泡，`useSillytavern` 在完成时保存净化后的最终正文并丢弃思考、选项与原始推理。

**Tech Stack:** React 19、TypeScript、Dexie/IndexedDB、Vitest、Testing Library、Vite、Phosphor Icons、CSS。

**Spec:** `docs/superpowers/specs/2026-09-01-immersive-qq-chat-design.md`

## Global Constraints

- 纯前端实现，不增加服务器、代理或云端存储。
- 聊天态只能可见玩家消息与角色最终回复。
- 不显示或持久化思维链、剧情选项与原始推理内容。
- 所有配置入口统一位于右上角齿轮管理中心；会话历史保留为聊天顶栏动作。
- 不使用 Emoji、浏览器原生 `alert`/`confirm`/`prompt` 或新的动画依赖。
- 保持 44×44px 交互目标、键盘焦点、Escape 关闭、reduced-motion 与 375px 响应式支持。
- 每项生产行为先写失败测试，再实现最小改动。

---

### Task 1: 建立统一管理中心

**Files:**
- Create: `src/components/ManagementCenter.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/PanelDrawer.tsx`
- Test: `src/App.accessibility.test.tsx`

**Interfaces:**
- Produces: `ManagementSection = 'home' | PanelId`；`ManagementCenter({ section, onSelectSection, onClose, children, readiness })`。
- Consumes: 现有 `PanelId`、`PanelDrawer` 焦点陷阱和所有 feature panel。

- [ ] **Step 1: 写统一入口失败测试**

在 `src/App.accessibility.test.tsx` 中替换移动导航断言，要求点击“打开管理中心”后出现一个名为“管理中心”的 dialog，并包含“角色卡”“世界书”“对话预设”“API 与设置”“会话变量”“本地数据”六个入口；Escape 关闭后焦点回到齿轮。

```tsx
const gear = await screen.findByRole('button', { name: '打开管理中心' })
await user.click(gear)
const center = screen.getByRole('dialog', { name: '管理中心' })
expect(within(center).getByRole('button', { name: /角色卡/ })).toBeInTheDocument()
await user.keyboard('{Escape}')
expect(gear).toHaveFocus()
```

- [ ] **Step 2: 运行失败测试**

Run: `npm test -- --run src/App.accessibility.test.tsx --reporter=verbose`

Expected: FAIL，当前页面只有旧“功能导航”和独立 PanelDrawer。

- [ ] **Step 3: 实现 ManagementCenter 外壳**

创建带 portal、scrim、焦点陷阱、首页入口网格和二级内容头部的组件。所有按钮使用稳定 ID：`management-open-*`、`management-back-home`、`management-close`。复杂内容通过 `children` 注入，关闭时卸载。

- [ ] **Step 4: 将 App 面板编排迁入管理中心**

把 `activePanel` 扩展为管理中心当前 section。齿轮打开 `home`；选择角色卡/世界书/预设/变量/设置时在同一中心内呈现现有 feature panel，不再为每类内容创建独立顶层 drawer。设置面板中的“本地数据”仍作为设置内部分类，但首页提供直接跳转。

- [ ] **Step 5: 复跑测试并提交**

Run: `npm test -- --run src/App.accessibility.test.tsx src/features/panels.test.tsx src/features/settings/SettingsModal.test.tsx`

Commit: `feat: add unified chat management center`

---

### Task 2: 将外壳改为全窗口聊天

**Files:**
- Modify: `src/components/AppShell.tsx`
- Modify: `src/components/ChatHeader.tsx`
- Modify: `src/styles/app.css`
- Modify: `src/styles/sillytavern.css`
- Test: `src/App.test.tsx`

**Interfaces:**
- `AppShell` 新增 `onOpenManagement(): void`，删除移动功能导航状态和常驻上下文计算。
- `ChatHeader` 新增 `onOpenManagement(): void`，齿轮 ID 为 `chat-open-management`。

- [ ] **Step 1: 写聊天态布局失败测试**

在已 seed 会话的集成测试中断言聊天页存在 `#immersive-chat-shell` 和“打开管理中心”按钮，且不存在 `aria-label="主要功能"`、`aria-label="当前上下文"`、“IndexedDB 已连接”及“本地浏览器存储”。

```tsx
expect(await screen.findByTestId('immersive-chat-shell')).toBeInTheDocument()
expect(screen.queryByLabelText('主要功能')).not.toBeInTheDocument()
expect(screen.queryByText(/IndexedDB|本地浏览器存储/)).not.toBeInTheDocument()
```

- [ ] **Step 2: 运行失败测试**

Run: `npm test -- --run src/App.test.tsx --reporter=verbose`

Expected: FAIL，旧左右栏仍在 DOM。

- [ ] **Step 3: 简化 AppShell**

删除 `nav-rail`、`context-rail`、`MobileNavigation`、上下文百分比和相关导入。准备态与聊天态均使用一个全窗口 `app-window immersive-window`；准备态齿轮固定右上，聊天态齿轮进入 `ChatHeader`。

- [ ] **Step 4: 更新 ChatHeader**

顶栏顺序为角色头像、昵称/状态、历史、齿轮。生成时只显示“正在输入…”，空闲显示“在线”，不显示“本地会话”。历史和齿轮均使用 44×44px 图标按钮与明确 aria-label。

- [ ] **Step 5: 重写核心布局 CSS**

将 `.app-stage` 和 `.app-window` 设为视口宽高，移除桌面边距、圆角和悬浮阴影。`.chat-column` 使用 `grid-template-rows: auto minmax(0,1fr) auto`。消息内容宽屏最大 920px，手机端铺满并尊重 safe area。

- [ ] **Step 6: 复跑测试并提交**

Run: `npm test -- --run src/App.test.tsx src/App.accessibility.test.tsx`

Commit: `feat: switch chat to immersive full-window shell`

---

### Task 3: 只持久化最终可见回复

**Files:**
- Modify: `src/hooks/useSillytavern.ts`
- Modify: `src/sillytavern/types.ts`（仅在需要收窄 metadata 时）
- Test: `src/hooks/useSillytavern.test.tsx`
- Test: `src/App.test.tsx`

**Interfaces:**
- Produces: `sanitizeFinalParsed(parsed): ParsedGameResponse`，返回 `thinking: ''`、`options: []`，保留 `maintext`、`sum`、`vars` 和 `details` 的内部结果。
- 生成失败/停止后会话中只保留玩家消息，不保留助手占位消息。

- [ ] **Step 1: 写隐私与停止行为失败测试**

构造包含 `<thinking>秘密推理</thinking><maintext>最终回复</maintext><option>选项</option>` 的 SSE。完成后从数据库加载会话并断言角色消息 `content === '最终回复'`、`parsed.thinking === ''`、`parsed.options` 为空、`metadata.rawContent` 不存在。中止请求后断言最后一条消息仍为玩家消息。

```ts
expect(saved.messages.at(-1)).toMatchObject({ role: 'assistant', content: '最终回复' })
expect(saved.messages.at(-1)?.parsed?.thinking).toBe('')
expect(saved.messages.at(-1)?.parsed?.options).toEqual([])
expect(saved.messages.at(-1)?.metadata?.rawContent).toBeUndefined()
```

- [ ] **Step 2: 运行失败测试**

Run: `npm test -- --run src/hooks/useSillytavern.test.tsx src/App.test.tsx --reporter=verbose`

Expected: FAIL，当前最终消息保存完整 parsed 和 rawContent，中止后保留半成品助手消息。

- [ ] **Step 3: 实现最终解析净化**

在 hook 内增加纯函数净化 parser 结果。流式阶段可以在 React 状态中保留临时 maintext，但不得写数据库；最终保存时删除 `rawContent`，将思考与选项清空。变量仍从原始 parsed 计算，摘要仍写入 metadata.summary。

- [ ] **Step 4: 实现失败/停止占位清理**

catch 分支从 `workingChat.messages` 中移除 assistantId 后保存。Abort 返回 false 且 generation 回到 idle；非 Abort 设置 error 并触发站内 Toast。不得创建 interrupted/failed 助手气泡。

- [ ] **Step 5: 复跑测试并提交**

Run: `npm test -- --run src/hooks/useSillytavern.test.tsx src/App.test.tsx`

Commit: `feat: keep model reasoning out of persisted chat`

---

### Task 4: 输入状态与纯消息时间线

**Files:**
- Create: `src/components/TypingIndicator.tsx`
- Modify: `src/components/MessageList.tsx`
- Modify: `src/components/Composer.tsx`
- Modify: `src/components/SillyTavern/MainTextPane.tsx`
- Modify: `src/styles/app.css`
- Test: `src/features/chat/GameMessage.test.tsx`
- Test: `src/features/chat/MessageActions.test.tsx`

**Interfaces:**
- `TypingIndicator({ character, delayed?: boolean })` 提供 `role="status"` 和可访问文本“对方正在输入”。
- `MessageList` 只渲染 role 为 `user`/`assistant` 的消息；`status === 'streaming'` 时忽略 content/parsed 并渲染 TypingIndicator。

- [ ] **Step 1: 写纯消息视图失败测试**

测试传入 streaming assistant，其中包含思考、maintext、options。断言只出现“对方正在输入”，不存在思考、半成品正文、选项按钮、存储分隔文案和三枚常驻消息操作按钮。sent assistant 只显示最终 `content`。

- [ ] **Step 2: 运行失败测试**

Run: `npm test -- --run src/features/chat/GameMessage.test.tsx src/features/chat/MessageActions.test.tsx --reporter=verbose`

Expected: FAIL，当前流式消息显示 maintext，完成消息显示 OptionList。

- [ ] **Step 3: 实现 TypingIndicator**

使用角色头像和三个固定尺寸圆点。组件在 300ms 后显示视觉气泡，但 `aria-live="polite"` 状态可立即更新；CSS 用 opacity/translateY 动画并在 reduced-motion 下停止。

- [ ] **Step 4: 简化 MessageList**

删除 `ThinkingFold`、`OptionList` 和日期存储分隔。sent assistant 只把 `message.content` 交给 MainTextPane；streaming assistant 只渲染 TypingIndicator。保留 100 条窗口化与返回最新消息。

- [ ] **Step 5: 把消息操作收为单一菜单**

每条消息仅保留一个 `aria-label="更多消息操作"` 的 DotsThree 按钮；点击后显示带唯一 ID 的 popover，再按角色提供编辑、重新回复、分支、删除。按钮在 hover、focus-within 或菜单展开时可见，触屏保持可点击。

- [ ] **Step 6: 简化 Composer**

移除“本轮调用角色卡与 N 本世界书”、字数常驻行、Enter 提示和 Plus 菜单。保留无障碍 label、输入框、发送/停止按钮和草稿状态。

- [ ] **Step 7: 复跑测试并提交**

Run: `npm test -- --run src/features/chat/GameMessage.test.tsx src/features/chat/MessageActions.test.tsx src/App.test.tsx`

Commit: `feat: show only final immersive chat messages`

---

### Task 5: 管理中心视觉、响应式与回归

**Files:**
- Modify: `src/styles/app.css`
- Modify: `src/styles/sillytavern.css`
- Modify: `README.md`
- Test: `src/App.accessibility.test.tsx`
- Test: `src/production-cleanliness.test.ts`

**Interfaces:**
- 管理中心桌面 420–480px，手机 `width: 100vw; height: 100dvh`；不改变聊天主布局宽度。

- [ ] **Step 1: 添加响应式和 reduced-motion 断言**

扩展可访问性测试，确保管理首页所有交互有唯一 ID、二级页面有返回按钮、焦点不会离开 dialog。源码洁净度测试新增旧 `.nav-rail`/`.context-rail` 组件结构和 `ThinkingFold`/`OptionList` 生产导入禁令。

- [ ] **Step 2: 运行失败测试**

Run: `npm test -- --run src/App.accessibility.test.tsx src/production-cleanliness.test.ts --reporter=verbose`

- [ ] **Step 3: 完成视觉令牌与状态**

管理中心首页使用两列入口卡，配置异常同时显示图标、文字和状态点。聊天气泡、顶栏和输入栏使用现有语义令牌；所有 hover/focus/pressed 状态不改变布局尺寸。

- [ ] **Step 4: 更新 README**

说明全窗口沉浸聊天、齿轮管理中心、整条最终回复、不可见/不持久化思维链、没有剧情选项，以及停止时不保存半成品。

- [ ] **Step 5: 全量自动化验证**

Run: `npm test -- --run --reporter=dot`

Expected: 所有测试通过且只发现主工作树的测试文件。

Run: `npm run typecheck`

Expected: exit 0。

Run: `npm run build`

Expected: exit 0，无大于 500kB 的 chunk 警告。

- [ ] **Step 6: 真实浏览器验收**

在全新 IndexedDB 下验证准备态与齿轮入口；导入测试资料或通过测试数据进入会话，验证桌面和 390×844 手机：无左右栏、无横向滚动、齿轮管理中心可达、生成期间只有输入动画、完成后只有最终气泡、控制台无错误。

- [ ] **Step 7: 提交与推送**

Commit: `feat: finish immersive QQ chat experience`

将分支快进合并到 `main`，在合并结果上重跑测试与构建，随后 `git push origin main` 并核对远端 SHA。
