# 智能食谱前端

这是智能食谱系统的前端项目，基于 React、TypeScript 和 Vite 构建。

## 启动方式

```bash
npm install
copy .env.example .env
npm run dev
```

默认访问地址：

```text
http://localhost:5173
```

在 `.env` 中配置后端 API 地址：

```env
VITE_API_BASE_URL=http://localhost:3001
```

如果不配置 `VITE_API_BASE_URL`，前端会默认请求相对路径 `/api`。这适合 Docker/Nginx 部署，由 Nginx 把 `/api` 反向代理到后端服务。

## 可用脚本

```bash
npm run dev      # 启动本地开发服务器
npm run build    # 类型检查并构建生产包
npm run lint     # 运行 ESLint
npm run preview  # 预览生产构建
```

## 主要页面

- 首页：输入食材生成菜谱、随机生成菜谱、收藏菜谱
- 生成偏好：设置人数、口味、耗时、饮食目标和忌口
- 登录注册页：用户注册和登录
- 收藏页：查看和取消收藏菜谱
- 菜谱详情页：查看完整做法、编辑个人菜谱副本、查看和恢复版本历史、跳转视频搜索
- 购物清单页：按收藏菜谱汇总食材，支持常见数量和单位合并、手动添加和勾选采购项
- 后台管理页：管理员查看统计、管理用户和菜谱、配置外观和 AI 模型

## 后端接口约定

前端依赖以下主要接口：

- `POST /api/auth/register`
- `POST /api/auth/login`
- `PUT /api/auth/password`
- `POST /api/recipes/generate`
- `POST /api/recipes/random`
- `POST /api/recipes/save`
- `GET /api/recipes/saved`
- `DELETE /api/recipes/saved/:recipeId`
- `GET /api/recipes/:recipeId`
- `PUT /api/recipes/:recipeId`
- `GET /api/recipes/:recipeId/versions`
- `POST /api/recipes/:recipeId/versions/:versionId/restore`
- `GET /api/settings/appearance`
- `GET /api/admin/settings`
- `PUT /api/admin/settings`
- `GET /api/admin/stats`
- `GET /api/admin/users`
- `GET /api/admin/recipes`
- `GET /api/admin/usage-logs`

需要登录的接口会自动从 `localStorage` 读取 token，并添加请求头：

```text
Authorization: Bearer <token>
```
