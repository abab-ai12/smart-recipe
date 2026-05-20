# 智能食谱生成系统

这是一个前后端分离的智能食谱应用。用户可以输入食材并按人数、口味、耗时、饮食目标生成菜谱，收藏和编辑个人菜谱副本，自动汇总购物清单，查看菜谱详情和版本历史；管理员可以在后台管理用户、菜谱、系统日志、站点外观和 AI 模型配置。

## 技术栈

- 前端：React、TypeScript、Vite、Tailwind CSS、i18next
- 后端：Node.js、Express、MySQL
- 认证：JWT、bcrypt 密码哈希
- AI：内置 mock 模式，支持 OpenAI 兼容接口和 Google Gemini

## 目录结构

```text
backend/   后端 API、数据库脚本、认证、后台管理、AI 策略
frontend/  前端 React 应用
```

## 环境要求

- Node.js 20 或更高版本
- MySQL 8 或兼容版本
- npm

## 后端启动

进入后端目录：

```bash
cd backend
npm install
copy .env.example .env
```

编辑 `backend/.env`，至少确认以下配置：

```env
PORT=3001
FRONTEND_ORIGIN=http://localhost:5173

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=smart_recipe

JWT_SECRET=replace-with-a-long-random-secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=replace-with-a-strong-password
```

初始化数据库并创建管理员账号：

```bash
npm run db:init
npm run admin:create
npm run dev
```

健康检查：

```text
GET http://localhost:3001/api/health
```

## 前端启动

进入前端目录：

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

前端默认连接：

```env
VITE_API_BASE_URL=http://localhost:3001
```

浏览器打开：

```text
http://localhost:5173
```

## 服务器部署

项目提供两种服务器部署方式：

- Docker Compose 部署：适合希望一键启动 MySQL、后端、前端的服务器。
- 非 Docker 部署：适合已有 MySQL/Nginx/Node.js 环境的服务器，配置见 [deploy/non-docker/README.md](deploy/non-docker/README.md)。

下面是 Docker Compose 部署方式。部署后由前端 Nginx 容器对外提供 HTTP 服务，并把 `/api` 反向代理到后端容器。

### 1. 准备服务器

服务器需要安装：

- Docker
- Docker Compose 插件

把项目上传到服务器，例如：

```bash
cd /opt
git clone <你的仓库地址> smart-recipe
cd smart-recipe
```

如果不是 Git 仓库，也可以直接把整个项目目录上传到服务器。

### 2. 配置部署环境变量

复制部署环境变量模板：

```bash
cp .env.deploy.example .env
```

编辑 `.env`：

```env
HTTP_PORT=80
FRONTEND_ORIGIN=http://你的服务器IP或域名

MYSQL_ROOT_PASSWORD=强密码
DB_USER=smart_recipe
DB_PASSWORD=强密码

JWT_SECRET=至少32位的随机字符串
ADMIN_USERNAME=admin
ADMIN_PASSWORD=强密码
```

注意：

- `FRONTEND_ORIGIN` 要写用户实际访问的地址，例如 `http://1.2.3.4` 或 `https://example.com`。
- 生产环境不能使用示例密码。
- 如果服务器 80 端口已被占用，可以把 `HTTP_PORT` 改成 `8080`，访问时使用 `http://服务器IP:8080`。

### 3. 构建并启动

```bash
docker compose up -d --build
```

查看运行状态：

```bash
docker compose ps
```

查看日志：

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mysql
```

### 4. 创建管理员账号

数据库第一次启动时会自动执行 `backend/database/schema.sql` 建表。容器启动后执行：

```bash
docker compose exec backend npm run admin:create
```

然后访问：

```text
http://你的服务器IP或域名
```

使用 `.env` 中的 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD` 登录。

### 5. 更新部署

代码更新后重新构建：

```bash
docker compose up -d --build
```

停止服务：

```bash
docker compose down
```

如果要连数据库数据一起删除：

```bash
docker compose down -v
```

## 常用命令

后端：

```bash
npm run dev          # 开发模式启动 API
npm run start        # 生产方式启动 API
npm run db:init      # 初始化数据库表
npm run admin:create # 创建或重置管理员账号
```

前端：

```bash
npm run dev      # 启动 Vite 开发服务器
npm run build    # 类型检查并构建生产包
npm run lint     # 运行 ESLint
npm run preview  # 预览生产构建
```

## 管理员流程

1. 在 `backend/.env` 中配置 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD`。
2. 执行 `npm run admin:create`。
3. 在前端登录管理员账号。
4. 登录用户角色为 `admin` 时，导航栏会显示后台入口。

后台支持：

- 系统统计
- 用户管理
- 菜谱管理
- 使用日志
- 账号密码修改
- 站点名称、Logo、favicon、首页图配置
- AI 服务商、API Key、Base URL、模型配置和连通性测试

用户侧支持：

- 按食材生成多道菜谱
- 设置人数、口味、烹饪时间、饮食目标和忌口
- 随机生成一道菜
- 收藏、取消收藏、编辑已收藏菜谱
- 用户编辑共享菜谱时自动创建个人副本，避免影响其他用户
- 记录菜谱版本历史，并支持恢复历史版本
- 按收藏菜谱自动生成购物清单，支持常见数量和单位合并
- 手动添加和勾选购物项

## AI 配置说明

默认 AI 服务商是 `mock`，不需要外部 API Key 也能生成测试菜谱。

后台可切换：

- `mock`：本地模拟生成
- `openai`：OpenAI 或兼容 OpenAI 格式的接口
- `gemini`：Google Gemini

配置真实模型时，需要在后台保存对应的 API Key、Base URL 和模型名。

## 生产环境注意事项

- 必须替换默认 `JWT_SECRET`。
- 必须使用强管理员密码，不要保留示例密码。
- 当前 AI Key 保存在 `system_settings` 表中，上线前建议增加加密或使用专门的密钥管理方案。
- 生产环境请使用 HTTPS。
- `FRONTEND_ORIGIN` 应限制为真实前端域名。
- 登录、注册、AI 生成接口建议增加限流。
- 不建议长期把大体积 base64 图片存入数据库，可改为对象存储或静态文件服务。
