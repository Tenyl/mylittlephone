# My Little Phone SillyTavern Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the seeded mock chat prototype with an empty-first, browser-only SillyTavern-compatible character chat application that supports PNG/V2 character cards, lorebooks, presets, dual APIs, game tags, variables, history editing, rollback, and branching.

**Architecture:** Dexie/IndexedDB becomes the only persisted domain store. The copied `sillytavern-web` React engine is extended with a character table and character-aware prompt assembly, while the existing polished QQ-style shell is retained as the presentation layer. A single `useSillytavern` controller exposes readiness, content libraries, active chat, streaming generation, modal state, and in-app feedback.

**Tech Stack:** React 19, TypeScript 5.9 strict mode, Vite 7, Vitest 3, Testing Library, Dexie, fake-indexeddb, Phosphor Icons, native Fetch/ReadableStream APIs.

**Spec:** `docs/superpowers/specs/2026-09-01-sillytavern-integration-design.md`

## Global Constraints

- Frontend-only: do not add a server, proxy, remote database, or backend secret storage.
- Production initialization contains zero characters, lorebooks, presets, chats, and messages.
- Character imports support SillyTavern PNG and Character Card V2 JSON.
- Game mode is enabled with `maintext`, `option`, `sum`, `vars`, `thinking`, and `think` tags.
- API mode defaults to dual; schema-first remains disabled.
- Do not use Emoji or browser-native `alert`, `confirm`, or `prompt`.
- Keep all user-facing game UI in Chinese except non-game brand marks and unavoidable protocol field names.
- All interactive IDs are unique and descriptive; icon-only controls have accessible names.
- Preserve the existing QQ-style visual direction and use Phosphor icons.
- Run `npm test`, `npm run typecheck`, `npm run build`, and real-browser desktop/mobile checks before completion.

---

### Task 1: Install and baseline the SillyTavern engine

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/sillytavern/types.ts`
- Create: `src/sillytavern/database.ts`
- Create: `src/sillytavern/importer.ts`
- Create: `src/sillytavern/lorebook-engine.ts`
- Create: `src/sillytavern/prompt-assembler.ts`
- Create: `src/sillytavern/stream-parser.ts`
- Create: `src/sillytavern/vars-merger.ts`
- Create: `src/sillytavern/variables.ts`
- Create: `src/sillytavern/api-router.ts`
- Create: `src/sillytavern/api-tools.ts`
- Create: `src/sillytavern/editor-utils.ts`
- Create: `src/sillytavern/index.ts`
- Create: `src/sillytavern/*.test.ts`
- Create: `src/hooks/useSillytavern.ts`
- Create: `src/hooks/useApiRouter.ts`
- Create: `src/hooks/useStreamParser.ts`
- Create: `src/components/SillyTavern/*.tsx`

**Interfaces:**
- Consumes: the React v3 templates from `C:/Users/Ya/.codex/skills/sillytavern-web/templates/react/`.
- Produces: exported `db`, `initializeDatabase`, `importSillyTavernLorebook`, `importSillyTavernPreset`, `buildPromptMessages`, `createStreamParser`, `mergeVariables`, `routeApiRequest`, and editor utilities with the exact copied template signatures.

- [ ] **Step 1: Copy the required React template trees without changing behavior**

Copy every file from the skill's `sillytavern`, `hooks`, and `components/SillyTavern` template directories to the matching `src` directories. Do not omit tests or UI components; later tasks adapt them.

- [ ] **Step 2: Install runtime and test dependencies**

Run: `npm install dexie && npm install -D fake-indexeddb`

Expected: `package.json` contains `dexie` under dependencies and `fake-indexeddb` under devDependencies.

- [ ] **Step 3: Run copied engine tests**

Run: `npm test -- src/sillytavern`

Expected: copied lorebook, importer, prompt, stream parser, variable, router, and editor tests pass before project-specific changes.

- [ ] **Step 4: Commit the baseline**

```bash
git add package.json package-lock.json src/sillytavern src/hooks src/components/SillyTavern
git commit -m "feat: add SillyTavern frontend engine"
```

### Task 2: Make persistence empty-first and remove legacy demo hydration

**Files:**
- Modify: `src/sillytavern/types.ts`
- Modify: `src/sillytavern/database.ts`
- Create: `src/sillytavern/database.test.ts`
- Create: `src/sillytavern/legacy-cleanup.ts`
- Create: `src/sillytavern/legacy-cleanup.test.ts`

**Interfaces:**
- Consumes: copied `SillyTavernDB`, `AppSettings`, and `DEFAULT_SETTINGS`.
- Produces: `getEmptyFirstSettings(): AppSettings`, `initializeDatabase(): Promise<void>`, and `removeLegacyDemoState(storage: Storage): void`.

- [ ] **Step 1: Write failing empty-database tests**

```ts
it('initializes settings without seeding playable content', async () => {
  await initializeDatabase()
  expect(await db.characters.count()).toBe(0)
  expect(await db.lorebooks.count()).toBe(0)
  expect(await db.presets.count()).toBe(0)
  expect(await db.chats.count()).toBe(0)
  expect(await db.messages.count()).toBe(0)
  expect((await db.settings.get('app'))?.apiMode).toBe('dual')
})
```

Add a migration test proving only `luma-character-chat:v1` is removed and unrelated localStorage keys survive.

- [ ] **Step 2: Run tests and verify the seeded template fails**

Run: `npm test -- src/sillytavern/database.test.ts src/sillytavern/legacy-cleanup.test.ts`

Expected: FAIL because the copied database seeds a preset and has no character table or legacy cleanup.

- [ ] **Step 3: Add the character store and neutral settings**

Extend the Dexie schema with `characters: 'id, name, importedAt'`. Add `activeCharacterId?: string`, `activeLorebookId?: string`, `activePresetId?: string`, and `activeChatId?: string` to settings. Initialize only a neutral `settings` row with empty API URL/key/model, game UI mode, dual API mode, six tags, and schema-first disabled. Remove template preset seeding.

- [ ] **Step 4: Add one-time legacy cleanup**

```ts
export const LEGACY_STORAGE_KEY = 'luma-character-chat:v1'

export function removeLegacyDemoState(storage: Storage): void {
  storage.removeItem(LEGACY_STORAGE_KEY)
}
```

Call it once during boot before IndexedDB initialization. Do not call `clearAllData()` during ordinary startup.

- [ ] **Step 5: Run persistence tests**

Run: `npm test -- src/sillytavern/database.test.ts src/sillytavern/legacy-cleanup.test.ts`

Expected: PASS with all playable tables empty.

- [ ] **Step 6: Commit the empty-first store**

```bash
git add src/sillytavern/types.ts src/sillytavern/database.ts src/sillytavern/database.test.ts src/sillytavern/legacy-cleanup.ts src/sillytavern/legacy-cleanup.test.ts
git commit -m "feat: initialize an empty SillyTavern library"
```

### Task 3: Import Character Card V2 JSON and SillyTavern PNG

**Files:**
- Create: `src/sillytavern/character-importer.ts`
- Create: `src/sillytavern/character-importer.test.ts`
- Create: `src/test/fixtures/character-v2.json`
- Create: `src/test/fixtures/character-v2.png`
- Modify: `src/sillytavern/types.ts`
- Modify: `src/sillytavern/index.ts`
- Modify: `src/components/FileImportControl.tsx`

**Interfaces:**
- Consumes: browser `File`, `ArrayBuffer`, and the `CharacterCard` Dexie type.
- Produces: `parseCharacterCardV2(raw: unknown, sourceFile: string): CharacterCard`, `extractCharacterJsonFromPng(buffer: ArrayBuffer): unknown`, and `importCharacterFile(file: File): Promise<CharacterCard>`.

- [ ] **Step 1: Write failing V2 and PNG importer tests**

```ts
it('normalizes a wrapped V2 card', () => {
  const card = parseCharacterCardV2(fixture, 'card.json')
  expect(card.name).toBe('测试角色')
  expect(card.firstMes).toBe('你好。')
  expect(card.spec).toBe('chara_card_v2')
})

it('extracts chara metadata and uses the PNG as avatar', async () => {
  const card = await importCharacterFile(pngFile)
  expect(card.name).toBe('测试角色')
  expect(card.avatar.startsWith('data:image/png;base64,')).toBe(true)
})
```

Also test missing `chara` chunks, malformed Base64, wrong extensions, files over the size limit, and preservation of optional V2 extension fields.

- [ ] **Step 2: Run importer tests and verify failure**

Run: `npm test -- src/sillytavern/character-importer.test.ts`

Expected: FAIL because the importer functions do not exist.

- [ ] **Step 3: Implement strict JSON normalization**

Support both `{ spec, data }` and common direct `{ data }` wrappers. Require a non-empty `data.name`; normalize string arrays and alternate greetings; keep unknown extension data as JSON-compatible values.

- [ ] **Step 4: Implement PNG chunk parsing**

Validate the eight-byte PNG signature, iterate chunks using the declared big-endian lengths, parse `tEXt`/`iTXt` entries whose keyword is `chara`, decode the Base64 payload as UTF-8, then pass it through `parseCharacterCardV2`. Reject truncated or missing metadata without partially writing to Dexie.

- [ ] **Step 5: Make the file control accept binary files**

Change `FileImportControl` to pass the selected `File` rather than only text and accept a caller-provided `accept` string. Keep a unique input ID and expose loading/error state without placeholder-only labeling.

- [ ] **Step 6: Run importer tests**

Run: `npm test -- src/sillytavern/character-importer.test.ts src/services/importers.test.ts`

Expected: PASS for PNG, V2 JSON, and legacy control regression coverage.

- [ ] **Step 7: Commit character import support**

```bash
git add src/sillytavern src/components/FileImportControl.tsx src/test/fixtures
git commit -m "feat: import SillyTavern character cards"
```

### Task 4: Inject character cards into prompt assembly and enforce readiness

**Files:**
- Modify: `src/sillytavern/prompt-assembler.ts`
- Modify: `src/sillytavern/prompt-assembler.test.ts`
- Create: `src/sillytavern/readiness.ts`
- Create: `src/sillytavern/readiness.test.ts`

**Interfaces:**
- Consumes: `CharacterCard`, `Preset`, `Lorebook | undefined`, `ChatMessage[]`, `ChatVariables`, and `AppSettings`.
- Produces: `buildPromptMessages({ character, preset, lorebook, messages, variables, settings }): ApiMessage[]` and `getSetupReadiness(input): SetupReadiness`.

- [ ] **Step 1: Write failing character prompt tests**

Assert that the system message includes description, personality, scenario, system prompt, and post-history instructions; that `{{char}}` and `{{user}}` are replaced; and that `firstMes` is only inserted when creating a new chat, not on every generation.

- [ ] **Step 2: Write failing readiness tests**

```ts
expect(getSetupReadiness(empty)).toEqual(expect.objectContaining({ canStartChat: false }))
expect(getSetupReadiness({ ...ready, secondaryApi: null }).steps.secondaryApi.status).toBe('missing')
expect(getSetupReadiness(ready).canSend).toBe(true)
```

Require a character, preset, primary base URL, primary API key, and primary model for sending. Worldbooks remain optional. Expose secondary API absence separately for dual-mode variable tasks.

- [ ] **Step 3: Run tests and verify failure**

Run: `npm test -- src/sillytavern/prompt-assembler.test.ts src/sillytavern/readiness.test.ts`

Expected: FAIL because copied prompt assembly has no character input and no readiness service.

- [ ] **Step 4: Implement character-aware assembly and readiness**

Preserve copied prompt order semantics and lorebook insertion positions. Add a dedicated character system block rather than concatenating raw JSON. Return structured readiness reasons so UI copy never guesses state.

- [ ] **Step 5: Run tests**

Run: `npm test -- src/sillytavern/prompt-assembler.test.ts src/sillytavern/readiness.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit prompt integration**

```bash
git add src/sillytavern/prompt-assembler.ts src/sillytavern/prompt-assembler.test.ts src/sillytavern/readiness.ts src/sillytavern/readiness.test.ts
git commit -m "feat: assemble character-aware prompts"
```

### Task 5: Replace the mock controller with the persisted SillyTavern controller

**Files:**
- Modify: `src/hooks/useSillytavern.ts`
- Create: `src/hooks/useSillytavern.test.tsx`
- Modify: `src/hooks/useApiRouter.ts`
- Modify: `src/hooks/useStreamParser.ts`
- Modify: `src/sillytavern/database.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: database repositories, readiness, prompt assembly, API router, stream parser, variable merger, and editor utilities.
- Produces: `useSillytavern(): SillyTavernController` exposing `status`, `settings`, `characters`, `lorebooks`, `presets`, `chats`, `activeCharacter`, `activeLorebook`, `activePreset`, `activeChat`, `messages`, `variables`, `readiness`, import/select/delete CRUD, `createChat`, `sendMessage`, `stopGeneration`, `editAndRegenerate`, `deleteFromMessage`, `branchFromMessage`, and `showToast`.

- [ ] **Step 1: Write failing controller tests**

Use `fake-indexeddb` and mocked `fetch` to prove: boot is empty; imports become active; a chat persists; streaming chunks update one assistant message; AbortController marks an interrupted reply; and refresh-style remount restores active selections.

- [ ] **Step 2: Run controller tests and verify failure**

Run: `npm test -- src/hooks/useSillytavern.test.tsx`

Expected: FAIL because the copied hook lacks characters and the app still calls the mock controller.

- [ ] **Step 3: Implement a single boot and CRUD pipeline**

Initialize once, run legacy cleanup, load all tables, and keep active IDs valid when records are deleted. Mutations write Dexie first, then update React state from the committed result. Never seed or auto-create content.

- [ ] **Step 4: Implement generation and message editing**

Route main generation through the configured primary API. Feed chunks through one parser instance, persist raw/tagged fields without rendering tags, merge variable updates after completion, and preserve partial output on abort. Use copied editor utilities for edit/regenerate, delete-from-point, and branch.

- [ ] **Step 5: Switch `App.tsx` to the new controller**

Remove all imports from `useChatApp`, old domain reducer types, and mock generation. Make boot loading, persistence failure, setup, and ready-chat states explicit.

- [ ] **Step 6: Run controller tests**

Run: `npm test -- src/hooks/useSillytavern.test.tsx src/sillytavern`

Expected: PASS.

- [ ] **Step 7: Commit the controller migration**

```bash
git add src/hooks src/sillytavern src/App.tsx
git commit -m "feat: run chat from persisted SillyTavern state"
```

### Task 6: Build the empty-state onboarding and content libraries

**Files:**
- Create: `src/features/onboarding/SetupGuide.tsx`
- Create: `src/features/onboarding/SetupGuide.test.tsx`
- Modify: `src/features/character/CharacterPanel.tsx`
- Modify: `src/features/worldbook/WorldBookPanel.tsx`
- Modify: `src/features/presets/PresetPanel.tsx`
- Modify: `src/components/AppShell.tsx`
- Modify: `src/components/FileImportControl.tsx`
- Modify: `src/styles/app.css`

**Interfaces:**
- Consumes: `SetupReadiness` and controller CRUD operations.
- Produces: accessible setup actions and empty/list/detail states for characters, lorebooks, and presets.

- [ ] **Step 1: Write failing onboarding tests**

Render with empty collections and assert Chinese copy for the three preparation steps, PNG/JSON accept types, disabled start action, and direct buttons that open character, preset, and API settings panels. Render ready data and assert the guide is replaced by chat.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- src/features/onboarding/SetupGuide.test.tsx`

Expected: FAIL because the onboarding component does not exist.

- [ ] **Step 3: Implement the setup guide**

Use Phosphor `IdentificationCard`, `SlidersHorizontal`, `BookOpenText`, `PlugsConnected`, `CheckCircle`, and `WarningCircle`. Give every button a 44px minimum hit area, visible label, unique ID, pressed/loading state, and recovery-focused helper text.

- [ ] **Step 4: Convert panels into empty-aware libraries**

Each library shows an import CTA when empty and a selectable list plus details when populated. Add in-app confirmation before delete. Character import calls `importCharacterFile`; lorebook/preset imports call the copied SillyTavern importers instead of the legacy custom schema.

- [ ] **Step 5: Run onboarding and panel tests**

Run: `npm test -- src/features/onboarding src/features/panels.test.tsx`

Expected: PASS with no dependency on demo fixtures.

- [ ] **Step 6: Commit content libraries**

```bash
git add src/features src/components/AppShell.tsx src/components/FileImportControl.tsx src/styles/app.css
git commit -m "feat: add empty-first setup and libraries"
```

### Task 7: Integrate game-mode messages, options, variables, history, and branches

**Files:**
- Modify: `src/components/MessageList.tsx`
- Modify: `src/components/Composer.tsx`
- Modify: `src/components/SillyTavern/MainTextPane.tsx`
- Modify: `src/components/SillyTavern/OptionList.tsx`
- Modify: `src/components/SillyTavern/ThinkingFold.tsx`
- Modify: `src/components/SillyTavern/HistoryDrawer.tsx`
- Modify: `src/components/SillyTavern/VariablesModal.tsx`
- Create: `src/features/chat/GameMessage.test.tsx`
- Create: `src/features/chat/MessageActions.test.tsx`
- Modify: `src/styles/app.css`

**Interfaces:**
- Consumes: parsed assistant message fields, controller message actions, and active chat variables.
- Produces: game-mode rendering and operable edit/regenerate/delete/branch controls.

- [ ] **Step 1: Write failing rendering tests**

Assert `maintext` renders in the assistant bubble, options render as numbered buttons, thinking is folded by default, raw tags are absent, selecting an option sends its text, and free input remains available.

- [ ] **Step 2: Write failing history action tests**

Assert editing a user message asks for confirmation before truncation, delete-from-point reports the number of affected messages, branching names the new chat and retains messages through the selected point, and focus returns to the originating action after modal close.

- [ ] **Step 3: Run tests and verify failure**

Run: `npm test -- src/features/chat`

Expected: FAIL because the existing message list only renders plain mock messages.

- [ ] **Step 4: Adapt the copied game components**

Remove inline styles and Unicode disclosure glyphs. Use semantic buttons with Phosphor icons, CSS tokens, `aria-expanded`, and `aria-controls`. Keep animation to opacity/transform and disable it under reduced motion.

- [ ] **Step 5: Connect message actions and variables**

Use controlled in-app dialogs for edit text, branch name, and destructive confirmation. Replace all copied `prompt`, `confirm`, and `alert` calls. Variables modal validates JSON-like values inline and persists only on successful parsing.

- [ ] **Step 6: Add long-list windowing**

Window message rendering once the active chat exceeds 100 messages while keeping the active streaming message and scroll anchor mounted. Add a test asserting fewer than 100 message rows are present for a 500-message fixture.

- [ ] **Step 7: Run chat interaction tests**

Run: `npm test -- src/features/chat src/App.accessibility.test.tsx`

Expected: PASS.

- [ ] **Step 8: Commit game interactions**

```bash
git add src/components src/features/chat src/styles/app.css
git commit -m "feat: add game-mode chat history controls"
```

### Task 8: Rebuild settings, backups, and API feedback as in-app UI

**Files:**
- Modify: `src/components/SillyTavern/SettingsModal.tsx`
- Modify: `src/components/SillyTavern/LorebookModal.tsx`
- Modify: `src/components/SillyTavern/PresetModal.tsx`
- Modify: `src/components/SillyTavern/LorebookEditorModal.tsx`
- Modify: `src/components/SillyTavern/EntryForm.tsx`
- Modify: `src/components/SillyTavern/PromptOrderEditor.tsx`
- Modify: `src/components/SillyTavern/Toast.tsx`
- Modify: `src/components/ConfirmDialog.tsx`
- Create: `src/components/FormDialog.tsx`
- Create: `src/features/settings/SettingsModal.test.tsx`
- Modify: `src/styles/app.css`

**Interfaces:**
- Consumes: controller settings/data actions, `fetchModels`, `testConnection`, export/import helpers, and shared feedback state.
- Produces: focus-managed settings and management dialogs with zero browser-native dialogs.

- [ ] **Step 1: Write failing settings tests**

Test six tabs, masked API keys, dual mode default, model list loading, inline connection errors, secondary configuration, tag editing, secret-free backup export, import impact confirmation, double-confirm full clear, Escape close, focus trap, and trigger focus restoration.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- src/features/settings/SettingsModal.test.tsx`

Expected: FAIL because copied components use inline styles and browser-native dialogs.

- [ ] **Step 3: Replace native prompts with controlled dialog state**

Use `ConfirmDialog` for destructive actions and `FormDialog` for tag names, book names, preset names, and edits. Errors appear beneath the related field with `aria-describedby`; Toast uses `role="status"`/`aria-live="polite"` and never steals focus.

- [ ] **Step 4: Secure backup behavior**

Strip `apiKey` from primary and secondary settings on export. On import, preserve the user's current keys unless they explicitly clear them. Show record counts before overwrite and refresh React state without asking the user to reload the page.

- [ ] **Step 5: Apply the QQ-style visual system**

Replace inline colors with semantic CSS variables, use the existing glass panel/elevation scale, keep the messenger blue/online green palette, and ensure inputs use visible labels and 16px mobile type.

- [ ] **Step 6: Run settings tests**

Run: `npm test -- src/features/settings src/App.accessibility.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit management UI**

```bash
git add src/components/SillyTavern src/components/ConfirmDialog.tsx src/components/FormDialog.tsx src/features/settings src/styles/app.css
git commit -m "feat: add secure in-app SillyTavern settings"
```

### Task 9: Remove the obsolete mock domain and enforce production cleanliness

**Files:**
- Delete: `src/domain/demoData.ts`
- Delete: `src/domain/chatReducer.ts`
- Delete: `src/domain/chatReducer.test.ts`
- Delete: `src/hooks/useChatApp.ts`
- Delete: `src/services/mockLlm.ts`
- Delete: `src/services/mockLlm.test.ts`
- Delete: `src/services/storage.ts`
- Delete: `src/services/storage.test.ts`
- Replace or delete: `src/domain/types.ts`
- Modify: `src/App.test.tsx`
- Modify: `src/App.accessibility.test.tsx`
- Create: `src/production-cleanliness.test.ts`

**Interfaces:**
- Consumes: final app and source tree.
- Produces: one domain implementation with no production demo content or mock generation path.

- [ ] **Step 1: Write a failing production-cleanliness test**

Read the production source manifest and assert forbidden modules/names are absent: `demoData`, `demoCharacter`, `demoMessages`, `demoPresets`, `demoWorldBook`, `mockLlm`, `streamReply`, and `luma-character-chat:v1` outside `legacy-cleanup.ts` and its test.

- [ ] **Step 2: Run the cleanliness test and verify failure**

Run: `npm test -- src/production-cleanliness.test.ts`

Expected: FAIL while legacy modules remain.

- [ ] **Step 3: Delete legacy modules and update tests**

Remove the listed files after all imports have moved to `src/sillytavern`. Rewrite app tests around empty startup, imports, and persisted chats; do not retain old fixtures in production files.

- [ ] **Step 4: Scan prohibited UI patterns**

Run: `rg -n "alert\(|confirm\(|prompt\(|[\\x{1F300}-\\x{1FAFF}]" src --glob '!*.test.*'`

Expected: no matches.

- [ ] **Step 5: Run all tests**

Run: `npm test`

Expected: all test files pass.

- [ ] **Step 6: Commit the cleanup**

```bash
git add -A src
git commit -m "refactor: remove seeded mock chat state"
```

### Task 10: Complete build and real-browser acceptance

**Files:**
- Modify as required by verification: `src/**/*.ts`, `src/**/*.tsx`, `src/styles/*.css`
- Modify: `README.md`

**Interfaces:**
- Consumes: complete application.
- Produces: verified production build and Chinese usage documentation.

- [ ] **Step 1: Run static verification**

Run: `npm run typecheck`

Expected: exit code 0 with no TypeScript errors.

Run: `npm run build`

Expected: exit code 0 and Vite emits `dist` without unresolved imports.

- [ ] **Step 2: Run the full test suite**

Run: `npm test`

Expected: exit code 0; copied engine, importers, persistence, controller, UI, accessibility, and cleanliness coverage all pass.

- [ ] **Step 3: Start the production preview**

Run: `npm run dev -- --host 127.0.0.1`

Expected: Vite reports a local URL and remains running for browser inspection.

- [ ] **Step 4: Verify empty-first desktop behavior in a real browser**

Clear the application's IndexedDB/localStorage, load at 1440px, and confirm: no seeded content; setup guide visible; each management panel opens; keyboard focus stays inside dialogs; API error feedback is in-app; no console errors.

- [ ] **Step 5: Verify import and chat workflows**

Import both test character formats, a SillyTavern lorebook, and a preset; configure mocked or safe test endpoints; create/load/rename/delete chats; reload and confirm persistence; manually edit variables; exercise `<var .../>`; edit/regenerate; delete from a point; and branch from a message.

- [ ] **Step 6: Verify responsive and reduced-motion behavior**

At 375px and mobile landscape, confirm no horizontal overflow, no fixed controls cover content, every primary target is at least 44px, mobile navigation is operable, and reduced-motion removes nonessential transitions.

- [ ] **Step 7: Update README**

Document supported import formats, empty-first setup, local data storage, direct API/CORS behavior, dual API responsibilities, backup limitations, development commands, and the absence of backend services.

- [ ] **Step 8: Review the final diff and commit**

Run: `git diff --check && git status --short`

Expected: no whitespace errors and only intentional files changed.

```bash
git add README.md src package.json package-lock.json docs/superpowers
git commit -m "docs: document the SillyTavern chat frontend"
```

