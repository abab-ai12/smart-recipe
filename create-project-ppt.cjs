const pptxgen = require('D:/npm/node_modules/pptxgenjs');

const pptx = new pptxgen();
pptx.defineLayout({ name: 'CUSTOM_16X9', width: 13.333, height: 7.5 });
pptx.layout = 'CUSTOM_16X9';
pptx.author = '李相阳';
pptx.company = '计科1班';
pptx.subject = '智能食谱生成系统项目演示';
pptx.title = '智能食谱生成系统';
pptx.lang = 'zh-CN';
pptx.theme = {
  headFontFace: 'Microsoft YaHei',
  bodyFontFace: 'Microsoft YaHei',
  lang: 'zh-CN'
};

const C = {
  bg: 'F7FAF8',
  dark: '16302B',
  green: '2C6E49',
  mint: '9FD8CB',
  orange: 'F4A261',
  red: 'E76F51',
  cream: 'FFF7E6',
  white: 'FFFFFF',
  gray: '667085',
  line: 'D9E4DD'
};

const W = 13.333;
const H = 7.5;

function addBg(slide, color = C.bg) {
  slide.background = { color };
}

function addFooter(slide, idx) {
  slide.addText(`智能食谱生成系统  /  ${idx.toString().padStart(2, '0')}`, {
    x: 0.55, y: 7.05, w: 4, h: 0.2, fontSize: 8.5, color: '7A8A83', margin: 0
  });
}

function title(slide, text, sub) {
  slide.addText(text, {
    x: 0.65, y: 0.45, w: 8.6, h: 0.45, fontSize: 25, bold: true, color: C.dark, margin: 0
  });
  if (sub) {
    slide.addText(sub, {
      x: 0.66, y: 0.95, w: 7.8, h: 0.3, fontSize: 10.5, color: C.gray, margin: 0
    });
  }
}

function card(slide, x, y, w, h, fill = C.white) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    rectRadius: 0.08,
    fill: { color: fill },
    line: { color: C.line, transparency: 10 },
    shadow: { type: 'outer', color: '000000', opacity: 0.10, blur: 2, offset: 1, angle: 45 }
  });
}

function iconCircle(slide, x, y, text, fill = C.green, color = C.white) {
  slide.addShape(pptx.ShapeType.ellipse, {
    x, y, w: 0.46, h: 0.46,
    fill: { color: fill },
    line: { color: fill }
  });
  slide.addText(text, {
    x, y: y + 0.08, w: 0.46, h: 0.18, align: 'center', fontSize: 10, bold: true, color, margin: 0
  });
}

function pill(slide, x, y, text, fill, color = C.dark) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w: 1.55, h: 0.34, rectRadius: 0.08,
    fill: { color: fill }, line: { color: fill }
  });
  slide.addText(text, { x, y: y + 0.07, w: 1.55, h: 0.12, align: 'center', fontSize: 8.5, bold: true, color, margin: 0 });
}

function addBullets(slide, items, x, y, w, h, size = 13) {
  slide.addText(items.map((item, i) => ({
    text: item,
    options: { bullet: true, breakLine: i !== items.length - 1 }
  })), {
    x, y, w, h, fontSize: size, color: C.dark, breakLine: false,
    fit: 'shrink', paraSpaceAfterPt: 6
  });
}

function addCircleFood(slide, cx, cy, scale = 1) {
  slide.addShape(pptx.ShapeType.ellipse, {
    x: cx, y: cy, w: 2.2 * scale, h: 2.2 * scale,
    fill: { color: C.white }, line: { color: 'E8EFEA', width: 1.2 },
    shadow: { type: 'outer', color: '000000', opacity: 0.15, blur: 2, offset: 1, angle: 45 }
  });
  slide.addShape(pptx.ShapeType.ellipse, { x: cx + 0.35 * scale, y: cy + 0.38 * scale, w: 1.5 * scale, h: 1.5 * scale, fill: { color: C.orange }, line: { color: C.orange } });
  slide.addShape(pptx.ShapeType.ellipse, { x: cx + 0.63 * scale, y: cy + 0.62 * scale, w: 0.45 * scale, h: 0.45 * scale, fill: { color: C.red }, line: { color: C.red } });
  slide.addShape(pptx.ShapeType.ellipse, { x: cx + 1.12 * scale, y: cy + 0.75 * scale, w: 0.42 * scale, h: 0.42 * scale, fill: { color: C.green }, line: { color: C.green } });
  slide.addShape(pptx.ShapeType.ellipse, { x: cx + 0.82 * scale, y: cy + 1.18 * scale, w: 0.36 * scale, h: 0.36 * scale, fill: { color: C.cream }, line: { color: C.cream } });
}

// 1 Cover
{
  const s = pptx.addSlide();
  addBg(s, C.dark);
  s.addShape(pptx.ShapeType.arc, { x: 8.3, y: -1.2, w: 5.8, h: 5.8, line: { color: C.mint, transparency: 60, width: 2 }, adjustPoint: 0.4 });
  s.addShape(pptx.ShapeType.ellipse, { x: 9.25, y: 1.5, w: 2.9, h: 2.9, fill: { color: C.green }, line: { color: C.green } });
  addCircleFood(s, 9.6, 1.85, 0.95);
  pill(s, 0.78, 0.75, 'AI + Recipe', C.orange, C.dark);
  s.addText('智能食谱生成系统', { x: 0.78, y: 1.65, w: 6.4, h: 0.6, fontSize: 34, bold: true, color: C.white, margin: 0 });
  s.addText('基于 React + Node.js + MySQL 的 AI 菜谱应用', { x: 0.82, y: 2.45, w: 6.2, h: 0.4, fontSize: 15, color: 'DDE8E3', margin: 0 });
  s.addText('计科1班  202406024149  李相阳', { x: 0.82, y: 5.8, w: 5.8, h: 0.38, fontSize: 18, bold: true, color: C.orange, margin: 0 });
  s.addText('课程作业项目演示', { x: 0.84, y: 6.25, w: 3, h: 0.26, fontSize: 11, color: 'B9C9C2', margin: 0 });
}

// 2 Background
{
  const s = pptx.addSlide();
  addBg(s);
  title(s, '项目背景与目标', '从“今天吃什么”到“现有食材如何变成一顿饭”');
  card(s, 0.75, 1.55, 3.5, 4.25, C.white);
  iconCircle(s, 1.05, 1.9, '痛', C.red);
  s.addText('用户痛点', { x: 1.65, y: 1.88, w: 1.6, h: 0.3, fontSize: 18, bold: true, color: C.dark, margin: 0 });
  addBullets(s, ['不知道现有食材能做什么', '搜索菜谱耗时，步骤质量不稳定', '收藏、采购、管理流程分散'], 1.05, 2.55, 2.8, 1.8, 12.5);
  card(s, 4.9, 1.55, 3.5, 4.25, C.cream);
  iconCircle(s, 5.2, 1.9, '解', C.orange, C.dark);
  s.addText('解决思路', { x: 5.8, y: 1.88, w: 1.6, h: 0.3, fontSize: 18, bold: true, color: C.dark, margin: 0 });
  addBullets(s, ['输入食材，AI 自动生成多道菜谱', '支持人数、口味、耗时和忌口偏好', '收藏后自动形成购物清单'], 5.2, 2.55, 2.8, 1.8, 12.5);
  card(s, 9.05, 1.55, 3.5, 4.25, C.white);
  iconCircle(s, 9.35, 1.9, '目', C.green);
  s.addText('项目目标', { x: 9.95, y: 1.88, w: 1.6, h: 0.3, fontSize: 18, bold: true, color: C.dark, margin: 0 });
  addBullets(s, ['完成可登录、可部署的 Web 应用', '覆盖用户端和管理员端核心流程', '形成可演示、可扩展的 MVP'], 9.35, 2.55, 2.8, 1.8, 12.5);
  addFooter(s, 2);
}

// 3 Architecture
{
  const s = pptx.addSlide();
  addBg(s, 'F3F7F4');
  title(s, '系统技术架构', '前后端分离，AI 服务通过策略模式接入');
  const xs = [0.85, 3.85, 6.85, 9.85];
  const labels = [
    ['前端', 'React / TypeScript / Vite', '页面交互、状态管理、路由'],
    ['后端 API', 'Node.js / Express', '认证、菜谱、后台接口'],
    ['数据层', 'MySQL', '用户、菜谱、收藏、日志'],
    ['AI 服务', 'Mock / OpenAI / Gemini', '生成菜谱与测试模型']
  ];
  labels.forEach((l, i) => {
    card(s, xs[i], 2.0, 2.35, 2.1, i === 1 ? C.cream : C.white);
    iconCircle(s, xs[i] + 0.25, 2.3, String(i + 1), i === 3 ? C.red : C.green);
    s.addText(l[0], { x: xs[i] + 0.25, y: 2.9, w: 1.9, h: 0.25, fontSize: 17, bold: true, color: C.dark, margin: 0 });
    s.addText(l[1], { x: xs[i] + 0.25, y: 3.28, w: 1.95, h: 0.2, fontSize: 9.5, bold: true, color: C.green, margin: 0 });
    s.addText(l[2], { x: xs[i] + 0.25, y: 3.58, w: 1.9, h: 0.3, fontSize: 9.5, color: C.gray, margin: 0, fit: 'shrink' });
    if (i < labels.length - 1) {
      s.addShape(pptx.ShapeType.chevron, { x: xs[i] + 2.42, y: 2.75, w: 0.55, h: 0.55, fill: { color: C.orange }, line: { color: C.orange } });
    }
  });
  s.addText('部署支持', { x: 0.9, y: 5.35, w: 1.5, h: 0.25, fontSize: 15, bold: true, color: C.dark, margin: 0 });
  ['Docker Compose', 'Nginx + systemd', 'PM2 备选', 'HTTPS 文档'].forEach((t, i) => pill(s, 2.35 + i * 1.85, 5.28, t, i % 2 ? C.mint : C.orange, C.dark));
  addFooter(s, 3);
}

// 4 User Features
{
  const s = pptx.addSlide();
  addBg(s);
  title(s, '用户端核心功能', '围绕“生成、收藏、编辑、采购”的完整做饭流程');
  const items = [
    ['生成菜谱', '输入食材，设置人数、口味、时间与忌口'],
    ['收藏菜谱', '登录后收藏喜欢的菜谱，详情页可随时查看'],
    ['个人编辑', '编辑共享菜谱时自动创建个人副本，避免影响他人'],
    ['版本历史', '每次修改前保存快照，支持恢复历史版本'],
    ['购物清单', '自动合并收藏菜谱中的食材数量和单位'],
    ['视频辅助', '菜谱详情页可跳转平台搜索制作视频']
  ];
  items.forEach((it, i) => {
    const x = 0.85 + (i % 3) * 4.1;
    const y = 1.55 + Math.floor(i / 3) * 2.25;
    card(s, x, y, 3.55, 1.65, C.white);
    iconCircle(s, x + 0.25, y + 0.28, String(i + 1), i === 4 ? C.orange : C.green, i === 4 ? C.dark : C.white);
    s.addText(it[0], { x: x + 0.88, y: y + 0.3, w: 2.2, h: 0.25, fontSize: 15, bold: true, color: C.dark, margin: 0 });
    s.addText(it[1], { x: x + 0.88, y: y + 0.72, w: 2.25, h: 0.45, fontSize: 10.5, color: C.gray, margin: 0, fit: 'shrink' });
  });
  addFooter(s, 4);
}

// 5 AI Flow
{
  const s = pptx.addSlide();
  addBg(s, C.dark);
  s.addText('AI 菜谱生成流程', { x: 0.7, y: 0.55, w: 5, h: 0.4, fontSize: 28, bold: true, color: C.white, margin: 0 });
  s.addText('通过策略模式切换 Mock / OpenAI / Gemini，保持业务接口稳定', { x: 0.72, y: 1.08, w: 6.6, h: 0.25, fontSize: 11.5, color: 'CFE2D9', margin: 0 });
  const flow = [
    ['1', '食材输入', '番茄、鸡蛋、牛肉'],
    ['2', '偏好参数', '人数 / 口味 / 忌口'],
    ['3', 'AI 策略', 'Mock / OpenAI / Gemini'],
    ['4', '结构化结果', '标题、食材、摘要、步骤'],
    ['5', '入库展示', '卡片、详情、收藏']
  ];
  flow.forEach((f, i) => {
    const x = 0.75 + i * 2.45;
    card(s, x, 2.2, 1.9, 2.15, i === 2 ? C.orange : '244B43');
    iconCircle(s, x + 0.18, 2.45, f[0], i === 2 ? C.dark : C.mint, i === 2 ? C.white : C.dark);
    s.addText(f[1], { x: x + 0.22, y: 3.05, w: 1.45, h: 0.22, fontSize: 14, bold: true, color: i === 2 ? C.dark : C.white, margin: 0 });
    s.addText(f[2], { x: x + 0.22, y: 3.43, w: 1.45, h: 0.36, fontSize: 9.5, color: i === 2 ? '3B2C1E' : 'CFE2D9', margin: 0, fit: 'shrink' });
    if (i < flow.length - 1) s.addShape(pptx.ShapeType.triangle, { x: x + 1.98, y: 3.0, w: 0.25, h: 0.25, rotate: 90, fill: { color: C.mint }, line: { color: C.mint } });
  });
  s.addText('关键实现：统一返回 JSON 菜谱结构，后端负责归一化、去重和持久化。', { x: 1.05, y: 5.45, w: 10.6, h: 0.4, fontSize: 16, bold: true, color: C.orange, align: 'center', margin: 0 });
  addFooter(s, 5);
}

// 6 Data Model
{
  const s = pptx.addSlide();
  addBg(s);
  title(s, '数据设计亮点', '围绕用户、菜谱、版本和配置建立可扩展的数据模型');
  const tables = [
    ['users', '账号、密码哈希、角色'],
    ['recipes', '菜谱主体、个人副本、来源菜谱'],
    ['recipe_versions', '编辑前快照、版本号、恢复依据'],
    ['user_saved_recipes', '用户收藏关系'],
    ['system_settings', 'AI Key、模型、外观配置'],
    ['usage_logs', '登录、生成、编辑、后台操作记录']
  ];
  tables.forEach((t, i) => {
    const x = i < 3 ? 0.95 : 7.05;
    const y = 1.55 + (i % 3) * 1.35;
    s.addShape(pptx.ShapeType.rect, { x, y, w: 4.9, h: 0.86, fill: { color: i === 2 ? C.cream : C.white }, line: { color: C.line } });
    s.addShape(pptx.ShapeType.rect, { x, y, w: 0.16, h: 0.86, fill: { color: i === 2 ? C.orange : C.green }, line: { color: i === 2 ? C.orange : C.green } });
    s.addText(t[0], { x: x + 0.35, y: y + 0.15, w: 1.7, h: 0.18, fontSize: 13, bold: true, color: C.dark, margin: 0 });
    s.addText(t[1], { x: x + 2.0, y: y + 0.16, w: 2.55, h: 0.18, fontSize: 10.5, color: C.gray, margin: 0 });
  });
  addCircleFood(s, 5.38, 2.55, 0.62);
  s.addText('编辑不污染公共菜谱', { x: 4.35, y: 4.35, w: 3.0, h: 0.25, fontSize: 15, bold: true, color: C.green, align: 'center', margin: 0 });
  s.addText('用户修改共享菜谱时创建个人副本，并记录版本历史', { x: 3.88, y: 4.75, w: 3.9, h: 0.35, fontSize: 10.5, color: C.gray, align: 'center', margin: 0 });
  addFooter(s, 6);
}

// 7 Admin
{
  const s = pptx.addSlide();
  addBg(s, 'FFF9EF');
  title(s, '管理后台能力', '不仅是业务页面，也包含系统运维和配置入口');
  const left = ['数据看板：用户数、菜谱数、收藏数', '用户管理：新增、删除、批量删除', '菜谱管理：查看生成记录、删除异常数据', '使用日志：追踪登录、生成、编辑、后台操作'];
  addBullets(s, left, 0.95, 1.7, 5.0, 2.6, 14);
  card(s, 7.15, 1.35, 4.9, 4.35, C.white);
  s.addText('AI 与外观配置', { x: 7.55, y: 1.75, w: 3.2, h: 0.32, fontSize: 19, bold: true, color: C.dark, margin: 0 });
  const cfg = ['OpenAI / Gemini / Mock 切换', 'API Key、Base URL、模型名保存', '模型连通性测试', '站点名称、Logo、首页图配置'];
  cfg.forEach((c, i) => {
    iconCircle(s, 7.55, 2.35 + i * 0.68, '✓', i % 2 ? C.orange : C.green, i % 2 ? C.dark : C.white);
    s.addText(c, { x: 8.2, y: 2.42 + i * 0.68, w: 3.1, h: 0.2, fontSize: 11.5, color: C.dark, margin: 0 });
  });
  addFooter(s, 7);
}

// 8 Deployment
{
  const s = pptx.addSlide();
  addBg(s);
  title(s, '部署方案', '同时支持 Docker 一键部署和传统服务器部署');
  card(s, 0.9, 1.55, 5.2, 4.55, C.white);
  s.addText('Docker Compose', { x: 1.25, y: 1.95, w: 2.7, h: 0.3, fontSize: 20, bold: true, color: C.green, margin: 0 });
  addBullets(s, ['mysql 容器保存数据卷', 'backend 容器运行 Express API', 'frontend 容器使用 Nginx 托管静态文件', 'Nginx 将 /api 代理到后端'], 1.25, 2.6, 4.1, 1.9, 12.5);
  card(s, 7.25, 1.55, 5.2, 4.55, C.cream);
  s.addText('非 Docker 部署', { x: 7.6, y: 1.95, w: 3.0, h: 0.3, fontSize: 20, bold: true, color: C.dark, margin: 0 });
  addBullets(s, ['Node.js + MySQL + Nginx', 'systemd 管理后端进程', 'PM2 作为备选部署方式', 'Certbot 配置 HTTPS 证书'], 7.6, 2.6, 4.1, 1.9, 12.5);
  s.addText('目标：让项目不只停留在本地，而是具备真实上线试用能力。', { x: 2.3, y: 6.35, w: 8.8, h: 0.3, fontSize: 15, bold: true, color: C.red, align: 'center', margin: 0 });
  addFooter(s, 8);
}

// 9 Demo flow
{
  const s = pptx.addSlide();
  addBg(s, 'F3F7F4');
  title(s, '现场演示流程', '上台演示时可以按这条路径展示完整闭环');
  const steps = [
    ['登录系统', '展示注册/登录和导航栏变化'],
    ['生成菜谱', '输入食材，设置偏好，生成多道菜'],
    ['收藏详情', '收藏菜谱并打开详情页'],
    ['编辑副本', '修改菜谱并展示个人副本与版本历史'],
    ['购物清单', '查看食材自动合并结果'],
    ['后台管理', '展示统计、日志和 AI 配置']
  ];
  steps.forEach((st, i) => {
    const x = 0.85 + (i % 2) * 6.0;
    const y = 1.45 + Math.floor(i / 2) * 1.55;
    iconCircle(s, x, y + 0.08, String(i + 1), i === 5 ? C.red : C.green);
    s.addText(st[0], { x: x + 0.65, y: y + 0.08, w: 2.1, h: 0.22, fontSize: 15, bold: true, color: C.dark, margin: 0 });
    s.addText(st[1], { x: x + 0.65, y: y + 0.45, w: 4.3, h: 0.25, fontSize: 10.5, color: C.gray, margin: 0 });
  });
  s.addText('演示重点：不是单一页面，而是从用户需求到系统管理的完整产品流程。', { x: 1.35, y: 6.35, w: 10.8, h: 0.28, fontSize: 15, bold: true, color: C.green, align: 'center', margin: 0 });
  addFooter(s, 9);
}

// 10 Summary
{
  const s = pptx.addSlide();
  addBg(s, C.dark);
  s.addText('项目总结', { x: 0.75, y: 0.65, w: 3.2, h: 0.45, fontSize: 30, bold: true, color: C.white, margin: 0 });
  const stats = [
    ['完整流程', '生成 → 收藏 → 编辑 → 采购'],
    ['工程能力', '前后端分离、权限、日志、部署'],
    ['扩展空间', 'AI 加密、分页、测试、移动端体验']
  ];
  stats.forEach((st, i) => {
    card(s, 0.9 + i * 4.05, 2.0, 3.25, 2.3, i === 1 ? C.orange : '244B43');
    s.addText(st[0], { x: 1.25 + i * 4.05, y: 2.45, w: 2.5, h: 0.28, fontSize: 19, bold: true, color: i === 1 ? C.dark : C.white, align: 'center', margin: 0 });
    s.addText(st[1], { x: 1.18 + i * 4.05, y: 3.05, w: 2.65, h: 0.45, fontSize: 11, color: i === 1 ? '3B2C1E' : 'CFE2D9', align: 'center', margin: 0, fit: 'shrink' });
  });
  s.addText('谢谢观看，欢迎老师和同学提出建议', { x: 1.9, y: 5.7, w: 9.6, h: 0.4, fontSize: 22, bold: true, color: C.orange, align: 'center', margin: 0 });
  s.addText('计科1班  202406024149  李相阳', { x: 3.6, y: 6.35, w: 6.2, h: 0.28, fontSize: 14, color: 'CFE2D9', align: 'center', margin: 0 });
}

pptx.writeFile({ fileName: '智能食谱生成系统-项目演示-李相阳.pptx' });
