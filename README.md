# 校园匿名反馈与公开看板

一个面向大学生的匿名反馈网站。用户无需登录即可提交反馈，公开看板按时间倒序展示所有反馈，并支持分类筛选和支持按钮。

## 功能

- 匿名反馈提交：不要求登录，不收集姓名、学号、邮箱等个人身份信息。
- 分类选择：课程与学业、校园生活与设施、活动与竞赛、奇思妙想与吐槽。
- 表单体验：标题和内容输入、字数统计、基础校验、提交成功提示。
- 公开看板：卡片网格展示、按最新时间倒序、分类筛选。
- 互动支持：每条反馈可点击“支持”，数据持久化到 SQLite。
- 响应式设计：适配手机端和电脑端。

## 项目结构

```text
.
├── package.json
├── README.md
├── client
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts
│   └── src
│       ├── App.tsx
│       ├── api.ts
│       ├── main.tsx
│       ├── styles.css
│       ├── types.ts
│       └── components
│           ├── FeedbackBoard.tsx
│           └── FeedbackForm.tsx
└── server
    ├── package.json
    ├── public
    │   └── index.html          # build 后由 client/dist 同步生成
    ├── tsconfig.json
    ├── data
    │   └── feedback.sqlite     # 运行后自动生成
    └── src
        ├── db.ts
        ├── index.ts
        ├── types.ts
        └── routes
            └── feedback.ts
```

## 本地运行

要求：Node.js 24 或更高版本。

安装依赖：

```bash
npm install
```

启动前后端开发服务：

```bash
npm run dev
```

前端默认地址：

```text
http://localhost:5173
```

后端默认地址：

```text
http://localhost:4000
```

## 发布到任何设备都可访问

当前项目已经支持同源公网部署。发布后，任何设备只要访问同一个公开网址，就会看到同一套数据。

推荐流程：

1. 构建前端并同步到后端静态目录：

```bash
npm run build
```

2. 启动后端生产服务：

```bash
npm run start
```

3. 在部署平台上公开后端端口 `PORT`，并绑定域名或公网地址。

### Render 在线预览

如果你要先看一个可公开访问的预览站点，Render 是最省事的方式。

1. 把代码推到 GitHub。
2. 在 Render 新建 `Web Service`。
3. 连接仓库后，Render 会读取根目录的 `render.yaml`。
4. 等待部署完成后，Render 会给你一个公网预览地址。
5. 手机和电脑都直接访问这个地址，看到的是同一份数据。

Render 相关设置已经写入 `render.yaml`，包含：

- 构建命令：`npm install && npm run build`
- 启动命令：`npm run start`
- 持久化数据目录：`/var/data/feedback.sqlite`
- 监听地址：`0.0.0.0`

### 推荐环境变量

- `PORT`：后端端口，默认 `4000`
- `HOST`：监听地址，默认 `0.0.0.0`，适合容器或云服务器公网访问
- `CLIENT_ORIGIN`：允许访问 API 的前端来源，默认 `*`
- `DATABASE_PATH`：SQLite 文件路径，用于持久化数据
- `VITE_API_BASE_URL`：如果前端和后端分开部署，设置 API 根地址，例如 `https://api.example.com`

### 数据持久化建议

如果部署到云服务器或容器，建议把 `DATABASE_PATH` 指向持久化卷，例如：

```bash
DATABASE_PATH=/data/feedback.sqlite
```

这样重启服务后，反馈数据和点赞数仍然保留。

## 常用命令

类型检查：

```bash
npm run check
```

构建前后端：

```bash
npm run build
```

只启动后端生产构建产物：

```bash
npm run start
```

## API 简介

### 获取反馈列表

```http
GET /api/feedback
GET /api/feedback?category=课程与学业
```

### 创建匿名反馈

```http
POST /api/feedback
Content-Type: application/json

{
  "category": "课程与学业",
  "title": "图书馆自习区插座不够用",
  "content": "期末周晚上经常找不到可用插座，希望能在靠窗区域增加插座。"
}
```

### 支持某条反馈

```http
POST /api/feedback/:id/support
```

## 隐私边界

后端只接受并保存 `category`、`title`、`content`，并由数据库生成 `id`、`supportCount`、`createdAt`。项目不设计登录系统，也不保存用户身份字段。