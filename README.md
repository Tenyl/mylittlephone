# 澄语 · 小手机角色聊天

澄语是一套手机 QQ 风格的沉浸式 LLM 角色聊天网页。应用打开后直接进入全窗口聊天；角色卡、世界书、预设、API、变量和本地数据统一收进右上角齿轮管理中心。

项目内置脱敏后的迷迭香展示卡与可编辑默认预设。全新浏览器会自动创建初始会话，并通过同源 Vercel Function 使用服务端的完整角色设定与模型配置，无需玩家手动导入角色卡、预设或填写 API。

## 功能

- 默认使用 Vercel 托管聊天服务；API 地址、Key、模型和完整内置角色卡不进入前端
- 默认预设保留在前端，可编辑、导入和切换，生成参数由服务端完整转换后传给上游
- 可切换到用户自定义 OpenAI 兼容 API，并保留主模型与辅助模型双接口配置
- 导入 SillyTavern V2/V3 JSON 或带 `chara` 元数据的 PNG 角色卡
- 导入、编辑和启停世界书，支持关键词、位置、顺序、概率与高级规则
- 生成期间只显示“对方正在输入”，最终只显示角色回复，不展示思维链或剧情选项
- 支持停止、重新生成、消息编辑、复制、分支、删除和多会话历史
- 使用 IndexedDB 保存本机资料；备份自动移除用户自定义 API Key
- 桌面与手机均采用全窗口单栏聊天布局，包含站内通知、确认对话框与键盘焦点管理

## 本地开发

```bash
npm install
npm run dev
```

仅运行 `vite` 时，`/api/chat` 不会获得 Vercel 环境变量。要在本地测试托管模式，请配置本地环境并使用 Vercel CLI；也可以在设置中切换到“自定义 API”直接测试前端。

## Vercel 部署

必须在 Vercel 配置以下服务端环境变量：

- `MANAGED_LLM_BASE_URL`
- `MANAGED_LLM_API_KEY`
- `MANAGED_LLM_MODEL`
- `MANAGED_CHARACTER_CARD_B64`
- `MANAGED_MAX_OUTPUT_TOKENS`（可选）

完整准备、角色卡编码、Sensitive 环境变量、自定义域名/CDN 和验收步骤见 [Vercel 托管聊天部署指南](docs/vercel-managed-api.md)。任何真实值都不得写入 `.env.example` 或提交到 Git。

## 数据边界

服务端只处理当前请求，不实现账号、邀请码、云同步、聊天数据库或管理后台。角色卡、世界书、前端预设、聊天记录、变量与用户自定义 API 设置仍保存在浏览器 IndexedDB。

公开网址不是身份认证。站点已提供基础请求与输出限制，但部署者仍应在模型供应商侧设置预算、速率限制和用量告警。

## 验证与构建

```bash
npm test -- --run
npm run typecheck
npm run build
npm run preview
```

设计与实施记录位于 `docs/superpowers/`。
