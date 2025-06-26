# Perplexity Clipper

> Chrome 扩展：一键提取 Perplexity.ai 文章为干净的 Markdown 格式，支持导出到 Anytype 知识库。

## 功能概述

- ✂️ **一键提取** - 将 Perplexity 文章转换为干净的 Markdown 格式
- 📱 **多页面支持** - 支持 `/page/` 和 `/discover/` 路径下的具体文章页面
- 📝 **完整保留** - 保留文章标题、首图、章节结构等完整格式
- 📋 **自动复制** - 提取后自动复制到剪贴板，方便粘贴到任何编辑器
- 🚀 **Anytype 导出** - 一键将内容导出到 Anytype 知识库
- 🔄 **智能记忆** - 记住用户偏好设置，包括空间、类型和模板选择
- 🧠 **自动提取** - 点击导出按钮时自动提取内容，无需手动操作
- 🔌 **可扩展架构** - 基于提取器组件设计，便于添加对新网站的支持

## 支持的页面类型

- ✅ Perplexity 文章页面 (`perplexity.ai/page/*`)
- ✅ Perplexity Discover 文章页面，例如:
  - `perplexity.ai/discover/tech/article-name`
  - `perplexity.ai/discover/finance/article-name`
  - `perplexity.ai/discover/arts/article-name`

**注意**：本插件仅支持具体的文章页面，不支持分类列表页面（如 `perplexity.ai/discover/tech`）。

## 使用方法

### 基本使用

1. 安装扩展后，打开任意 Perplexity 文章页面
2. 点击工具栏中的扩展图标
3. 点击"抽取并复制 Markdown"按钮
4. Markdown 内容将自动复制到剪贴板，同时显示在文本框中

### Anytype 导出功能

1. 在扩展弹窗中勾选"启用 Anytype 导出"
2. 点击"导出到 Anytype"按钮（会自动提取当前页面内容）
3. 首次使用时，需要完成与 Anytype 的配对流程：
   - 确保 Anytype 桌面应用已运行
   - 在 Anytype 应用中查看弹出的四位验证码
   - 在插件中输入该验证码完成配对
4. 选择要导出到的空间、对象类型和模板（可选）
5. 输入对象标题（默认使用文章标题）
6. 点击"确认导出"按钮

**注意**：使用 Anytype 导出功能需要 Anytype 桌面应用 v0.45.0 或更高版本。

## 安装方法

### 手动安装（开发者模式）

1. 下载此仓库的 ZIP 文件并解压
2. 打开 Chrome 浏览器，进入扩展管理页面 (`chrome://extensions/`)
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"，选择解压后的文件夹

## 隐私声明

- 此扩展不会收集任何用户数据
- 所有内容处理均在本地完成
- Anytype 配对信息仅存储在本地浏览器中

## 技术细节

- **内容提取**：通过 XPath 和 DOM 操作精确提取 Perplexity 文章内容
- **Markdown 转换**：保留文章结构，包括标题、段落、列表和引用
- **Anytype 集成**：通过 Anytype JSON-RPC API 实现与 Anytype 的无缝集成
- **用户偏好**：使用 Chrome Storage API 保存用户设置和偏好
- **可扩展架构**：基于提取器模式设计，便于添加新网站支持

## 开发相关

- 内容提取脚本位于 `content-perplexity.js`
  - 使用基于组件的提取器架构，便于扩展
  - 要添加新网站支持，只需创建新的提取器类并注册到管理器
- 弹窗界面位于 `popup.html` 和 `popup.js`
- Anytype API 相关功能位于 `anytype-api.js`
- 欢迎提交 Issue 和 PR

## License

MIT License · Made with ❤️ by [SockingPanda](https://github.com/SockingPanda)

