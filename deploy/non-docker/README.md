# 非 Docker 服务器部署

本文档说明如何在 Linux 服务器上使用 Node.js、MySQL、Nginx 和 systemd 部署智能食谱系统。适合不想使用 Docker 的服务器。

## 方案说明

推荐组合：

- MySQL：系统服务
- 后端：Node.js + systemd
- 前端：Vite 构建后的静态文件
- Nginx：托管前端，并将 `/api` 反向代理到后端

备选组合：

- 后端也可以用 PM2 管理，见文档后面的 PM2 部署方式。

## 1. 安装基础软件

Ubuntu/Debian 示例：

```bash
sudo apt update
sudo apt install -y nginx mysql-server git curl
```

安装 Node.js 20：

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

## 2. 准备项目目录

建议部署到：

```text
/var/www/smart-recipe
```

示例：

```bash
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
cd /var/www
git clone <你的仓库地址> smart-recipe
cd smart-recipe
```

如果不是 Git 仓库，也可以上传整个项目目录到 `/var/www/smart-recipe`。

## 3. 创建数据库和用户

进入 MySQL：

```bash
sudo mysql
```

执行：

```sql
CREATE DATABASE smart_recipe DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'smart_recipe'@'localhost' IDENTIFIED BY '替换成强密码';
GRANT ALL PRIVILEGES ON smart_recipe.* TO 'smart_recipe'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## 4. 配置后端环境变量

```bash
cd /var/www/smart-recipe/backend
cp ../deploy/non-docker/backend.env.example .env
```

编辑 `.env`：

```env
PORT=3001
NODE_ENV=production
FRONTEND_ORIGIN=http://你的域名或服务器IP

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=smart_recipe
DB_PASSWORD=你的数据库密码
DB_NAME=smart_recipe

JWT_SECRET=至少32位随机字符串
ADMIN_USERNAME=admin
ADMIN_PASSWORD=强管理员密码
```

## 5. 初始化后端

```bash
cd /var/www/smart-recipe/backend
npm ci --omit=dev
npm run db:init
npm run admin:create
```

先手动测试一次：

```bash
node src/server.js
```

看到监听 `http://localhost:3001` 后按 `Ctrl+C` 停止。

## 6. 使用 systemd 管理后端

复制服务文件：

```bash
sudo cp /var/www/smart-recipe/deploy/non-docker/smart-recipe-backend.service /etc/systemd/system/smart-recipe-backend.service
```

确认服务文件中的路径是：

```text
/var/www/smart-recipe/backend
```

设置目录权限：

```bash
sudo chown -R www-data:www-data /var/www/smart-recipe/backend
```

启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable smart-recipe-backend
sudo systemctl start smart-recipe-backend
sudo systemctl status smart-recipe-backend
```

查看日志：

```bash
sudo journalctl -u smart-recipe-backend -f
```

## 7. 构建前端

非 Docker 部署建议让前端请求相对路径 `/api`，所以不需要配置 `VITE_API_BASE_URL`。

```bash
cd /var/www/smart-recipe/frontend
npm ci
npm run build
```

构建产物在：

```text
/var/www/smart-recipe/frontend/dist
```

## 8. 配置 Nginx

复制配置模板：

```bash
sudo cp /var/www/smart-recipe/deploy/non-docker/nginx-smart-recipe.conf /etc/nginx/sites-available/smart-recipe
```

编辑：

```bash
sudo nano /etc/nginx/sites-available/smart-recipe
```

把：

```nginx
server_name example.com;
```

改成你的域名或服务器 IP。

启用站点：

```bash
sudo ln -s /etc/nginx/sites-available/smart-recipe /etc/nginx/sites-enabled/smart-recipe
sudo nginx -t
sudo systemctl reload nginx
```

访问：

```text
http://你的域名或服务器IP
```

## 9. HTTPS 配置

如果有域名，推荐使用 Certbot：

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d example.com
```

证书续期通常会自动配置，可以检查：

```bash
sudo systemctl status certbot.timer
```

## 10. 更新部署

项目更新后：

```bash
cd /var/www/smart-recipe
git pull
bash deploy/non-docker/deploy-systemd.sh
```

如果不是 Git 部署，上传新代码后执行：

```bash
bash deploy/non-docker/deploy-systemd.sh
```

## PM2 备选方式

如果你更习惯 PM2，可以不用 systemd 服务文件。

安装 PM2：

```bash
sudo npm install -g pm2
```

复制 PM2 配置：

```bash
cp deploy/non-docker/ecosystem.config.cjs ecosystem.config.cjs
```

启动后端：

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

查看日志：

```bash
pm2 logs smart-recipe-backend
```

重启：

```bash
pm2 restart smart-recipe-backend
```

## 常见问题

如果前端能打开但接口失败：

- 检查后端是否运行：`sudo systemctl status smart-recipe-backend`
- 检查 Nginx 配置：`sudo nginx -t`
- 检查 `/api` 是否代理到 `127.0.0.1:3001`
- 检查 `FRONTEND_ORIGIN` 是否和访问地址一致

如果后端启动失败：

- 检查 `.env` 是否存在
- 检查 `NODE_ENV=production` 时是否已设置强 `JWT_SECRET` 和强管理员密码
- 检查 MySQL 用户、密码、数据库名是否正确
