# AI 服务迁移指南

本文档说明了如何在应用中从 Puter AI 迁移到 OpenRouter，以及如何在两个服务之间切换。

## 概述

应用已经从完全依赖 Puter AI 迁移到使用 OpenRouter 作为主要 AI 服务，同时保留了 Puter 的其他功能（认证、文件存储、键值存储）。

## 架构变更

### 之前的架构

```
应用 → Puter.js → Puter AI服务
```

### 现在的架构

```
应用 → AI服务抽象层 → OpenRouter API
     → Puter.js → Puter其他服务（认证、存储等）
```

## 主要变更

### 1. 新增文件

- `app/lib/openrouter.ts` - OpenRouter 客户端
- `app/lib/ai-service.ts` - AI 服务抽象层
- `types/openrouter.d.ts` - OpenRouter 类型定义
- `.env.example` - 环境变量示例

### 2. 修改文件

- `app/lib/puter.ts` - 更新 AI 功能调用
- `app/routes/upload.tsx` - 修改文件处理逻辑
- `package.json` - 添加 OpenAI 依赖

### 3. 环境配置

- 使用 `VITE_OPENROUTER_API_KEY` 环境变量

## 配置说明

### OpenRouter 配置

1. 获取 API 密钥：

   - 访问 [OpenRouter](https://openrouter.ai/keys)
   - 注册账户并获取 API 密钥

2. 设置环境变量：

   ```bash
   cp .env.example .env
   ```

   在 `.env` 文件中设置：

   ```env
   VITE_OPENROUTER_API_KEY=your_openrouter_api_key_here
   ```

### 服务切换

应用支持在 Puter AI 和 OpenRouter 之间切换。在 `app/lib/ai-service.ts` 中：

```typescript
// 切换到OpenRouter（默认）
serviceType: "openrouter";

// 切换到Puter AI
serviceType: "puter";
```

## API 差异

### Puter AI

- 直接支持文件路径引用
- 内置模型选择
- 用户承担成本

### OpenRouter

- 需要文件内容作为输入
- 支持多种 AI 模型
- 开发者控制成本和模型选择

## 功能对比

| 功能     | Puter AI      | OpenRouter    |
| -------- | ------------- | ------------- |
| 文本聊天 | ✅            | ✅            |
| 图像分析 | ✅            | ✅            |
| 文件分析 | ✅ (直接路径) | ✅ (需要内容) |
| 模型选择 | 有限          | 丰富          |
| 成本控制 | 用户承担      | 开发者控制    |

## 迁移注意事项

1. **文件处理**：OpenRouter 无法直接访问文件路径，需要先读取文件内容
2. **环境变量**：使用 Vite 的 `VITE_` 前缀
3. **错误处理**：OpenRouter 可能有不同的错误响应格式
4. **成本管理**：需要监控 OpenRouter 的使用成本

## 故障排除

### 常见问题

1. **`process is not defined`错误**

   - 确保使用 `import.meta.env` 而不是 `process.env`

2. **401 认证错误**

   - 检查 API 密钥是否正确设置
   - 确认环境变量名称正确

3. **文件读取失败**
   - 确保文件上传成功
   - 检查文件路径是否正确

## 性能优化建议

1. **缓存策略**：考虑缓存 AI 响应以减少 API 调用
2. **模型选择**：根据任务选择合适的模型
3. **批处理**：对于多个请求考虑批处理
4. **错误重试**：实现智能重试机制

## 未来扩展

1. **多 AI 服务支持**：可以扩展支持更多 AI 服务
2. **智能路由**：根据任务类型自动选择最佳 AI 服务
3. **成本优化**：实现成本感知的模型选择
4. **性能监控**：添加 AI 服务性能监控
