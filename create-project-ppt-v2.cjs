const pptxgen = require('D:/npm/node_modules/pptxgenjs');

const pptx = new pptxgen();
pptx.defineLayout({ name: 'WIDE', width: 13.333, height: 7.5 });
pptx.layout = 'WIDE';
pptx.author = '李相阳';
pptx.subject = '智能食谱生成系统项目演示';
pptx.title = '智能食谱生成系统';
pptx.company = '计科1班';
pptx.lang = 'zh-CN';
pptx.theme = {
  headFontFace: 'Microsoft YaHei UI',
  bodyFontFace: 'Microsoft YaHei',
  lang: 'zh-CN'
};

const C = {
  ink: '10231F',
  ink2: '183A34',
  green: '24735A',
  mint: '8FD6BF',
  orange: 'F2A65A',
  red: 'DD6B4D',
  cream: 'FFF6E8',
  paper: 'F6F4EF',
  white: 'FFFFFF',
  gray: '65736E',
  pale: 'E6EFEA',
  line: 'D6E0DA'
};

function bg(slide, color = C.paper) {
  slide.background = { color };
}

function txt(slide, text, x, y, w, h, opt = {}) {
  slide.addText(text, {
    x, y, w, h,
    fontFace: opt.fontFace || 'Microsoft YaHei',
    fontSize: opt.fontSize || 14,
    bold: opt.bold || false,
    color: opt.color || C.ink,
    margin: opt.margin ?? 0,
    align: opt.align || 'left',
    valign: opt.valign || 'top',
    fit: opt.fit || 'shrink',
    breakLine: false
  });
}

function rect(slide, x, y, w, h, fill, line = fill, radius = false) {
  slide.addShape(radius ? pptx.ShapeType.roundRect : pptx.ShapeType.rect, {
    x, y, w, h,
    rectRadius: radius ? 0.08 : undefined,
    fill: { color: fill },
    line: { color: line, transparency: 0 }
  });
}

function softCard(slide, x, y, w, h, fill = C.white) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    rectRadius: 0.08,
    fill: { color: fill },
    line: { color: C.line, transparency: 15 },
    shadow: { type: 'outer', color: '000000', opacity: 0.09, blur: 2, offset: 1, angle: 45 }
  });
}

function circle(slide, x, y, d, fill) {
  slide.addShape(pptx.ShapeType.ellipse, {
    x, y, w: d, h: d,
    fill: { color: fill },
    line: { color: fill }
  });
}

function title(slide, label, headline, sub) {
  txt(slide, label, 0.72, 0.48, 2.8, 0.22, { fontSize: 9, bold: true, color: C.green });
  txt(slide, headline, 0.72, 0.78, 7.6, 0.55, { fontSize: 28, bold: true, color: C.ink });
  if (sub) txt(slide, sub, 0.74, 1.36, 7.2, 0.35, { fontSize: 11, color: C.gray });
}

function footer(slide, n) {
  txt(slide, `智能食谱生成系统 · ${String(n).padStart(2, '0')}`, 0.72, 7.08, 3, 0.16, {
    fontSize: 8,
    color: '8A9892'
  });
}

function foodMark(slide, x, y, s = 1) {
  circle(slide, x, y, 2.1 * s, C.pale);
  circle(slide, x + 0.23 * s, y + 0.23 * s, 1.64 * s, C.white);
  circle(slide, x + 0.55 * s, y + 0.53 * s, 0.72 * s, C.orange);
  circle(slide, x + 1.13 * s, y + 0.72 * s, 0.38 * s, C.green);
  circle(slide, x + 0.82 * s, y + 1.18 * s, 0.34 * s, C.cream);
  circle(slide, x + 0.62 * s, y + 0.78 * s, 0.3 * s, C.red);
}

function smallTag(slide, text, x, y, w, fill = C.pale, color = C.ink) {
  rect(slide, x, y, w, 0.34, fill, fill, true);
  txt(slide, text, x, y + 0.08, w, 0.11, { fontSize: 8, bold: true, color, align: 'center' });
}

function addBullets(slide, arr, x, y, w, h, size = 12) {
  slide.addText(arr.map((v, i) => ({
    text: v,
    options: { bullet: true, breakLine: i < arr.length - 1 }
  })), {
    x, y, w, h,
    fontFace: 'Microsoft YaHei',
    fontSize: size,
    color: C.ink,
    fit: 'shrink',
    paraSpaceAfterPt: 8
  });
}

// 1
{
  const s = pptx.addSlide();
  bg(s, C.ink);
  rect(s, 0, 6.55, 13.333, 0.95, C.ink2, C.ink2);
  circle(s, 9.2, -0.5, 4.6, '1E4D42');
  circle(s, 10.1, 0.45, 2.8, C.green);
  foodMark(s, 10.45, 0.8, 0.8);
  smallTag(s, 'AI RECIPE PLATFORM', 0.8, 0.78, 1.75, C.orange, C.ink);
  txt(s, '智能食谱生成系统', 0.78, 1.75, 6.8, 0.65, { fontSize: 36, bold: true, color: C.white });
  txt(s, '从食材输入到菜谱生成、收藏编辑、购物清单与后台管理的完整 Web 应用', 0.82, 2.58, 6.6, 0.55, {
    fontSize: 14,
    color: 'D4E2DC'
  });
  txt(s, '计科1班  202406024149  李相阳', 0.82, 5.64, 6.1, 0.35, {
    fontSize: 18,
    bold: true,
    color: C.orange
  });
  txt(s, '课程作业项目演示', 0.83, 6.05, 2.4, 0.18, { fontSize: 10, color: 'BCD0C8' });
}

// 2
{
  const s = pptx.addSlide();
  bg(s);
  title(s, '01 / WHY', '项目要解决什么问题？', '把“今天吃什么”的选择问题，转化为可执行的智能做饭流程。');
  rect(s, 0.72, 2.12, 3.35, 3.85, C.ink, C.ink, true);
  txt(s, '用户痛点', 1.05, 2.55, 1.8, 0.3, { fontSize: 21, bold: true, color: C.white });
  txt(s, '冰箱里有食材，但不知道如何搭配成一顿饭。普通搜索结果碎片化，收藏和采购也分散。', 1.05, 3.18, 2.45, 1.2, {
    fontSize: 13,
    color: 'D8E3DE'
  });
  rect(s, 4.55, 2.12, 3.35, 3.85, C.white, C.line, true);
  txt(s, '系统目标', 4.9, 2.55, 1.8, 0.3, { fontSize: 21, bold: true });
  addBullets(s, ['输入食材即可生成菜谱', '支持口味、时间、忌口偏好', '收藏后形成购物清单'], 4.9, 3.22, 2.35, 1.45, 12);
  rect(s, 8.38, 2.12, 3.95, 3.85, C.cream, C.cream, true);
  txt(s, '最终效果', 8.75, 2.55, 1.8, 0.3, { fontSize: 21, bold: true });
  txt(s, '一个可登录、可演示、可部署的 MVP：前台给用户做饭建议，后台给管理员配置与管理能力。', 8.75, 3.18, 2.75, 1.1, {
    fontSize: 13,
    color: C.gray
  });
  foodMark(s, 10.4, 4.45, 0.52);
  footer(s, 2);
}

// 3
{
  const s = pptx.addSlide();
  bg(s, 'F2F6F3');
  title(s, '02 / ARCHITECTURE', '系统架构', '前后端分离，AI 能力通过统一策略层接入。');
  const boxes = [
    ['React 前端', '页面、路由、状态、交互'],
    ['Express API', '认证、菜谱、后台接口'],
    ['MySQL 数据库', '用户、收藏、版本、日志'],
    ['AI Provider', 'Mock / OpenAI / Gemini']
  ];
  boxes.forEach((b, i) => {
    const x = 0.75 + i * 3.15;
    softCard(s, x, 2.35, 2.35, 2.1, i === 1 ? C.cream : C.white);
    circle(s, x + 0.28, 2.68, 0.48, i === 3 ? C.red : C.green);
    txt(s, String(i + 1), x + 0.28, 2.82, 0.48, 0.1, { fontSize: 9, bold: true, color: C.white, align: 'center' });
    txt(s, b[0], x + 0.28, 3.33, 1.7, 0.25, { fontSize: 16, bold: true });
    txt(s, b[1], x + 0.28, 3.78, 1.7, 0.35, { fontSize: 10.5, color: C.gray });
    if (i < 3) {
      rect(s, x + 2.55, 3.23, 0.38, 0.18, C.orange, C.orange);
      s.addShape(pptx.ShapeType.triangle, {
        x: x + 2.9, y: 3.13, w: 0.25, h: 0.38, rotate: 90,
        fill: { color: C.orange }, line: { color: C.orange }
      });
    }
  });
  txt(s, '部署方式：Docker Compose / Nginx + systemd / PM2', 2.65, 5.65, 8.1, 0.28, {
    fontSize: 15,
    bold: true,
    color: C.green,
    align: 'center'
  });
  footer(s, 3);
}

// 4
{
  const s = pptx.addSlide();
  bg(s, C.ink);
  txt(s, '核心功能闭环', 0.78, 0.62, 4.3, 0.48, { fontSize: 30, bold: true, color: C.white });
  txt(s, '不是单个菜谱页面，而是完整的“做饭助手”流程。', 0.8, 1.2, 5.8, 0.28, { fontSize: 12, color: 'CFE2D9' });
  const flow = [
    ['生成', '输入食材与偏好'],
    ['收藏', '保存喜欢的结果'],
    ['编辑', '个人副本不影响他人'],
    ['采购', '自动合并购物清单']
  ];
  flow.forEach((f, i) => {
    const x = 0.95 + i * 3.05;
    rect(s, x, 2.58, 2.25, 2.0, i === 3 ? C.orange : '234C42', i === 3 ? C.orange : '234C42', true);
    txt(s, `0${i + 1}`, x + 0.25, 2.9, 0.65, 0.18, { fontSize: 12, bold: true, color: i === 3 ? C.ink : C.mint });
    txt(s, f[0], x + 0.25, 3.25, 1.25, 0.35, { fontSize: 24, bold: true, color: i === 3 ? C.ink : C.white });
    txt(s, f[1], x + 0.25, 3.85, 1.58, 0.3, { fontSize: 10.5, color: i === 3 ? '4D3621' : 'CFE2D9' });
  });
  txt(s, '演示时重点展示：生成带偏好的菜谱 → 收藏 → 编辑个人副本 → 查看购物清单。', 1.55, 5.75, 10.25, 0.32, {
    fontSize: 16,
    bold: true,
    color: C.orange,
    align: 'center'
  });
  footer(s, 4);
}

// 5
{
  const s = pptx.addSlide();
  bg(s);
  title(s, '03 / AI FLOW', 'AI 生成流程', '统一输入、统一输出，便于后续扩展更多模型。');
  softCard(s, 0.9, 2.0, 3.0, 3.2, C.white);
  txt(s, '输入层', 1.22, 2.35, 1.2, 0.28, { fontSize: 20, bold: true });
  addBullets(s, ['食材列表', '人数与口味', '时间与忌口'], 1.22, 3.0, 1.85, 1.2, 12);
  softCard(s, 5.15, 1.65, 3.0, 3.9, C.cream);
  txt(s, '策略层', 5.48, 2.05, 1.2, 0.28, { fontSize: 20, bold: true });
  txt(s, '根据后台配置切换 Mock、OpenAI 或 Gemini。业务代码不需要关心具体模型。', 5.48, 2.75, 1.95, 1.1, { fontSize: 12, color: C.gray });
  softCard(s, 9.4, 2.0, 3.0, 3.2, C.white);
  txt(s, '输出层', 9.72, 2.35, 1.2, 0.28, { fontSize: 20, bold: true });
  addBullets(s, ['标题', '食材', '摘要', '详细步骤'], 9.72, 3.0, 1.85, 1.4, 12);
  rect(s, 4.15, 3.2, 0.55, 0.16, C.orange, C.orange);
  rect(s, 8.45, 3.2, 0.55, 0.16, C.orange, C.orange);
  footer(s, 5);
}

// 6
{
  const s = pptx.addSlide();
  bg(s, 'FFF9EF');
  title(s, '04 / DATA', '数据设计亮点', '解决“多人收藏同一道菜谱，编辑是否会互相影响”的问题。');
  rect(s, 0.9, 2.0, 3.25, 3.65, C.white, C.line, true);
  txt(s, '公共菜谱', 1.25, 2.4, 1.5, 0.3, { fontSize: 20, bold: true });
  txt(s, 'AI 生成后统一入库，可被多个用户收藏。', 1.25, 3.05, 2.0, 0.75, { fontSize: 12, color: C.gray });
  rect(s, 5.05, 2.0, 3.25, 3.65, C.ink, C.ink, true);
  txt(s, '个人副本', 5.4, 2.4, 1.5, 0.3, { fontSize: 20, bold: true, color: C.white });
  txt(s, '普通用户编辑共享菜谱时自动复制成自己的版本，不污染公共数据。', 5.4, 3.05, 2.08, 0.9, { fontSize: 12, color: 'D8E3DE' });
  rect(s, 9.2, 2.0, 3.25, 3.65, C.white, C.line, true);
  txt(s, '版本历史', 9.55, 2.4, 1.5, 0.3, { fontSize: 20, bold: true });
  txt(s, '每次编辑前保存快照，详情页支持查看和恢复历史版本。', 9.55, 3.05, 2.0, 0.9, { fontSize: 12, color: C.gray });
  footer(s, 6);
}

// 7
{
  const s = pptx.addSlide();
  bg(s);
  title(s, '05 / ADMIN', '后台管理能力', '项目不仅有用户页面，也有系统配置、运营和运维入口。');
  const items = [
    ['数据看板', '用户、菜谱、收藏数量'],
    ['用户管理', '新增、删除、批量删除'],
    ['菜谱管理', '查看生成记录与删除异常数据'],
    ['使用日志', '记录登录、生成、编辑和后台操作'],
    ['AI 配置', 'API Key、Base URL、模型测试'],
    ['外观配置', '名称、Logo、favicon、首页图']
  ];
  items.forEach((it, i) => {
    const x = 0.85 + (i % 3) * 4.1;
    const y = 1.9 + Math.floor(i / 3) * 1.85;
    softCard(s, x, y, 3.35, 1.25, i === 4 ? C.cream : C.white);
    circle(s, x + 0.25, y + 0.34, 0.42, i === 4 ? C.orange : C.green);
    txt(s, it[0], x + 0.85, y + 0.25, 1.5, 0.22, { fontSize: 15, bold: true });
    txt(s, it[1], x + 0.85, y + 0.65, 2.1, 0.22, { fontSize: 9.5, color: C.gray });
  });
  footer(s, 7);
}

// 8
{
  const s = pptx.addSlide();
  bg(s, C.ink);
  txt(s, '部署与上线准备', 0.78, 0.66, 4.8, 0.5, { fontSize: 30, bold: true, color: C.white });
  txt(s, '我为项目准备了两种服务器部署方式，便于不同环境使用。', 0.8, 1.28, 5.8, 0.28, { fontSize: 12, color: 'CFE2D9' });
  rect(s, 0.95, 2.15, 5.3, 3.45, '244C42', '244C42', true);
  txt(s, 'Docker Compose', 1.35, 2.62, 2.3, 0.28, { fontSize: 22, bold: true, color: C.white });
  addBullets(s, ['MySQL 容器', '后端 API 容器', '前端 Nginx 容器', '/api 反向代理'], 1.35, 3.25, 3.3, 1.25, 12);
  rect(s, 7.05, 2.15, 5.3, 3.45, C.orange, C.orange, true);
  txt(s, '非 Docker 部署', 7.45, 2.62, 2.3, 0.28, { fontSize: 22, bold: true, color: C.ink });
  txt(s, 'Node.js + MySQL + Nginx + systemd，也提供 PM2 备选配置。', 7.45, 3.25, 3.35, 0.8, { fontSize: 13, color: '4D3621' });
  txt(s, '生产安全：强 JWT_SECRET、强管理员密码、CORS 限制、登录与生成限流。', 2.1, 6.35, 9.1, 0.3, {
    fontSize: 14,
    bold: true,
    color: C.mint,
    align: 'center'
  });
  footer(s, 8);
}

// 9
{
  const s = pptx.addSlide();
  bg(s, 'F2F6F3');
  title(s, '06 / DEMO', '上台演示路线', '建议按“用户流程 + 管理后台”的方式讲，逻辑最清楚。');
  const demo = [
    ['1', '登录系统', '说明用户身份和权限'],
    ['2', '生成菜谱', '输入食材并设置偏好'],
    ['3', '收藏详情', '打开详情页查看步骤'],
    ['4', '编辑副本', '展示个人副本和版本历史'],
    ['5', '购物清单', '展示食材数量单位合并'],
    ['6', '后台管理', '展示统计、日志、AI 配置']
  ];
  demo.forEach((d, i) => {
    const x = 1.0 + (i % 2) * 5.95;
    const y = 1.72 + Math.floor(i / 2) * 1.55;
    circle(s, x, y + 0.05, 0.5, i === 5 ? C.red : C.green);
    txt(s, d[0], x, y + 0.2, 0.5, 0.1, { fontSize: 9, bold: true, color: C.white, align: 'center' });
    txt(s, d[1], x + 0.72, y + 0.05, 1.55, 0.24, { fontSize: 15, bold: true });
    txt(s, d[2], x + 0.72, y + 0.44, 3.7, 0.2, { fontSize: 10.5, color: C.gray });
  });
  footer(s, 9);
}

// 10
{
  const s = pptx.addSlide();
  bg(s, C.ink);
  foodMark(s, 9.75, 0.75, 0.95);
  txt(s, '项目总结', 0.78, 0.78, 3.5, 0.5, { fontSize: 34, bold: true, color: C.white });
  txt(s, '这个项目完成了从需求、开发、部署到演示的完整闭环。', 0.82, 1.45, 5.8, 0.28, { fontSize: 13, color: 'CFE2D9' });
  const cards = [
    ['产品完整', '生成、收藏、编辑、购物清单'],
    ['工程完整', '前后端、数据库、权限、部署'],
    ['可继续优化', '测试、分页、密钥加密、移动端']
  ];
  cards.forEach((c, i) => {
    rect(s, 0.95 + i * 4.05, 3.0, 3.15, 1.65, i === 1 ? C.orange : '244C42', i === 1 ? C.orange : '244C42', true);
    txt(s, c[0], 1.22 + i * 4.05, 3.42, 2.55, 0.25, {
      fontSize: 20,
      bold: true,
      color: i === 1 ? C.ink : C.white,
      align: 'center'
    });
    txt(s, c[1], 1.23 + i * 4.05, 3.95, 2.5, 0.22, {
      fontSize: 10.5,
      color: i === 1 ? '4D3621' : 'CFE2D9',
      align: 'center'
    });
  });
  txt(s, '谢谢观看，欢迎老师和同学提出建议', 2.1, 5.75, 9.2, 0.36, {
    fontSize: 22,
    bold: true,
    color: C.orange,
    align: 'center'
  });
  txt(s, '计科1班  202406024149  李相阳', 3.7, 6.38, 5.9, 0.22, {
    fontSize: 13,
    color: 'D6E4DE',
    align: 'center'
  });
}

pptx.writeFile({ fileName: '智能食谱生成系统-项目演示-李相阳-v2.pptx' });
