# Vercel 托管聊天部署指南

## 部署结果

生产站点默认使用同源 `/api/chat`。浏览器不再获得默认 API 地址、Key、模型或完整迷迭香角色卡；默认预设仍从 `assets/preset/Default.json` 加载到浏览器，可在管理中心随意修改、导入和切换。

玩家若选择“自定义 API”，请求才会像旧版本一样从浏览器直连其个人接口。切换模式不会清除已保存的个人配置。

## 1. 准备私有角色卡

保留一份不位于本仓库目录中的完整迷迭香 PNG 或 Character Card V2/V3 JSON。不要把它再次复制到 `assets`、`public` 或其他被 Git 跟踪的目录。

运行以下命令，把角色数据转换成 gzip 压缩后的 Base64：

```powershell
node scripts/encode-managed-character.mjs "D:\private\迷迭香-完整角色卡.png"
```

命令只向终端输出编码，不写入项目文件，也不会打印角色正文。复制完整输出，稍后作为 `MANAGED_CHARACTER_CARD_B64` 的值。若 PNG 同时包含 `chara` 与 `ccv3`，工具会要求两者一致。

Vercel 项目环境变量总大小存在限制；工具使用 gzip 是为了给较长角色卡留出足够空间。如果以后角色卡显著增长，应先确认编码后的长度仍适合 Vercel 环境变量。

## 2. 配置 Vercel Sensitive 环境变量

进入 Vercel 项目：`Settings → Environment Variables`。为 Production 添加：

| 变量 | 内容 | 是否 Sensitive |
| --- | --- | --- |
| `MANAGED_LLM_BASE_URL` | OpenAI 兼容接口根地址，例如以 `/v1` 结束，不含 `/chat/completions` | 是 |
| `MANAGED_LLM_API_KEY` | 真实 API Key | 是 |
| `MANAGED_LLM_MODEL` | 上游模型标识 | 是 |
| `MANAGED_CHARACTER_CARD_B64` | 上一步得到的完整编码 | 是 |
| `MANAGED_MAX_OUTPUT_TOKENS` | 可选的站点输出上限 | 否 |

不要给这些变量添加 `VITE_` 前缀。`VITE_` 变量会进入前端构建，无法保密。

Sensitive 变量创建后在 Vercel 面板中不可读，适合存放 Key 与角色卡。需要 Preview 环境可用时，应为 Preview 单独添加同名变量。环境变量变更只对新部署生效，配置完成后必须 Redeploy。

## 3. 部署与检查

推送 `main` 后，已关联 GitHub 的 Vercel 项目会自动构建。项目根目录的 `api/chat.ts` 会部署为 Node.js Function，`vercel.json` 为流式请求启用取消并设置 60 秒执行时限。

部署后检查：

1. 打开站点并确认无需填写 API 即可发送消息。
2. 浏览器 Network 中应只看到 `POST /api/chat`；请求体应有预设、历史和角色 ID，但没有默认角色卡内容、模型、Key 或上游地址。
3. 在设置中编辑温度或最大输出并再次发送，确认请求体中的前端预设发生变化。
4. 切换到自定义 API，确认地址、Key、模型与双 API 控件重新出现。
5. 若返回 503，检查四个必需环境变量是否都已配置到当前 deployment environment，并重新部署。

## 4. 自定义域名与大陆访问链路

先在 Vercel 项目的 Domains 中添加最终域名，再按域名服务商或 CDN 的方案配置 DNS。若在 Vercel 前增加 Cloudflare、EdgeOne 等代理/CDN，必须为 `/api/*` 创建绕过缓存规则：

- Cache eligibility：Bypass；
- 不启用 HTML/JSON 缓存或响应合并；
- 不缓冲 `text/event-stream`；
- 允许 `POST` 和长连接；
- 代理超时时间至少覆盖函数的 60 秒时限。

静态资源可以正常缓存，但 `/api/chat` 必须保持 `Cache-Control: no-store`。代理/CDN 能改善访问路径，但不等同于中国大陆可用性或合规保证；域名实名、备案和接入要求应按实际服务商与部署地区处理。

## 5. 后续修改前端

前端 UI、默认预设和交互仍按普通 Vite 项目维护。修改源码或 `assets/preset/Default.json` 后提交并推送，Vercel 会自动重新构建；服务端环境变量无需重填。

只有以下改动需要更新环境变量并重新部署：

- 更换 API 地址、Key 或模型；
- 更新完整私有角色卡；
- 调整服务端最大输出上限。

## 安全说明

- 公开网址本身不是认证。即使只发给内部人员，链接仍可能被转发或被自动扫描。
- 服务端已限制正文、历史条数、角色卡体积和最大输出，但这不是按用户计费系统。
- 请在模型供应商侧设置月度预算、速率限制和异常用量告警。
- 不要在 Vercel 日志、浏览器控制台、报错通知或截图中粘贴环境变量值。
- 当前仓库的旧 Git 历史曾包含原角色提示词；静态资源脱敏不能抹除已经公开的历史版本。后续私有更新只能放在 Vercel Sensitive 环境变量中。
