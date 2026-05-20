# 智能食谱后端

这是智能食谱系统的后端项目，基于 Node.js、Express 和 MySQL 构建，提供用户认证、菜谱生成、收藏、后台管理和 AI 服务商配置能力。

## 启动方式

1. 安装依赖：

```bash
npm install
```

2. 复制环境变量文件：

```bash
copy .env.example .env
```

3. 编辑 `.env`，配置 MySQL、JWT 和管理员账号：

```env
PORT=3001
FRONTEND_ORIGIN=http://localhost:5173

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=smart_recipe

JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d

ADMIN_USERNAME=admin
ADMIN_PASSWORD=replace-with-a-strong-password
```

4. 初始化数据库：

```bash
npm run db:init
```

5. 创建或重置管理员账号：

```bash
npm run admin:create
```

6. 启动 API：

```bash
npm run dev
```

默认 API 地址：

```text
http://localhost:3001
```

健康检查：

```text
GET /api/health
```

## Docker 部署说明

项目根目录提供了 `docker-compose.yml`。服务器部署时建议回到项目根目录执行：

```bash
cp .env.deploy.example .env
docker compose up -d --build
docker compose exec backend npm run admin:create
```

Compose 会启动：

- `mysql`：MySQL 数据库
- `backend`：Express API
- `frontend`：Nginx 静态站点和 `/api` 反向代理

## 可用脚本

```bash
npm run dev          # 使用 nodemon 启动开发服务
npm run start        # 使用 node 启动服务
npm run db:init      # 执行 database/schema.sql 初始化数据库
npm run admin:create # 创建或重置管理员账号
```

## 主要接口

公开接口：

- `POST /api/auth/register`：注册，参数 `{ "username": "...", "password": "..." }`
- `POST /api/auth/login`：登录，返回 JWT token
- `POST /api/recipes/generate`：按食材生成菜谱
- `POST /api/recipes/random`：随机生成一道菜谱
- `GET /api/recipes/:recipeId`：获取菜谱详情
- `PUT /api/recipes/:recipeId`：编辑菜谱，管理员或已收藏该菜谱的用户可用；普通用户编辑共享菜谱时会创建个人副本
- `GET /api/recipes/:recipeId/versions`：获取个人菜谱的版本历史
- `POST /api/recipes/:recipeId/versions/:versionId/restore`：恢复个人菜谱的历史版本
- `GET /api/recipes/:recipeId/image`：获取或生成菜谱图片
- `GET /api/settings/appearance`：获取站点外观配置

登录用户接口：

- `PUT /api/auth/password`：修改当前用户密码
- `POST /api/recipes/save`：收藏菜谱
- `GET /api/recipes/saved`：获取我的收藏
- `DELETE /api/recipes/saved/:recipeId`：取消收藏

管理员接口：

- `GET /api/admin/settings`：获取系统配置
- `PUT /api/admin/settings`：更新系统配置
- `GET /api/admin/stats`：获取系统统计
- `GET /api/admin/users`：获取用户列表
- `POST /api/admin/users`：创建用户
- `DELETE /api/admin/users/:id`：删除用户
- `POST /api/admin/users/bulk-delete`：批量删除用户
- `GET /api/admin/recipes`：获取菜谱列表
- `DELETE /api/admin/recipes/:id`：删除菜谱
- `POST /api/admin/recipes/bulk-delete`：批量删除菜谱
- `GET /api/admin/usage-logs`：获取使用日志
- `POST /api/admin/ai/test`：测试 AI 模型配置

受保护接口需要请求头：

```text
Authorization: Bearer <token>
```

## AI 服务商配置

`system_settings` 表保存系统配置，主要包括：

- `active_ai_provider`：`mock`、`openai` 或 `gemini`
- `openai_api_key`
- `openai_base_url`
- `openai_model`
- `gemini_api_key`
- `gemini_base_url`
- `gemini_model`

默认服务商是 `mock`，无需外部 API Key 即可生成测试菜谱。接入真实模型时，可以通过后台管理页或管理员接口更新配置。

## 数据库

数据库 schema 位于：

```text
database/schema.sql
```

主要表：

- `users`
- `recipes`
- `recipe_versions`
- `user_saved_recipes`
- `system_settings`
- `usage_logs`

## 安全注意事项

- 生产环境必须替换默认 `JWT_SECRET`。
- 生产环境必须使用强管理员密码。
- 当前 AI Key 明文保存在数据库中，上线前建议增加加密或改用密钥管理服务。
- 登录、注册、AI 生成接口建议增加限流。
- `FRONTEND_ORIGIN` 不要在生产环境设置为 `*`。
