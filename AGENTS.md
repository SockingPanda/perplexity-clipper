# Perplexity Clipper - AI Agent Configuration

## 项目概述

Perplexity Clipper 是一个 Chrome 扩展，用于提取 Perplexity.ai 和 ChatGPT Deep Research 内容为干净的 Markdown 格式，并支持导出到 Anytype 知识库。

**核心功能：**
- 一键提取 Perplexity 文章和 ChatGPT Deep Research 内容
- 转换为干净的 Markdown 格式
- 导出到 Anytype 知识库
- 智能标签管理
- 多选模式支持

## 项目架构

### 文件结构
```
perplexity-md/
├── manifest.json              # Chrome 扩展清单文件
├── popup.html                 # 扩展弹窗界面
├── popup.js                   # 弹窗逻辑
├── utils.js                   # 通用工具函数
├── extractor-utils.js         # 内容提取工具函数
├── selectors.js               # DOM 选择器常量
├── supported-categories.js    # 支持的内容类别
├── content-handler.js         # 内容处理管理器
├── content-perplexity.js      # Perplexity 内容提取器
├── content-chatgpt.js         # ChatGPT 内容提取器
├── anytype-api.js             # Anytype API 接口
├── anytype-integration.js     # Anytype 集成管理
└── assets/                    # 静态资源
    ├── perplexity-original.png
    └── perplexity-clipped.png
```

### 核心模块职责

**内容提取模块：**
- `content-perplexity.js`: 处理 Perplexity.ai 页面内容提取
- `content-chatgpt.js`: 处理 ChatGPT Deep Research 内容提取
- `content-handler.js`: 统一内容处理逻辑

**Anytype 集成模块：**
- `anytype-api.js`: 封装 Anytype JSON-RPC API 调用
- `anytype-integration.js`: 管理配对、标签、导出等高级功能

**工具模块：**
- `utils.js`: 通用工具函数（存储、DOM 操作等）
- `extractor-utils.js`: 内容提取专用工具
- `selectors.js`: DOM 选择器常量定义

## 编码规范

### JavaScript 编码标准

**命名约定：**
- 使用 camelCase 命名变量和函数
- 常量使用 UPPER_SNAKE_CASE
- 类名使用 PascalCase
- 文件名使用 kebab-case

**函数设计：**
```javascript
// 异步函数使用 async/await
async function extractContent() {
  try {
    const content = await getPageContent();
    return processContent(content);
  } catch (error) {
    console.error('提取失败:', error);
    throw error;
  }
}

// 工具函数应该是纯函数
function formatMarkdown(content) {
  return content.trim().replace(/\n{3,}/g, '\n\n');
}
```

**错误处理：**
- 所有异步操作必须包含 try-catch
- 用户友好的错误消息
- 适当的错误日志记录

### Chrome 扩展特定规范

**Manifest V3 兼容性：**
- 使用 `manifest_version: 3`
- 权限最小化原则
- 使用 `activeTab` 而非 `tabs` 权限

**Content Scripts：**
- 在 `document_idle` 时机运行
- 避免全局变量污染
- 使用 `chrome.runtime.sendMessage` 进行通信

**Storage API：**
```javascript
// 使用 chrome.storage.sync 存储用户偏好
await chrome.storage.sync.set({ key: value });
const result = await chrome.storage.sync.get(['key']);
```

### Anytype 集成规范

**API 调用模式：**
```javascript
// 统一的 API 调用封装
async function anytypeRequest(method, params) {
  const response = await fetch('http://localhost:31009', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 })
  });
  
  if (!response.ok) {
    throw new Error(`API 调用失败: ${response.status}`);
  }
  
  return response.json();
}
```

**标签管理：**
- 自动识别空间中的 `tag` 属性
- 支持动态创建新标签
- 标签颜色随机分配
- 多选标签支持

## 测试要求

### 功能测试
- **内容提取测试**：验证 Perplexity 和 ChatGPT 内容提取准确性
- **Markdown 格式测试**：确保输出格式正确
- **Anytype 集成测试**：验证配对、导出、标签功能
- **错误处理测试**：网络错误、API 错误、权限错误

### 兼容性测试
- Chrome 最新版本
- Perplexity.ai 页面结构变化
- ChatGPT 界面更新
- Anytype 桌面应用版本兼容性

### 性能测试
- 大内容提取性能
- 内存使用优化
- 网络请求超时处理

## 开发工作流

### 代码审查标准
- 所有新功能必须包含错误处理
- 异步操作必须使用 try-catch
- 用户界面变更需要测试不同屏幕尺寸
- API 调用必须有超时和重试机制

### 提交规范
```
feat: 新增功能描述
fix: 修复问题描述
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建工具或辅助工具的变动
```

### 版本管理
- 遵循语义化版本控制 (SemVer)
- 主版本号：不兼容的 API 修改
- 次版本号：向下兼容的功能性新增
- 修订号：向下兼容的问题修正

### 版本发布流程
1. **版本号更新**：
   - 在 `manifest.json` 中更新 `version` 字段
   - 同时更新 `description` 字段以反映新功能
   - 确保版本号格式为 `x.y.z`

2. **提交规范**：
   ```
   feat: 增加带认证的 fetch 封装，优化 API 调用逻辑，处理未授权错误并引导用户重新配对
   ```

3. **标签创建**：
   ```bash
   # 创建带注释的标签
   git tag -a v0.4.1 -m "Release v0.4.1: 增加带认证的 fetch 封装，优化 API 调用逻辑，处理未授权错误并引导用户重新配对"
   
   # 推送标签到远程仓库
   git push origin v0.4.1
   ```

4. **发布检查清单**：
   - [ ] 版本号已更新
   - [ ] 功能测试通过
   - [ ] 提交信息规范
   - [ ] 标签已创建并推送
   - [ ] README.md 更新（如需要）

## 安全考虑

### 数据隐私
- 所有内容处理在本地完成
- 不收集用户个人数据
- Anytype 配对信息仅存储在本地

### 权限最小化
- 仅请求必要的 Chrome 权限
- 使用 `activeTab` 而非 `tabs` 权限
- 限制 host_permissions 范围

### 网络安全
- API 调用使用 HTTPS
- 实现适当的超时机制
- 验证 API 响应格式

## 性能优化

### 内容提取优化
- 使用高效的 DOM 选择器
- 避免不必要的 DOM 遍历
- 大内容分块处理

### 内存管理
- 及时清理事件监听器
- 避免内存泄漏
- 优化大对象处理

### 网络优化
- API 调用缓存
- 请求去重
- 连接池管理

## 扩展性设计

### 新网站支持
- 遵循提取器模式
- 创建新的 content-*.js 文件
- 在 manifest.json 中添加匹配规则

### 新功能集成
- 模块化设计
- 插件化架构
- 配置驱动开发

## 版本管理和发布

### 版本策略
- **开发版本**：`0.x.y` - 功能开发和测试阶段
- **稳定版本**：`1.x.y` - 生产环境使用
- **重大更新**：`x.0.y` - 架构或 API 重大变更
- **功能更新**：`x.y.0` - 新功能或重要改进
- **问题修复**：`x.y.z` - 错误修复和小改进

### 发布流程
1. **功能开发完成**
2. **测试验证通过**
3. **更新版本号**（manifest.json）
4. **提交代码**（使用规范提交信息）
5. **创建标签**（带详细注释）
6. **推送标签**（到远程仓库）
7. **更新文档**（如需要）

### 标签管理规范
```bash
# 创建带注释的标签
git tag -a v0.4.1 -m "Release v0.4.1: 功能描述"

# 推送标签到远程
git push origin v0.4.1

# 查看所有标签
git tag -l

# 删除标签（如需要）
git tag -d v0.4.1
git push origin :refs/tags/v0.4.1
```

### 版本号更新规范
- **manifest.json**：必须更新 `version` 字段
- **description**：反映新功能或改进
- **提交信息**：使用 `feat:`、`fix:`、`docs:` 等前缀
- **标签信息**：包含版本号和功能描述

## 调试和日志

### 调试模式
```javascript
const DEBUG = true;

function debugLog(message, data) {
  if (DEBUG) {
    console.log(`[Perplexity Clipper] ${message}`, data);
  }
}
```

### 错误追踪
- 详细的错误堆栈信息
- 用户操作上下文
- 网络请求状态

## 文档要求

### 代码注释
- 复杂逻辑必须包含注释
- 函数参数和返回值说明
- 异步操作流程说明

### API 文档
- Anytype API 接口说明
- 错误码定义
- 使用示例

### 用户文档
- 安装和使用指南
- 故障排除
- 功能更新说明

---

**注意：** 此配置文件旨在为 AI 助手提供项目上下文，确保生成的代码符合项目标准和架构要求。请根据项目发展持续更新此文件。 