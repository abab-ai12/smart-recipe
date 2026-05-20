const fs = require('fs');
const path = require('path');
const pptxgen = require('D:/npm/node_modules/pptxgenjs');

const pptx = new pptxgen();
pptx.defineLayout({ name: 'WIDE', width: 13.333, height: 7.5 });
pptx.layout = 'WIDE';
pptx.author = '李相阳';
pptx.company = '计科1班';
pptx.subject = '智能食谱生成系统项目答辩';
pptx.title = '智能食谱生成系统项目答辩-精美版';
pptx.lang = 'zh-CN';
pptx.theme = {
  headFontFace: 'Microsoft YaHei UI',
  bodyFontFace: 'Microsoft YaHei',
  lang: 'zh-CN'
};
pptx.margin = 0;

const W = 13.333;
const H = 7.5;

const C = {
  ink: '17211C',
  forest: '214D3D',
  leaf: '2F7D5A',
  mint: 'BFE8D3',
  cream: 'FFF4E3',
  butter: 'FFD889',
  tomato: 'D94C3D',
  carrot: 'EF9C45',
  paper: 'F7F3EA',
  paper2: 'ECF5EE',
  white: 'FFFFFF',
  text: '24312B',
  muted: '6A746F',
  line: 'D7DED6',
  darkCard: '203C33'
};

const S = pptx.ShapeType;

function bg(slide, color = C.paper) {
  slide.background = { color };
}

function shape(slide, type, opts) {
  slide.addShape(type, {
    line: { color: opts.lineColor || opts.fillColor || C.line, transparency: opts.lineTransparency ?? 0, width: opts.lineWidth ?? 1 },
    fill: opts.fillColor ? { color: opts.fillColor, transparency: opts.fillTransparency ?? 0 } : undefined,
    ...opts
  });
}

function rect(slide, x, y, w, h, fillColor, opts = {}) {
  shape(slide, opts.round ? S.roundRect : S.rect, {
    x, y, w, h,
    rectRadius: opts.round ? 0.08 : undefined,
    fillColor,
    lineColor: opts.lineColor || fillColor,
    lineTransparency: opts.lineTransparency ?? 0,
    lineWidth: opts.lineWidth ?? 1,
    fillTransparency: opts.fillTransparency ?? 0,
    shadow: opts.shadow
  });
}

function circle(slide, x, y, d, fillColor, opts = {}) {
  shape(slide, S.ellipse, {
    x, y, w: d, h: d,
    fillColor,
    lineColor: opts.lineColor || fillColor,
    lineTransparency: opts.lineTransparency ?? 0,
    fillTransparency: opts.fillTransparency ?? 0
  });
}

function line(slide, x, y, w, h, color = C.line, width = 1.2, opts = {}) {
  slide.addShape(S.line, {
    x, y, w, h,
    line: { color, width, transparency: opts.transparency ?? 0, dash: opts.dash }
  });
}

function text(slide, value, x, y, w, h, opts = {}) {
  slide.addText(value, {
    x, y, w, h,
    margin: opts.margin ?? 0,
    fontFace: opts.fontFace || 'Microsoft YaHei',
    fontSize: opts.fontSize || 14,
    bold: opts.bold || false,
    italic: opts.italic || false,
    color: opts.color || C.text,
    align: opts.align || 'left',
    valign: opts.valign || 'top',
    fit: opts.fit || 'shrink',
    breakLine: false,
    paraSpaceAfterPt: opts.paraSpaceAfterPt ?? 0
  });
}

function richText(slide, runs, x, y, w, h, opts = {}) {
  slide.addText(runs, {
    x, y, w, h,
    margin: opts.margin ?? 0,
    fontFace: opts.fontFace || 'Microsoft YaHei',
    fontSize: opts.fontSize || 14,
    color: opts.color || C.text,
    align: opts.align || 'left',
    valign: opts.valign || 'top',
    fit: opts.fit || 'shrink'
  });
}

function bulletList(slide, items, x, y, w, h, opts = {}) {
  slide.addText(items.map((item, i) => ({
    text: item,
    options: { bullet: { indent: 12 }, breakLine: i < items.length - 1 }
  })), {
    x, y, w, h,
    margin: opts.margin ?? 0.03,
    fontFace: 'Microsoft YaHei',
    fontSize: opts.fontSize || 12,
    color: opts.color || C.text,
    fit: 'shrink',
    breakLine: false,
    paraSpaceAfterPt: opts.paraSpaceAfterPt ?? 8
  });
}

function pageTitle(slide, section, title, subtitle, invert = false) {
  const main = invert ? C.white : C.ink;
  const sub = invert ? 'CFE1D8' : C.muted;
  const sec = invert ? C.butter : C.leaf;
  text(slide, section, 0.72, 0.45, 2.8, 0.22, { fontSize: 9, bold: true, color: sec });
  text(slide, title, 0.72, 0.78, 7.9, 0.5, { fontSize: 29, bold: true, color: main });
  if (subtitle) text(slide, subtitle, 0.74, 1.35, 8.3, 0.3, { fontSize: 11.5, color: sub });
}

function footer(slide, n, invert = false) {
  text(slide, `智能食谱生成系统 · ${String(n).padStart(2, '0')}`, 0.72, 7.08, 3.2, 0.18, {
    fontSize: 8,
    color: invert ? 'AEC5BA' : '8D9892'
  });
}

function tag(slide, value, x, y, w, fill = C.mint, color = C.ink) {
  rect(slide, x, y, w, 0.32, fill, { round: true, lineTransparency: 100 });
  text(slide, value, x + 0.02, y + 0.085, w - 0.04, 0.1, { fontSize: 8, bold: true, color, align: 'center' });
}

function card(slide, x, y, w, h, fill = C.white, opts = {}) {
  rect(slide, x, y, w, h, fill, {
    round: true,
    lineColor: opts.lineColor || C.line,
    lineTransparency: opts.lineTransparency ?? 10,
    shadow: opts.shadow === false ? undefined : { type: 'outer', color: '000000', opacity: 0.08, blur: 2, offset: 1, angle: 45 }
  });
}

function miniPlate(slide, x, y, scale = 1) {
  circle(slide, x, y, 1.55 * scale, C.paper2);
  circle(slide, x + 0.16 * scale, y + 0.16 * scale, 1.23 * scale, C.white);
  circle(slide, x + 0.43 * scale, y + 0.42 * scale, 0.55 * scale, C.carrot);
  circle(slide, x + 0.93 * scale, y + 0.53 * scale, 0.28 * scale, C.leaf);
  circle(slide, x + 0.54 * scale, y + 0.82 * scale, 0.24 * scale, C.tomato);
  circle(slide, x + 0.83 * scale, y + 0.92 * scale, 0.25 * scale, C.butter);
}

function iconCircle(slide, x, y, label, fill = C.leaf, color = C.white) {
  circle(slide, x, y, 0.48, fill);
  text(slide, label, x, y + 0.12, 0.48, 0.15, { fontSize: 10, bold: true, color, align: 'center' });
}

function arrow(slide, x, y, w, color = C.carrot) {
  line(slide, x, y, w, 0, color, 2.2);
  shape(slide, S.triangle, {
    x: x + w - 0.06, y: y - 0.12, w: 0.24, h: 0.24,
    rotate: 90,
    fillColor: color,
    lineColor: color
  });
}

function drawWindow(slide, x, y, w, h, title, accent = C.leaf) {
  card(slide, x, y, w, h, C.white, { shadow: true });
  rect(slide, x, y, w, 0.42, C.ink, { round: true, lineTransparency: 100 });
  circle(slide, x + 0.22, y + 0.15, 0.1, C.tomato);
  circle(slide, x + 0.39, y + 0.15, 0.1, C.butter);
  circle(slide, x + 0.56, y + 0.15, 0.1, C.mint);
  text(slide, title, x + 0.78, y + 0.14, w - 1.0, 0.1, { fontSize: 8, color: 'D5E4DE', bold: true });
  rect(slide, x + 0.22, y + 0.7, w - 0.44, 0.42, 'F0F5F2', { round: true, lineTransparency: 100 });
  rect(slide, x + 0.22, y + 1.34, w - 0.44, 0.82, C.cream, { round: true, lineTransparency: 100 });
  rect(slide, x + 0.22, y + 2.36, w - 0.44, 0.28, accent, { round: true, lineTransparency: 100 });
  rect(slide, x + 0.22, y + 2.85, (w - 0.62) / 2, 0.76, 'F6F3EA', { round: true, lineColor: C.line });
  rect(slide, x + 0.4 + (w - 0.62) / 2, y + 2.85, (w - 0.62) / 2, 0.76, 'F6F3EA', { round: true, lineColor: C.line });
}

function drawDb(slide, x, y, w, h, color = C.forest) {
  shape(slide, S.can, { x, y, w, h, fillColor: color, lineColor: color });
  line(slide, x + 0.12, y + h * 0.28, w - 0.24, 0, 'E4EFE8', 0.9, { transparency: 55 });
  line(slide, x + 0.12, y + h * 0.53, w - 0.24, 0, 'E4EFE8', 0.9, { transparency: 55 });
}

function addImageIfExists(slide, file, x, y, w, h, opts = {}) {
  if (!fs.existsSync(file)) return false;
  slide.addImage({ path: file, x, y, w, h, transparency: opts.transparency ?? 0 });
  return true;
}

// 1. Cover
{
  const s = pptx.addSlide();
  bg(s, C.ink);
  rect(s, 0, 0, W, H, C.ink);
  rect(s, 0, 6.42, W, 1.08, '22382F');
  circle(s, 9.2, -0.9, 5.2, '254B3F', { lineTransparency: 100 });
  circle(s, 10.1, 0.15, 3.4, C.leaf, { lineTransparency: 100 });
  circle(s, 11.38, 1.72, 1.1, C.tomato, { lineTransparency: 100 });
  miniPlate(s, 9.83, 1.02, 1.16);
  tag(s, 'AI RECIPE PLATFORM', 0.82, 0.78, 1.78, C.butter, C.ink);
  text(s, '智能食谱生成系统', 0.82, 1.72, 6.7, 0.72, { fontSize: 39, bold: true, color: C.white });
  text(s, '从食材输入到 AI 菜谱生成、收藏编辑、购物清单与后台管理的完整 Web 应用', 0.86, 2.58, 7.05, 0.55, { fontSize: 14.5, color: 'D9E6DF' });
  richText(s, [
    { text: 'React + TypeScript', options: { bold: true } },
    { text: ' / Node.js + Express / MySQL / OpenAI Compatible + Gemini' }
  ], 0.86, 3.42, 6.8, 0.25, { fontSize: 11.5, color: 'B9CEC4' });
  text(s, '计科1班  202406024149  李相阳', 0.86, 5.72, 5.8, 0.32, { fontSize: 17.5, bold: true, color: C.butter });
  text(s, '课程项目答辩', 0.88, 6.13, 1.8, 0.16, { fontSize: 9.5, color: 'B8C9C1' });
}

// 2. Problem & value
{
  const s = pptx.addSlide();
  bg(s, C.paper);
  pageTitle(s, '01 / PROJECT VALUE', '项目要解决什么问题？', '把“今天吃什么”的模糊选择，变成可执行、可保存、可采购的做饭流程。');
  const cols = [
    ['痛点', '有食材，但搭配困难；搜索结果碎片化，收藏和采购分散。', C.ink, C.white],
    ['目标', '让用户输入食材和偏好，快速得到结构化菜谱并管理后续流程。', C.white, C.text],
    ['结果', '形成可登录、可管理、可部署的智能食谱 Web MVP。', C.cream, C.text]
  ];
  cols.forEach((c, i) => {
    const x = 0.78 + i * 4.16;
    card(s, x, 2.12, 3.42, 3.78, c[2], { lineTransparency: i === 1 ? 15 : 100 });
    iconCircle(s, x + 0.35, 2.52, `0${i + 1}`, i === 1 ? C.leaf : C.carrot, i === 1 ? C.white : C.ink);
    text(s, c[0], x + 0.35, 3.18, 1.45, 0.32, { fontSize: 21, bold: true, color: c[3] });
    text(s, c[1], x + 0.35, 3.86, 2.42, 1.0, { fontSize: 12.5, color: i === 0 ? 'D9E4DE' : C.muted });
  });
  miniPlate(s, 10.74, 4.62, 0.58);
  footer(s, 2);
}

// 3. Function map
{
  const s = pptx.addSlide();
  bg(s, C.paper2);
  pageTitle(s, '02 / PRODUCT SCOPE', '功能模块总览', '用户端负责“做饭流程”，管理端负责“系统运营与配置”。');
  rect(s, 0.78, 2.12, 5.8, 4.25, C.white, { round: true, lineColor: C.line });
  rect(s, 6.75, 2.12, 5.8, 4.25, C.ink, { round: true, lineTransparency: 100 });
  text(s, '用户端', 1.2, 2.52, 1.4, 0.35, { fontSize: 23, bold: true });
  text(s, '管理端', 7.17, 2.52, 1.4, 0.35, { fontSize: 23, bold: true, color: C.white });
  const userItems = [
    ['生成菜谱', '食材 + 人数 + 口味 + 时间 + 忌口'],
    ['收藏详情', '保存结果、查看步骤、视频搜索'],
    ['编辑版本', '个人副本、版本历史、历史恢复'],
    ['购物清单', '合并食材数量、勾选、导出']
  ];
  const adminItems = [
    ['数据看板', '用户、菜谱、收藏数量'],
    ['用户菜谱管理', '新增、删除、批量处理'],
    ['AI 配置', 'Mock / OpenAI / Gemini 切换测试'],
    ['站点外观', '名称、Logo、favicon、首页图']
  ];
  userItems.forEach((it, i) => {
    const y = 3.18 + i * 0.68;
    iconCircle(s, 1.22, y - 0.04, String(i + 1), C.leaf);
    text(s, it[0], 1.9, y, 1.55, 0.18, { fontSize: 13.5, bold: true });
    text(s, it[1], 3.42, y, 2.35, 0.18, { fontSize: 9.5, color: C.muted });
  });
  adminItems.forEach((it, i) => {
    const y = 3.18 + i * 0.68;
    iconCircle(s, 7.19, y - 0.04, String(i + 1), i === 2 ? C.carrot : C.mint, i === 2 ? C.ink : C.ink);
    text(s, it[0], 7.87, y, 1.8, 0.18, { fontSize: 13.5, bold: true, color: C.white });
    text(s, it[1], 9.57, y, 2.35, 0.18, { fontSize: 9.5, color: 'C6D8CF' });
  });
  footer(s, 3);
}

// 4. Architecture
{
  const s = pptx.addSlide();
  bg(s, C.paper);
  pageTitle(s, '03 / ARCHITECTURE', '系统架构', '前后端分离，AI 能力封装在统一策略层，部署时由 Nginx 反向代理 API。');
  const y = 2.55;
  const blocks = [
    ['React 前端', 'Vite / TS / Tailwind / i18next', C.white],
    ['Express API', '认证 / 菜谱 / 后台 / 日志', C.cream],
    ['MySQL', '用户 / 菜谱 / 收藏 / 版本', C.white],
    ['AI Provider', 'Mock / OpenAI / Gemini', C.white]
  ];
  blocks.forEach((b, i) => {
    const x = 0.75 + i * 3.15;
    card(s, x, y, 2.45, 2.18, b[2]);
    iconCircle(s, x + 0.28, y + 0.32, String(i + 1), i === 3 ? C.tomato : C.leaf);
    if (i === 2) drawDb(s, x + 1.68, y + 0.27, 0.48, 0.62, C.forest);
    text(s, b[0], x + 0.27, y + 1.08, 1.7, 0.24, { fontSize: 15.5, bold: true });
    text(s, b[1], x + 0.27, y + 1.5, 1.8, 0.34, { fontSize: 9.5, color: C.muted });
    if (i < 3) arrow(s, x + 2.58, y + 1.12, 0.45);
  });
  rect(s, 2.03, 5.65, 9.25, 0.5, C.ink, { round: true, lineTransparency: 100 });
  text(s, 'Docker Compose：MySQL + Backend + Frontend Nginx，一键构建启动；也支持非 Docker 部署', 2.03, 5.82, 9.25, 0.16, { fontSize: 10.8, bold: true, color: C.mint, align: 'center' });
  footer(s, 4);
}

// 5. User workflow
{
  const s = pptx.addSlide();
  bg(s, C.ink);
  pageTitle(s, '04 / USER FLOW', '核心用户流程', '从输入食材到拿着购物清单去采购，形成一个完整闭环。', true);
  const flow = [
    ['输入', '食材和偏好'],
    ['生成', '多道结构化菜谱'],
    ['收藏', '保存喜欢的结果'],
    ['编辑', '个人副本与版本'],
    ['采购', '自动合并购物清单']
  ];
  flow.forEach((f, i) => {
    const x = 0.78 + i * 2.48;
    rect(s, x, 2.6, 1.85, 2.15, i === 4 ? C.butter : C.darkCard, { round: true, lineTransparency: 100 });
    text(s, `0${i + 1}`, x + 0.22, 2.92, 0.55, 0.16, { fontSize: 11, bold: true, color: i === 4 ? C.ink : C.mint });
    text(s, f[0], x + 0.22, 3.26, 1.1, 0.33, { fontSize: 23, bold: true, color: i === 4 ? C.ink : C.white });
    text(s, f[1], x + 0.22, 3.88, 1.25, 0.22, { fontSize: 10, color: i === 4 ? '60421D' : 'CFE1D8' });
    if (i < flow.length - 1) arrow(s, x + 1.93, 3.67, 0.32, i === 3 ? C.butter : C.carrot);
  });
  text(s, '答辩演示建议：生成菜谱 → 收藏详情 → 编辑个人副本 → 查看版本历史 → 生成购物清单', 1.34, 5.8, 10.7, 0.28, { fontSize: 15, bold: true, color: C.butter, align: 'center' });
  footer(s, 5, true);
}

// 6. AI generation
{
  const s = pptx.addSlide();
  bg(s, C.paper);
  pageTitle(s, '05 / AI PIPELINE', 'AI 菜谱生成流程', '统一输入、统一输出，业务层不依赖具体模型，便于扩展和替换。');
  const x1 = 0.86, x2 = 4.95, x3 = 9.1;
  card(s, x1, 2.05, 2.95, 3.45, C.white);
  card(s, x2, 1.72, 3.22, 4.1, C.ink);
  card(s, x3, 2.05, 3.05, 3.45, C.white);
  text(s, '输入层', x1 + 0.32, 2.46, 1.2, 0.28, { fontSize: 20, bold: true });
  bulletList(s, ['食材列表', '人数、口味', '耗时、饮食目标', '忌口信息'], x1 + 0.35, 3.08, 1.92, 1.55, { fontSize: 11.5 });
  text(s, '策略层', x2 + 0.34, 2.17, 1.2, 0.28, { fontSize: 20, bold: true, color: C.white });
  text(s, 'recipeAiService 根据后台设置创建策略：MockRecipeStrategy、OpenAiRecipeStrategy 或 GeminiRecipeStrategy。', x2 + 0.34, 2.82, 2.35, 1.1, { fontSize: 11.2, color: 'D7E4DD' });
  tag(s, 'Promise.allSettled 并行批次', x2 + 0.34, 4.55, 1.95, C.butter, C.ink);
  text(s, '输出层', x3 + 0.32, 2.46, 1.2, 0.28, { fontSize: 20, bold: true });
  bulletList(s, ['标题与分类', '食材数组', '摘要说明', '详细步骤', '图片提示词'], x3 + 0.35, 3.08, 1.92, 1.75, { fontSize: 11.5 });
  arrow(s, 4.05, 3.57, 0.54);
  arrow(s, 8.38, 3.57, 0.54);
  footer(s, 6);
}

// 7. Data model
{
  const s = pptx.addSlide();
  bg(s, 'FFF8EC');
  pageTitle(s, '06 / DATA DESIGN', '数据设计亮点', '关键设计是处理“共享菜谱”和“个人编辑”的边界。');
  const blocks = [
    ['users', '账号、密码哈希、角色'],
    ['recipes', '公共菜谱 / 个人副本 / 原始来源'],
    ['user_saved_recipes', '用户收藏关系'],
    ['recipe_versions', '编辑快照和历史恢复'],
    ['system_settings', 'AI 与站点外观配置'],
    ['usage_logs', '用户和管理员操作日志']
  ];
  blocks.forEach((b, i) => {
    const x = 0.82 + (i % 3) * 4.12;
    const y = 2.08 + Math.floor(i / 3) * 1.58;
    card(s, x, y, 3.28, 1.08, i === 1 || i === 3 ? C.ink : C.white);
    drawDb(s, x + 0.28, y + 0.23, 0.36, 0.48, i === 1 || i === 3 ? C.butter : C.leaf);
    text(s, b[0], x + 0.82, y + 0.24, 1.7, 0.18, { fontSize: 12.5, bold: true, color: i === 1 || i === 3 ? C.white : C.text });
    text(s, b[1], x + 0.82, y + 0.6, 2.0, 0.18, { fontSize: 8.7, color: i === 1 || i === 3 ? 'CFE1D8' : C.muted });
  });
  rect(s, 2.05, 5.65, 9.22, 0.48, C.tomato, { round: true, lineTransparency: 100 });
  text(s, '普通用户编辑共享菜谱时创建个人副本，避免污染公共菜谱；每次编辑前保存版本快照。', 2.05, 5.81, 9.22, 0.14, { fontSize: 10.5, bold: true, color: C.white, align: 'center' });
  footer(s, 7);
}

// 8. Admin
{
  const s = pptx.addSlide();
  bg(s, C.paper2);
  pageTitle(s, '07 / ADMIN CONSOLE', '后台管理能力', '项目不仅能给用户生成菜谱，也提供管理、配置和运维入口。');
  drawWindow(s, 0.78, 2.0, 5.45, 3.92, 'Admin Dashboard', C.leaf);
  text(s, '管理面板', 1.22, 3.27, 1.35, 0.22, { fontSize: 14, bold: true });
  text(s, '统计、用户、菜谱、日志、账号、外观、AI 模型配置', 1.22, 3.78, 3.2, 0.22, { fontSize: 9.5, color: C.muted });
  const items = [
    ['数据统计', '用户 / 菜谱 / 收藏'],
    ['日志审计', '登录、生成、删除、设置'],
    ['AI 配置', 'API Key / Base URL / 模型测试'],
    ['外观配置', '品牌名、Logo、首页图']
  ];
  items.forEach((it, i) => {
    const x = 6.92 + (i % 2) * 2.85;
    const y = 2.08 + Math.floor(i / 2) * 1.72;
    card(s, x, y, 2.35, 1.23, i === 2 ? C.cream : C.white);
    iconCircle(s, x + 0.25, y + 0.34, String(i + 1), i === 2 ? C.carrot : C.leaf, i === 2 ? C.ink : C.white);
    text(s, it[0], x + 0.86, y + 0.28, 1.0, 0.16, { fontSize: 12.3, bold: true });
    text(s, it[1], x + 0.86, y + 0.66, 1.12, 0.2, { fontSize: 8.3, color: C.muted });
  });
  footer(s, 8);
}

// 9. Shopping list highlight
{
  const s = pptx.addSlide();
  bg(s, C.ink);
  pageTitle(s, '08 / FEATURE DETAIL', '购物清单：把菜谱结果落到行动', '收藏菜谱后自动汇总食材，支持单位归一、勾选采购项和手动补充。', true);
  drawWindow(s, 0.86, 2.02, 4.6, 3.78, 'Shopping List', C.carrot);
  const stats = [
    ['单位归一', '克/g、毫升/ml、个/只/枚'],
    ['数量合并', '同名同单位自动累加'],
    ['本地状态', '勾选、隐藏、手动添加']
  ];
  stats.forEach((st, i) => {
    const x = 6.15 + i * 2.17;
    rect(s, x, 2.5, 1.72, 2.75, i === 1 ? C.butter : C.darkCard, { round: true, lineTransparency: 100 });
    text(s, `0${i + 1}`, x + 0.22, 2.86, 0.55, 0.14, { fontSize: 10.5, bold: true, color: i === 1 ? C.ink : C.mint });
    text(s, st[0], x + 0.22, 3.26, 1.14, 0.24, { fontSize: 17, bold: true, color: i === 1 ? C.ink : C.white });
    text(s, st[1], x + 0.22, 3.86, 1.22, 0.46, { fontSize: 9.3, color: i === 1 ? '62431B' : 'CADDD4' });
  });
  text(s, '这一页适合答辩时强调：AI 生成不是终点，项目继续解决“买什么、买多少”的实际问题。', 1.4, 6.17, 10.55, 0.25, { fontSize: 12.8, bold: true, color: C.butter, align: 'center' });
  footer(s, 9, true);
}

// 10. Deploy & security
{
  const s = pptx.addSlide();
  bg(s, C.paper);
  pageTitle(s, '09 / DEPLOYMENT', '部署与上线准备', '项目提供 Docker Compose 和非 Docker 两种部署方式，适配课程演示与服务器上线。');
  rect(s, 0.82, 2.05, 5.42, 3.48, C.ink, { round: true, lineTransparency: 100 });
  rect(s, 7.06, 2.05, 5.42, 3.48, C.cream, { round: true, lineColor: C.line });
  text(s, 'Docker Compose', 1.24, 2.5, 2.6, 0.32, { fontSize: 22, bold: true, color: C.white });
  bulletList(s, ['MySQL 容器自动建表', '后端 API 容器', '前端 Nginx 静态站点', '/api 反向代理到后端'], 1.28, 3.18, 3.6, 1.28, { fontSize: 11.2, color: 'DDEBE4' });
  text(s, '非 Docker 部署', 7.48, 2.5, 2.6, 0.32, { fontSize: 22, bold: true, color: C.ink });
  text(s, 'Node.js + MySQL + Nginx + systemd，另提供 PM2 配置，适合已有服务器环境', 7.5, 3.12, 3.42, 0.56, { fontSize: 11.5, color: C.muted });
  const deploySteps = [
    ['上传代码', 'git / scp'],
    ['配置环境', '.env'],
    ['初始化库', 'db:init'],
    ['启动服务', 'systemd']
  ];
  deploySteps.forEach((step, i) => {
    const x = 7.5 + (i % 2) * 2.18;
    const y = 4.02 + Math.floor(i / 2) * 0.74;
    rect(s, x, y, 1.72, 0.48, i === 3 ? C.leaf : C.white, { round: true, lineColor: i === 3 ? C.leaf : C.line });
    text(s, step[0], x + 0.14, y + 0.09, 0.78, 0.1, { fontSize: 8.6, bold: true, color: i === 3 ? C.white : C.ink });
    text(s, step[1], x + 0.94, y + 0.095, 0.6, 0.1, { fontSize: 7.4, color: i === 3 ? C.mint : C.muted, align: 'right' });
  });
  tag(s, '生产安全清单', 4.98, 5.98, 1.5, C.tomato, C.white);
  text(s, '强 JWT_SECRET · 强管理员密码 · CORS 限制 · 登录/注册/AI 生成限流 · API Key 加密可作为后续优化', 1.42, 6.48, 10.45, 0.16, { fontSize: 10.2, color: C.muted, align: 'center' });
  footer(s, 10);
}

// 11. Engineering quality
{
  const s = pptx.addSlide();
  bg(s, C.paper2);
  pageTitle(s, '10 / ENGINEERING', '工程完成度', '除了功能页面，项目也补齐了测试、配置、脚本和部署文档。');
  const metrics = [
    ['前端', 'React 19 / TS / Vite / Tailwind / i18next'],
    ['后端', 'Express 5 / JWT / bcrypt / mysql2'],
    ['数据库', '6 张核心表，含索引和外键约束'],
    ['测试', 'rateLimit、productionConfig、recipePresenter'],
    ['脚本', 'db:init、admin:create、dev、build'],
    ['部署', 'Dockerfile、Compose、Nginx、systemd']
  ];
  metrics.forEach((m, i) => {
    const x = 0.82 + (i % 3) * 4.1;
    const y = 2.0 + Math.floor(i / 3) * 1.62;
    card(s, x, y, 3.24, 1.14, i === 2 ? C.cream : C.white);
    text(s, m[0], x + 0.3, y + 0.26, 0.9, 0.18, { fontSize: 13.2, bold: true, color: i === 2 ? C.tomato : C.leaf });
    text(s, m[1], x + 1.18, y + 0.25, 1.72, 0.28, { fontSize: 8.8, color: C.muted });
  });
  rect(s, 2.15, 5.7, 8.95, 0.52, C.ink, { round: true, lineTransparency: 100 });
  text(s, '可继续优化方向：分页与筛选增强、AI Key 加密存储、更多单元测试、移动端细节打磨', 2.15, 5.88, 8.95, 0.14, { fontSize: 10.4, bold: true, color: C.mint, align: 'center' });
  footer(s, 11);
}

// 12. Demo route & close
{
  const s = pptx.addSlide();
  bg(s, C.ink);
  miniPlate(s, 10.45, 0.64, 0.9);
  pageTitle(s, '11 / DEMO ROUTE', '答辩演示路线', '按“用户流程 + 管理后台”的顺序讲，逻辑最清晰。', true);
  const steps = [
    ['登录系统', '说明用户身份和权限'],
    ['输入食材生成菜谱', '展示偏好条件'],
    ['收藏并打开详情', '查看步骤、图片和视频搜索'],
    ['编辑个人副本', '展示版本历史与恢复'],
    ['查看购物清单', '展示单位合并和勾选'],
    ['进入后台管理', '展示统计、日志、AI 配置']
  ];
  steps.forEach((st, i) => {
    const x = 1.0 + (i % 2) * 5.85;
    const y = 1.86 + Math.floor(i / 2) * 1.14;
    iconCircle(s, x, y, String(i + 1), i === 5 ? C.tomato : C.butter, i === 5 ? C.white : C.ink);
    text(s, st[0], x + 0.72, y + 0.02, 1.8, 0.18, { fontSize: 13.2, bold: true, color: C.white });
    text(s, st[1], x + 0.72, y + 0.4, 3.25, 0.16, { fontSize: 9.5, color: 'CFE1D8' });
  });
  text(s, '谢谢观看，欢迎老师和同学提出建议', 2.2, 6.18, 8.95, 0.36, { fontSize: 24, bold: true, color: C.butter, align: 'center' });
  text(s, '计科1班  202406024149  李相阳', 4.06, 6.76, 5.2, 0.16, { fontSize: 11.5, color: 'CADDD4', align: 'center' });
}

pptx.writeFile({ fileName: path.join(__dirname, '智能食谱生成系统-项目答辩-精美版.pptx') });
