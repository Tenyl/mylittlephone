# 澄语 · 角色聊天前端原型

一个纯前端、全中文的手机 QQ 式 LLM 角色聊天原型。项目以本地 JSON 角色卡、世界书和对话预设驱动聊天上下文，并用可中止的模拟流式回复展示完整交互链路；不包含后端、账号系统或真实模型调用。

## 本地运行

```bash
npm install
npm run dev
```

生产构建与预览：

```bash
npm run build
npm run preview
```

## 已实现

- 桌面三栏、平板双栏和手机单栏响应式聊天界面
- 角色卡、世界书、对话预设 JSON 导入与本地管理
- 模拟流式回复、停止生成、重新生成、删除最近一轮
- 会话背景切换、记忆重置、记录导出、会话清空
- LocalStorage 持久化、站内通知、确认模态框与键盘焦点管理
- 24 项状态、解析、持久化、组件交互与可访问性测试

## 验证命令

```bash
npm test -- --run
npm run typecheck
npm run build
```

产品设计与实施说明位于 `docs/superpowers/`。
