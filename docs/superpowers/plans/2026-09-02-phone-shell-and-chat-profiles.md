# 澄语手机外壳与聊天资料定制 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将澄语桌面聊天收束为实体手机外壳、修复移动端底部输入区，并增加全局玩家资料和当前会话角色显示覆盖。

**Architecture:** 保留单一聊天组件树，由响应式 CSS 决定是否呈现装饰性手机外壳。玩家昵称/头像写入 `AppSettings`，角色备注名/头像写入 `ChatSession`，显示层通过纯函数解析有效资料，API 请求始终继续使用真实角色卡。

**Tech Stack:** React 19、TypeScript、Dexie/IndexedDB、Vitest、Testing Library、Vite、Phosphor Icons、CSS。

**Spec:** `docs/superpowers/specs/2026-09-02-phone-shell-and-chat-profiles-design.md`

## Global Constraints

- 不新增后端接口、云端用户系统、外部字体、图片或动画依赖。
- 桌面聊天内容宽度为 `min(430px, 视口宽度 - 64px)`，高度为 `min(880px, 视口动态高度 - 48px)`。
- 760px 及以下隐藏手机壳并使用动态视口全屏布局。
- 所有核心交互目标至少 44×44px，移动输入字体至少 16px。
- 玩家头像只用于 UI；角色备注名和替换头像只属于当前会话且不进入 LLM 请求。
- 默认迷迭香不得显示隐藏提示、来源、导入时间或删除操作，也不得从控制器删除。
- `游戏显示` 标签必须消失；有效能力重组为“我的资料”和“回复格式”。
- 会话变量保留，且必须继续影响下一轮提示词。
- 每项生产行为先写失败测试，再实施最小改动。

---

### Task 1: 扩展本地资料模型与头像导入边界

**Files:**
- Create: `src/sillytavern/profile-image.ts`
- Create: `src/sillytavern/profile-image.test.ts`
- Modify: `src/sillytavern/types.ts`
- Modify: `src/sillytavern/database.ts`
- Modify: `src/sillytavern/database.test.ts`

**Interfaces:**
- Produces: `readProfileImage(file: File): Promise<string>`；`AppSettings.userAvatar`；`ChatSession.characterDisplayName` 与 `ChatSession.characterAvatar`。
- Consumes: 浏览器 `File`、`FileReader`/`arrayBuffer` 和现有 Dexie 设置合并逻辑。

- [ ] **Step 1: 写头像校验和旧数据迁移失败测试**

```ts
it('accepts PNG/JPEG/WebP profile images and rejects oversized files', async () => {
  await expect(readProfileImage(new File(['x'], 'avatar.png', { type: 'image/png' }))).resolves.toMatch(/^data:image\/png;base64,/)
  await expect(readProfileImage(new File([new Uint8Array(2_000_001)], 'huge.png', { type: 'image/png' }))).rejects.toThrow('不能超过 2MB')
  await expect(readProfileImage(new File(['x'], 'avatar.svg', { type: 'image/svg+xml' }))).rejects.toThrow('仅支持 PNG、JPEG 或 WebP')
})

it('fills an empty player avatar for existing settings', async () => {
  await saveSettings({ ...getEmptyFirstSettings(), userAvatar: undefined } as unknown as AppSettings)
  const restored = await getSettings()
  expect(restored?.userAvatar ?? '').toBe('')
})
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- --run src/sillytavern/profile-image.test.ts src/sillytavern/database.test.ts --reporter=verbose`

Expected: FAIL，类型和 `readProfileImage` 尚不存在。

- [ ] **Step 3: 增加类型、数据库版本和头像读取器**

```ts
export interface AppSettings {
  userName: string
  userAvatar: string
}

export interface ChatSession {
  characterDisplayName?: string
  characterAvatar?: string
}

export const MAX_PROFILE_IMAGE_BYTES = 2_000_000
export async function readProfileImage(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('头像仅支持 PNG、JPEG 或 WebP')
  if (file.size > MAX_PROFILE_IMAGE_BYTES) throw new Error('头像不能超过 2MB')
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  return `data:${file.type};base64,${btoa(binary)}`
}
```

将 `DB_VERSION` 与 Dexie schema 提升到 6；迁移设置时执行 `setting.userAvatar ??= ''`，`DEFAULT_SETTINGS.userAvatar` 为 `''`。

- [ ] **Step 4: 复跑测试并提交**

Run: `npm test -- --run src/sillytavern/profile-image.test.ts src/sillytavern/database.test.ts`

Expected: PASS。

Commit: `feat: add persistent chat profile fields`

---

### Task 2: 增加会话显示资料解析与控制器操作

**Files:**
- Create: `src/sillytavern/chat-profile.ts`
- Create: `src/sillytavern/chat-profile.test.ts`
- Modify: `src/hooks/useSillytavern.ts`
- Modify: `src/hooks/useSillytavern.test.tsx`

**Interfaces:**
- Consumes: Task 1 的 `AppSettings.userAvatar`、`ChatSession.characterDisplayName` 和 `ChatSession.characterAvatar`。
- Produces: `resolveChatProfile(character, chat, settings)`；`updateActiveChatProfile(patch)`；内置角色删除保护。

- [ ] **Step 1: 写显示回退、会话隔离和删除保护失败测试**

```ts
it('resolves global player data and per-chat character overrides', () => {
  expect(resolveChatProfile(character, { ...chat, characterDisplayName: '小迷', characterAvatar: 'data:image/png;base64,eA==' }, { ...settings, userName: '博士', userAvatar: 'data:image/png;base64,eQ==' })).toMatchObject({
    userName: '博士', userAvatar: 'data:image/png;base64,eQ==', characterName: '小迷', characterAvatar: 'data:image/png;base64,eA=='
  })
})

it('updates only the active chat display profile', async () => {
  await act(() => result.current.updateActiveChatProfile({ characterDisplayName: '小迷', characterAvatar: 'data:image/png;base64,eA==' }))
  expect(result.current.activeChat).toMatchObject({ characterDisplayName: '小迷' })
  expect(result.current.activeCharacter?.name).toBe('迷迭香')
})

it('refuses to delete the bundled character', async () => {
  await act(() => result.current.deleteCharacter(BUNDLED_CHARACTER_ID))
  expect(result.current.characters.some(item => item.id === BUNDLED_CHARACTER_ID)).toBe(true)
})
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- --run src/sillytavern/chat-profile.test.ts src/hooks/useSillytavern.test.tsx --reporter=verbose`

Expected: FAIL，解析器和控制器操作尚不存在。

- [ ] **Step 3: 实现解析器和会话写入**

```ts
export function resolveChatProfile(character: CharacterCard, chat: ChatSession, settings: AppSettings) {
  return {
    userName: settings.userName.trim() || '用户',
    userAvatar: settings.userAvatar,
    characterName: chat.characterDisplayName?.trim() || character.name,
    characterAvatar: chat.characterAvatar || character.avatar,
  }
}

const updateActiveChatProfile = useCallback(async (patch: Pick<ChatSession, 'characterDisplayName' | 'characterAvatar'>) => {
  if (!activeChat) return
  await replaceChat({ ...activeChat, ...patch, updatedAt: Date.now() })
}, [activeChat, replaceChat])
```

在 `deleteCharacter` 最前面判断 `characterId === BUNDLED_CHARACTER_ID` 并直接返回。新建会话不写覆盖字段；分支依靠现有对象展开继承覆盖字段。API 组装继续使用 `activeCharacter.name`，不得改成解析后的备注名。

- [ ] **Step 4: 复跑测试并提交**

Run: `npm test -- --run src/sillytavern/chat-profile.test.ts src/hooks/useSillytavern.test.tsx`

Expected: PASS。

Commit: `feat: support per-chat display profiles`

---

### Task 3: 重组设置、精简默认角色并增加当前聊天资料页

**Files:**
- Create: `src/features/chat-profile/ChatProfilePanel.tsx`
- Create: `src/features/chat-profile/ChatProfilePanel.test.tsx`
- Modify: `src/features/settings/SettingsPanel.tsx`
- Modify: `src/features/settings/SettingsModal.test.tsx`
- Modify: `src/features/character/CharacterPanel.tsx`
- Modify: `src/features/panels.test.tsx`
- Modify: `src/features/variables/VariablesPanel.tsx`
- Modify: `src/components/ManagementCenter.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles/sillytavern.css`
- Modify: `src/styles/app.css`

**Interfaces:**
- Consumes: Task 1 的 `readProfileImage` 和 Task 2 的 `updateActiveChatProfile`。
- Produces: 管理中心 `chat-profile` section；设置页 `profile`/`format` tabs；严格区分内置和导入角色的操作。

- [ ] **Step 1: 写管理面板行为失败测试**

```tsx
expect(screen.queryByText('内置角色设定已隐藏')).not.toBeInTheDocument()
expect(screen.queryByText('来源文件')).not.toBeInTheDocument()
expect(screen.queryByText('导入时间')).not.toBeInTheDocument()
expect(screen.queryByRole('button', { name: '删除角色卡' })).not.toBeInTheDocument()

await user.click(screen.getByRole('button', { name: 'API 与设置' }))
expect(screen.getByRole('button', { name: '我的资料' })).toBeInTheDocument()
expect(screen.getByRole('button', { name: '回复格式' })).toBeInTheDocument()
expect(screen.queryByRole('button', { name: '游戏显示' })).not.toBeInTheDocument()
```

在导入角色场景中额外断言来源、导入时间和删除按钮仍存在。为当前聊天页断言备注输入、头像选择、恢复角色卡资料按钮均存在。

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- --run src/features/panels.test.tsx src/features/settings/SettingsModal.test.tsx src/features/chat-profile/ChatProfilePanel.test.tsx --reporter=verbose`

Expected: FAIL，旧内置提示与“游戏显示”仍存在。

- [ ] **Step 3: 实现设置重组和头像控件**

将设置标签改为：

```ts
type Tab = 'profile' | 'primary' | 'secondary' | 'format' | 'data'
const tabs = [['profile', '我的资料'], ['primary', '聊天服务'], ['secondary', '次 API'], ['format', '回复格式'], ['data', '本地数据']] as const
```

“我的资料”编辑 `settings.userName` 与 `settings.userAvatar`；文件变更调用 `readProfileImage`，异常通过 `onNotice('error', '头像未更新', message)` 显示。原 `customTags` 和 `formatPromptTemplate` 原样迁至“回复格式”。

- [ ] **Step 4: 实现角色分支渲染与当前聊天页**

内置角色分支只渲染 `character-hero` 和启用按钮；`file-meta`、详情与删除按钮全部放进 `!isBundledCharacter` 分支。新增 `ChatProfilePanel`：备注名为空表示回退，头像可选择/移除，恢复按钮同时写入两个空字符串。

管理中心新增：

```ts
type ManagementSection = 'home' | 'chat-profile' | 'character' | 'worldbook' | 'presets' | 'variables' | 'settings' | 'data'
```

入口文案为“当前聊天 / 设置备注与本会话头像”。会话变量入口辅助文案改为“高级：查看会进入提示词的运行数据”；无会话时显示明确空状态而不是可编辑的 `{}`。

- [ ] **Step 5: 复跑测试并提交**

Run: `npm test -- --run src/features/panels.test.tsx src/features/settings/SettingsModal.test.tsx src/features/chat-profile/ChatProfilePanel.test.tsx src/App.accessibility.test.tsx`

Expected: PASS。

Commit: `feat: add profile controls to management center`

---

### Task 4: 在聊天界面应用双方资料

**Files:**
- Modify: `src/components/AppShell.tsx`
- Modify: `src/components/ChatHeader.tsx`
- Modify: `src/components/MessageList.tsx`
- Modify: `src/components/Composer.tsx`
- Modify: `src/App.tsx`
- Modify: `src/features/chat/GameMessage.test.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/styles/app.css`

**Interfaces:**
- Consumes: Task 2 的 `resolveChatProfile`。
- Produces: 顶栏、气泡、消息元信息和输入提示中的最终显示资料。

- [ ] **Step 1: 写聊天资料渲染失败测试**

```tsx
render(<MessageList messages={messages} character={character} chat={overriddenChat} settings={{ ...settings, userName: '博士', userAvatar }} {...actions} />)
expect(screen.getByText(/博士 ·/)).toBeInTheDocument()
expect(screen.getByText(/小迷 ·/)).toBeInTheDocument()
expect(screen.getByAltText('博士的头像')).toHaveAttribute('src', userAvatar)
expect(screen.getByAltText('小迷的头像')).toHaveAttribute('src', characterAvatar)
```

集成测试还要捕获 `/api/chat` 请求并断言 `characterName === '迷迭香'`，而不是备注名“小迷”。

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- --run src/features/chat/GameMessage.test.tsx src/App.test.tsx --reporter=verbose`

Expected: FAIL，玩家没有头像，显示仍使用角色卡名称。

- [ ] **Step 3: 将解析后的资料传给聊天组件**

`AppShell` 内计算一次资料，向头部、消息区和输入框传递字符串值。`MessageList` 为双方非连续组渲染固定 36×36 头像；缺省时使用 `UserCircle` 回退。玩家元信息使用玩家昵称，不再写死“你”。

```tsx
const profile = resolveChatProfile(activeCharacter, activeChat, settings)
<ChatHeader characterName={profile.characterName} characterAvatar={profile.characterAvatar} />
<MessageList profile={profile} />
<Composer characterName={profile.characterName} />
```

API 构造部分保持不变，并由测试锁定真实名称。

- [ ] **Step 4: 复跑测试并提交**

Run: `npm test -- --run src/features/chat/GameMessage.test.tsx src/App.test.tsx src/hooks/useSillytavern.test.tsx`

Expected: PASS。

Commit: `feat: show custom profiles in chat`

---

### Task 5: 实现桌面手机壳与移动端固定输入骨架

**Files:**
- Modify: `index.html`
- Modify: `README.md`
- Modify: `src/components/AppShell.tsx`
- Modify: `src/styles/global.css`
- Modify: `src/styles/app.css`
- Modify: `src/App.test.tsx`
- Modify: `src/App.accessibility.test.tsx`

**Interfaces:**
- Consumes: 现有 `chat-column` 三行布局。
- Produces: `phone-device`、`phone-screen` 和装饰层；760px 以下全屏动态视口规则。

- [ ] **Step 1: 写结构与产品标题失败测试**

```tsx
expect(document.title).toBe('澄语')
expect(document.querySelector('#phone-device')).toBeInTheDocument()
expect(document.querySelector('#phone-screen')).toContainElement(screen.getByRole('main'))
```

为手机壳装饰断言 `aria-hidden="true"`，聊天 main 仍具有唯一语义入口。

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- --run src/App.test.tsx src/App.accessibility.test.tsx --reporter=verbose`

Expected: FAIL，页面标题仍包含“角色聊天”，外壳节点不存在。

- [ ] **Step 3: 实现语义结构和桌面外壳**

```tsx
<div className="app-stage">
  <div id="phone-device" className="phone-device">
    <div className="phone-hardware" aria-hidden="true"><i className="phone-speaker" /><i className="phone-camera" /></div>
    <div id="phone-screen" className="phone-screen">
      <div id="immersive-chat-shell" className="app-window immersive-chat-shell">...</div>
    </div>
    <i className="phone-side-key phone-side-key-volume" aria-hidden="true" />
    <i className="phone-side-key phone-side-key-power" aria-hidden="true" />
  </div>
</div>
```

桌面 `.phone-device` 使用规格中的精确宽高、18–22px 深色边框、36–44px 外圆角和两层阴影；内屏 `overflow:hidden`，装饰层 `pointer-events:none`。

- [ ] **Step 4: 实现移动端视口和输入区约束**

```css
@media (max-width: 760px) {
  html, body, #root, .app-stage, .phone-device, .phone-screen { width: 100%; height: 100dvh; min-height: 100svh; }
  .app-stage { position: fixed; inset: 0; padding: 0; }
  .phone-device { border: 0; border-radius: 0; box-shadow: none; }
  .phone-hardware, .phone-side-key { display: none; }
  .chat-column { height: 100%; grid-template-rows: auto minmax(0, 1fr) auto; }
  .composer-wrap { padding-bottom: max(9px, env(safe-area-inset-bottom)); }
  .composer textarea { font-size: 16px; }
}
```

同时保证 `.message-region`、`.message-scroll`、`.chat-column` 都有 `min-height:0`，仅 `.message-scroll` 使用 `overflow-y:auto`。

- [ ] **Step 5: 更新标题、复跑测试并提交**

将 `<title>` 改为 `澄语`，README 标题改为 `# 澄语`。

Run: `npm test -- --run src/App.test.tsx src/App.accessibility.test.tsx`

Expected: PASS。

Commit: `feat: frame desktop chat as a phone`

---

### Task 6: 完整回归、真实浏览器验收与交付

**Files:**
- Modify: 前述测试或样式文件，仅用于修复验收中发现的明确缺陷。

**Interfaces:**
- Consumes: Tasks 1–5 的完整实现。
- Produces: 可部署构建、浏览器证据、已推送提交。

- [ ] **Step 1: 运行完整自动化验证**

Run: `npm test`

Expected: 全部 PASS。

Run: `npm run typecheck`

Expected: exit 0。

Run: `npm run build`

Expected: exit 0 且生成 `dist`。

- [ ] **Step 2: 启动生产预览并做桌面视觉验收**

Run: `npm run preview -- --host 127.0.0.1`

在 1440×1000 浏览器视口确认：手机壳完整可见、内屏不溢出、输入框在底部、消息可滚动、历史与齿轮可操作、管理中心覆盖层不被手机裁切。

- [ ] **Step 3: 做移动与横屏视觉验收**

在 375×812、390×844、844×390 三个视口确认：无手机壳、无横向滚动、空/短会话输入框处于底部、安全区不遮挡按钮、设置面板可滚动、头像上传控件可触达。

- [ ] **Step 4: 验收资料隔离与持久化**

设置玩家昵称/头像和当前会话备注/头像，刷新确认保持；新建另一个会话确认没有继承前一会话覆盖；创建分支确认继承；检查网络请求确认真实角色名仍为“迷迭香”；导出备份确认包含资料字段但不包含 API Key。

- [ ] **Step 5: 运行最终清洁检查、提交修复并推送**

Run: `git diff --check`

Run: `git status --short`

若验收产生修复，提交为 `fix: polish responsive phone chat`。然后执行：

Run: `git push origin main`

Expected: 远端 `main` 指向本地最终提交。
