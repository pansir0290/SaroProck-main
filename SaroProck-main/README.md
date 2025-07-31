# SaroProck | 我的个人博客

简单的部署教程 -> [点我！](https://saro.pub/build-saroprock)

---

### ✨ 这个博客有什么不同？

我不想用别人做好的模板，也不喜欢那种千篇一律的博客系统。SaroProck 是我从零搭建的，重点是自动化、高性能，还有尽量简单的写作流程。

- **用 Telegram 写动态**
  我即没有后台管理页面，也没有静态文件存贮，动态完全通过 Telegram 频道完成。每当我发送一条消息，Vercel 就会自动抓取并发布为动态文章。快速、顺手，几乎没有操作成本。

- **自建评论与点赞系统**
  不依赖任何第三方插件，评论和点赞都基于 LeanCloud 搭建。

- **免维护，全球加速**
  博客部署在 Vercel 上，完全免费，不需要服务器。

---

### 🚀 技术栈

- **框架**: Astro
- **内容源**: Telegram
- **前端交互**: React
- **样式**: Tailwind CSS + DaisyUI
- **后端服务**: LeanCloud + Vercel Serverless

---

### 🛠️ 技术流程

- **内容发布**:
  `Telegram` → `Astro 后端函数` → `获取并构建页面`

- **互动逻辑**:
  `前端点赞/评论组件` → `LeanCloud 数据读写` → `Vercel 函数校验管理员身份`

---

### ⚖️ 关于开源和版权

这个项目是开源的，代码托管在 GitHub 上，使用的是 **严格的 GPLv3 协议**。
你可以自由查看、学习、修改甚至搭建自己的版本，但你必须：

- 在你使用我的代码时保留我的署名；
- 你修改后发布的版本也必须继续遵守 GPLv3 协议。

换句话说：**你可以用，但不能删掉我。**

---

### ⭐ 如果你喜欢这个项目

如果你喜欢这个项目的思路或者实现，欢迎点亮右上角的 ⭐，这会是我继续更新的动力！

---

### 📷 预览

#### 动态页面

![](/docs/img/post-page.webp)

#### 博客页面

![](/docs/img/blog-page.webp)

#### 管理页面

![](/docs/img/admin-page.webp)

---

### 🔧 环境变量

```dotenv
# LeanCloud 应用凭证 (国际版或国内版)
# 请前往 LeanCloud 控制台 > 设置 > 应用凭证 获取
LEANCLOUD_APP_ID=<你的 LeanCloud App ID>
LEANCLOUD_APP_KEY=<你的 LeanCloud App Key>
LEANCLOUD_MASTER_KEY=<你的 LeanCloud Master Key>
LEANCLOUD_SERVER_URL=<你的 LeanCloud 服务器 URL>

# JSON Web Token (JWT) 密钥
# 用于用户认证和 API 安全，请使用一个长且随机的字符串
JWT_SECRET=<你的 JWT 密钥>

# 自定义频道或标识符
CHANNEL=your_channel_name

# HTTP 代理 (可选)
# 如果你的网络环境需要代理才能访问外部服务，请取消注释并设置
# HTTP_PROXY=http://127.0.0.1:7897

TELEGRAM_HOST=t.me

# GitHub Personal Access Token
# 用于访问 GitHub API，请在 GitHub > Settings > Developer settings > Personal access tokens 中生成
GITHUB_TOKEN=<你的 GitHub Personal Access Token>

# 后台管理员密码
# 用于访问受保护的管理功能
SECRET_ADMIN_PASSWORD=<设置一个强的管理员密码>

# 数据接收服务 (Sink) 配置
# 如果你使用自定义的数据统计或链接缩短服务，请配置以下选项
SINK_PUBLIC_URL=<你的 Sink 服务公开访问 URL>
SINK_API_KEY=<你的 Sink 服务 API 密钥>
```

---

### 🎉 致谢与参考

本项目的部分设计思路参考了以下优秀开源项目：

- [BroadcastChannel](https://github.com/ccbikai/BroadcastChannel) - AGPL-3.0 License

特别说明：
本项目 **未直接使用其源代码**，仅参考了架构和实现思路，样式均为自己设计，遵循本项目所使用的 [GPL-3.0 License](./LICENSE)。

如对原项目感兴趣，欢迎前往其仓库进一步了解。
