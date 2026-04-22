import fs from "node:fs/promises";
import path from "node:path";
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  UnderlineType,
  WidthType,
} from "docx";

const ROOT = path.resolve(".");
const OUTPUT_DIR = path.join(ROOT, "docs", "培训资料");
const SITE_URL = "https://points.jxx.asia/login.html";
const CURRENT_DATE = "2026年4月20日";

const COLORS = {
  navy: "1F2A44",
  blue: "2F6BFF",
  sky: "EAF2FF",
  teal: "0F766E",
  tealSoft: "E7F8F5",
  purple: "6D4AFF",
  purpleSoft: "F1EBFF",
  gray: "5B6475",
  lightGray: "F6F8FC",
  border: "D8DFEB",
  gold: "C28A2B",
  goldSoft: "FFF4D7",
  white: "FFFFFF",
  black: "111827",
};

const border = {
  style: BorderStyle.SINGLE,
  size: 1,
  color: COLORS.border,
};

const numberingConfig = [];
for (let index = 1; index <= 24; index += 1) {
  numberingConfig.push({
    reference: `bullet-${index}`,
    levels: [
      {
        level: 0,
        format: "bullet",
        text: "•",
        alignment: AlignmentType.LEFT,
        style: {
          paragraph: {
            indent: { left: 560, hanging: 260 },
            spacing: { after: 60 },
          },
        },
      },
    ],
  });
  numberingConfig.push({
    reference: `number-${index}`,
    levels: [
      {
        level: 0,
        format: "decimal",
        text: "%1.",
        alignment: AlignmentType.LEFT,
        style: {
          paragraph: {
            indent: { left: 560, hanging: 260 },
            spacing: { after: 80 },
          },
        },
      },
    ],
  });
}

function textRun(text, options = {}) {
  return new TextRun({
    text,
    font: "Microsoft YaHei",
    size: options.size ?? 22,
    bold: options.bold ?? false,
    color: options.color ?? COLORS.black,
    italics: options.italics ?? false,
    break: options.break ?? 0,
    underline: options.underline
      ? { type: UnderlineType.SINGLE, color: options.color ?? COLORS.blue }
      : undefined,
  });
}

function paragraph(children, options = {}) {
  return new Paragraph({
    children,
    spacing: options.spacing ?? { after: 120, line: 360 },
    alignment: options.alignment,
    heading: options.heading,
    pageBreakBefore: options.pageBreakBefore,
    indent: options.indent,
    border: options.border,
  });
}

function plainParagraph(text, options = {}) {
  return paragraph(
    [textRun(text, { size: options.size, bold: options.bold, color: options.color })],
    options,
  );
}

function titleParagraph(text, color) {
  return new Paragraph({
    children: [textRun(text, { size: 44, bold: true, color })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 200, line: 520 },
  });
}

function subtitleParagraph(text) {
  return new Paragraph({
    children: [textRun(text, { size: 22, color: COLORS.gray })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 240, line: 360 },
  });
}

function sectionHeading(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 260, after: 120 },
    border: {
      bottom: {
        style: BorderStyle.SINGLE,
        color: COLORS.blue,
        size: 4,
      },
    },
    children: [textRun(text, { size: 28, bold: true, color: COLORS.navy })],
  });
}

function subHeading(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 160, after: 80 },
    children: [textRun(text, { size: 24, bold: true, color: COLORS.teal })],
  });
}

function spacer(height = 120) {
  return new Paragraph({
    children: [new TextRun("")],
    spacing: { after: height },
  });
}

function bulletList(items, reference) {
  return items.map((item) =>
    new Paragraph({
      numbering: { reference, level: 0 },
      spacing: { after: 70, line: 340 },
      children: [textRun(item)],
    }),
  );
}

function numberedList(items, reference) {
  return items.map((item) =>
    new Paragraph({
      numbering: { reference, level: 0 },
      spacing: { after: 70, line: 340 },
      children: [textRun(item)],
    }),
  );
}

function infoBox(title, lines, fill = COLORS.sky, accent = COLORS.blue) {
  const children = [
    paragraph([textRun(title, { size: 22, bold: true, color: accent })], {
      spacing: { after: 80, line: 320 },
    }),
    ...lines.map((line) => plainParagraph(line, { size: 21 })),
  ];

  return new Table({
    width: { size: 9400, type: WidthType.DXA },
    columnWidths: [9400],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 9400, type: WidthType.DXA },
            shading: { fill, type: ShadingType.CLEAR },
            margins: { top: 140, bottom: 140, left: 220, right: 220 },
            borders: {
              top: { ...border, color: accent, size: 4 },
              bottom: border,
              left: border,
              right: border,
            },
            children,
          }),
        ],
      }),
    ],
  });
}

function detailTable(rows, fill = COLORS.lightGray) {
  return new Table({
    width: { size: 9400, type: WidthType.DXA },
    columnWidths: [2200, 7200],
    rows: rows.map(([label, value], rowIndex) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 2200, type: WidthType.DXA },
            shading: { fill: rowIndex % 2 === 0 ? fill : COLORS.white, type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 180, right: 180 },
            borders: { top: border, bottom: border, left: border, right: border },
            children: [plainParagraph(label, { bold: true, color: COLORS.navy })],
          }),
          new TableCell({
            width: { size: 7200, type: WidthType.DXA },
            shading: { fill: rowIndex % 2 === 0 ? fill : COLORS.white, type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 180, right: 180 },
            borders: { top: border, bottom: border, left: border, right: border },
            children: [plainParagraph(value)],
          }),
        ],
      }),
    ),
  });
}

function qaTable(rows) {
  return new Table({
    width: { size: 9400, type: WidthType.DXA },
    columnWidths: [2800, 6600],
    rows: rows.map(([question, answer], rowIndex) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 2800, type: WidthType.DXA },
            shading: {
              fill: rowIndex % 2 === 0 ? COLORS.goldSoft : COLORS.white,
              type: ShadingType.CLEAR,
            },
            margins: { top: 120, bottom: 120, left: 180, right: 180 },
            borders: { top: border, bottom: border, left: border, right: border },
            children: [plainParagraph(question, { bold: true, color: COLORS.navy })],
          }),
          new TableCell({
            width: { size: 6600, type: WidthType.DXA },
            shading: {
              fill: rowIndex % 2 === 0 ? COLORS.goldSoft : COLORS.white,
              type: ShadingType.CLEAR,
            },
            margins: { top: 120, bottom: 120, left: 180, right: 180 },
            borders: { top: border, bottom: border, left: border, right: border },
            children: [plainParagraph(answer)],
          }),
        ],
      }),
    ),
  });
}

function hyperlinkParagraph(prefix, url) {
  return new Paragraph({
    spacing: { after: 120, line: 340 },
    children: [
      textRun(prefix, { bold: true, color: COLORS.navy }),
      new ExternalHyperlink({
        link: url,
        children: [textRun(url, { color: COLORS.blue, underline: true })],
      }),
    ],
  });
}

function coverCardRows(role, focusText) {
  return detailTable([
    ["适用对象", role],
    ["正式站点", SITE_URL],
    ["培训重点", focusText],
    ["建议设备", "电脑端 Chrome 或 Edge 浏览器"],
  ]);
}

function buildFooter(label) {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 80, after: 0 },
        children: [textRun(`${label}  ·  ${SITE_URL}  ·  ${CURRENT_DATE}`, { size: 16, color: COLORS.gray })],
      }),
    ],
  });
}

function createBaseDocument(children, footerLabel) {
  return new Document({
    creator: "Codex",
    title: footerLabel,
    description: footerLabel,
    styles: {
      default: {
        document: {
          run: {
            font: "Microsoft YaHei",
            size: 22,
            color: COLORS.black,
          },
          paragraph: {
            spacing: { line: 360, after: 120 },
          },
        },
      },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 28, bold: true, font: "Microsoft YaHei", color: COLORS.navy },
          paragraph: { spacing: { before: 260, after: 120 }, outlineLevel: 0 },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 24, bold: true, font: "Microsoft YaHei", color: COLORS.teal },
          paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 1 },
        },
      ],
    },
    numbering: { config: numberingConfig },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
          },
        },
        footers: { default: buildFooter(footerLabel) },
        children,
      },
    ],
  });
}

function buildAdminDoc() {
  const children = [
    spacer(240),
    titleParagraph("积分系统教务老师操作手册", COLORS.navy),
    subtitleParagraph("培训版 · 讲清学生主档、班级管理和老师账号管理"),
    coverCardRows("教务老师、管理老师", "上传学生信息、管理班级、开通和维护老师账号"),
    spacer(180),
    infoBox("先记住一条主线", [
      "教务老师的常用顺序是：先建学生主档，再建班，再把学生加入班级，最后开通老师账号。",
      "这样后面老师上课、记分、看榜单，都会使用同一套真实数据，不容易乱。",
    ], COLORS.tealSoft, COLORS.teal),
    new Paragraph({ pageBreakBefore: true, children: [new TextRun("")] }),

    sectionHeading("一、先知道今天主要做什么"),
    plainParagraph("教务老师在这套系统里，最常做的事情一共只有三类："),
    ...bulletList(
      [
        "维护学生主档：新增学生、批量导入、搜索和修改学生基础信息。",
        "管理班级：新建班级、查看班级详情、搜索学生加入班级、整理班级状态。",
        "管理老师账号：开通老师账号、修改账号状态、协助老师重置密码。",
      ],
      "bullet-1",
    ),
    infoBox("当前正式校区", [
      "东新、城北、江湾、三墩、观成、文三、解放路。",
      "培训和日常使用时，请只使用这 7 个正式校区名字。",
    ], COLORS.sky, COLORS.blue),

    sectionHeading("二、登录与进入后台"),
    hyperlinkParagraph("正式登录入口：", SITE_URL),
    ...numberedList(
      [
        "打开登录页后，用教务或管理账号登录。",
        "登录成功后，进入管理台，可以看到老师账号、积分规则、徽章规则等管理入口。",
        "如果当天主要是上传学生和建班，优先进入“学生管理”和“班级管理”。",
        "建议全程使用电脑端 Chrome 或 Edge，不要在手机或微信里做正式维护。",
      ],
      "number-1",
    ),

    sectionHeading("三、如何上传和维护学生信息"),
    subHeading("1. 单个新增学生"),
    ...numberedList(
      [
        "进入“学生管理”页面，点击“新增学生”。",
        "按表单填写学生姓名、显示名称、手机号、年级等基础信息。",
        "保存后，用搜索框按姓名或学号搜一下，确认学生主档已经创建成功。",
      ],
      "number-2",
    ),
    subHeading("2. 批量导入学生"),
    ...numberedList(
      [
        "先点击“下载模板”，按模板准备 CSV 文件。",
        "回到“学生管理”，点击“批量导入 CSV”。",
        "上传后先看预览，确认姓名、学号、手机号这些关键信息没有错位。",
        "确认无误后再导入，导入完成后建议抽查几名学生。",
      ],
      "number-3",
    ),
    subHeading("3. 导入后要做的检查"),
    ...bulletList(
      [
        "能不能搜到学生。",
        "学生姓名、学号、手机号尾号是否正确。",
        "是否出现重复学生，需要及时合并或修正。",
      ],
      "bullet-2",
    ),
    infoBox("一句话提醒", [
      "学生主档是全系统的底层数据。后面老师记分、班级加人、大屏展示，都会依赖这里。",
    ], COLORS.goldSoft, COLORS.gold),

    sectionHeading("四、如何管理班级"),
    subHeading("1. 新建班级"),
    ...numberedList(
      [
        "进入“班级管理”页面，点击“新建班级”。",
        "填写班级名称，选择正式校区、学科和授课老师。",
        "如果已经知道上课时间，也建议一起填好，后面老师更容易识别班级。",
        "保存后，先点进班级详情，确认班级信息没有写错。",
      ],
      "number-4",
    ),
    subHeading("2. 把学生加入班级"),
    ...numberedList(
      [
        "在左侧先选中目标班级。",
        "在班级详情区使用“搜索学生”功能，从学生主档里搜索学生。",
        "找到后直接加入当前班级。",
        "加入完成后，看一下班级人数和学生名单是否正确。",
      ],
      "number-5",
    ),
    subHeading("3. 班级整理建议"),
    ...bulletList(
      [
        "班级名称如果写错，先编辑，不要重复新建。",
        "旧班级或不用的班级，建议归档，不要长期堆在活跃列表里。",
        "只有空班并且没有历史流水的班级，才建议做删除。",
      ],
      "bullet-3",
    ),
    infoBox("教务老师最稳的做法", [
      "建班时尽量一次把校区、学科、授课老师都填对。",
      "如果班级已开始正式使用，优先编辑或归档，不要随便删除。",
    ], COLORS.tealSoft, COLORS.teal),

    sectionHeading("五、如何管理老师账号"),
    ...numberedList(
      [
        "进入管理台，在“在线开通老师账号”区域填写老师名称、账号名和初始密码。",
        "保存后，系统会自动生成登录邮箱映射并建立老师账号。",
        "建议老师第一次登录就修改密码，后续用自己的新密码继续使用。",
        "如果老师忘记密码，教务老师可以在账号管理里协助重置。",
      ],
      "number-6",
    ),
    ...bulletList(
      [
        "账号名尽量简短、好记，方便老师输入。",
        "初始密码建议由教务统一告知，不要在群里长期公开。",
        "暂时不用的老师账号，可以停用，不建议直接删账号。",
      ],
      "bullet-4",
    ),

    sectionHeading("六、培训当天最常见的问题"),
    qaTable([
      ["导入后搜不到学生", "先确认导入是否成功，再检查姓名、学号或手机号尾号是否输入正确。"],
      ["老师说看不到班级", "先确认班级是否已建好、学生是否已加入、授课老师是否已设置正确。"],
      ["班级建错了怎么办", "优先编辑；如果是旧班级或不用了，归档；只有空班且无流水才删除。"],
      ["为什么只看到 7 个校区", "因为系统已经收口为 7 个正式校区，日常培训和正式使用都按这套来。"],
    ]),

    sectionHeading("七、最推荐的日常顺序"),
    ...numberedList(
      [
        "先维护学生主档。",
        "再新建班级并确认班级信息。",
        "把学生加入对应班级。",
        "最后开通老师账号并通知老师登录。",
        "培训结束后，抽查一遍班级人数和老师是否能正常进入老师页。",
      ],
      "number-7",
    ),
    infoBox("最后一句", [
      "教务老师的工作重点不是多，而是顺序要稳。先把底层数据整理好，后面的老师使用就会顺很多。",
    ], COLORS.purpleSoft, COLORS.purple),
  ];

  return createBaseDocument(children, "积分系统教务老师操作手册");
}

function buildTeacherDoc() {
  const children = [
    spacer(240),
    titleParagraph("积分系统任课老师快速上手", COLORS.navy),
    subtitleParagraph("培训版 · 重点讲登录、选班、点按记分和日常常用操作"),
    coverCardRows("任课老师", "登录系统、选择班级、给学生加分/减分、补录和日常课堂使用"),
    spacer(180),
    infoBox("先放心", [
      "老师端的日常使用并不复杂。正常上课时，基本就是：登录 → 选班 → 选学生 → 点按记分。",
      "大部分动作系统都会自动刷新，老师只需要按实际课堂情况正常操作就好。",
    ], COLORS.tealSoft, COLORS.teal),
    new Paragraph({ pageBreakBefore: true, children: [new TextRun("")] }),

    sectionHeading("一、上课前先记住两件事"),
    ...bulletList(
      [
        "正式登录入口是同一个：登录页进入后，再进入老师页面。",
        "建议用电脑端 Chrome 或 Edge，不建议用手机浏览器或微信直接上课记分。",
      ],
      "bullet-5",
    ),
    hyperlinkParagraph("正式登录入口：", SITE_URL),
    plainParagraph("老师账号通常由教务老师统一发放。首次登录时，按页面提示修改自己的密码即可。"),

    sectionHeading("二、登录后先怎么用"),
    ...numberedList(
      [
        "先选校区。",
        "再选班级。",
        "班级打开后，从左侧学生列表里点击一名学生。",
        "选中学生后，右侧就会出现常用加分、减分、补录和兑换功能。",
      ],
      "number-8",
    ),
    infoBox("最常见的使用顺序", [
      "上课时通常不用来回切很多页面。",
      "一般就是盯住当前班级和当前学生，按课堂情况直接点按按钮即可。",
    ], COLORS.sky, COLORS.blue),

    sectionHeading("三、课堂上最常用的几个按钮"),
    subHeading("1. 课堂加分"),
    ...bulletList(
      [
        "进入学生详情后，在“课堂”区域直接点按加分。",
        "常用规则会优先显示，点一下就会立即记分。",
        "“准时到课”现在也在“课堂”里，不在“习惯”里。",
      ],
      "bullet-6",
    ),
    subHeading("2. 减分提醒"),
    plainParagraph("为了方便老师课堂纠偏，系统现在提供 4 个常用减分项："),
    ...bulletList(
      [
        "课上提醒（-1）",
        "影响秩序（-2）",
        "未按要求完成（-1）",
        "需要再次提醒（-1）",
      ],
      "bullet-7",
    ),
    plainParagraph("减分区是给老师做轻量课堂提醒用的，不需要想得太复杂，按实际情况正常点就可以。"),
    subHeading("3. 补录积分"),
    ...bulletList(
      [
        "如果有系统启用前的历史积分，可以用“补录积分”。",
        "补录时建议顺手写上备注，后面自己也更容易回看。",
      ],
      "bullet-8",
    ),
    subHeading("4. 整班 +1"),
    ...bulletList(
      [
        "当全班整体表现不错时，可以使用“整班 +1”。",
        "这是快速操作，适合全班都达到同一课堂要求时使用。",
      ],
      "bullet-9",
    ),

    sectionHeading("四、和学生、班级有关的小操作"),
    ...bulletList(
      [
        "搜索加人：需要把新学生加入当前班级时使用。",
        "移出本班：学生不再上这个班时使用。",
        "积分兑换：学生用积分兑换后，会自动写入扣分流水。",
        "编辑班级：班级名称、时间等写错时可以修正。",
      ],
      "bullet-10",
    ),
    infoBox("一个简单判断", [
      "平时上课，老师最常用的还是选学生后直接点按记分。",
      "班级编辑、加人、移出这类功能，通常在课前或课后处理更稳。",
    ], COLORS.goldSoft, COLORS.gold),

    sectionHeading("五、徽章怎么理解最简单"),
    ...bulletList(
      [
        "老师不用专门去算徽章，只要按真实课堂情况点按行为按钮就可以。",
        "系统会自动累计行为记录，达到阈值后自动解锁对应徽章。",
        "“坚持星”现在跟“准时到课”累计，请在课堂里正常使用“准时到课”按钮。",
      ],
      "bullet-11",
    ),

    sectionHeading("六、老师最常见的问题"),
    qaTable([
      ["登录不进去", "先确认账号和密码是否输入正确；如果还是不行，联系教务老师协助重置密码。"],
      ["看不到班级", "先确认自己是否选对校区，再确认班级是否已经分配给自己。"],
      ["点了按钮没反应", "先稍等一两秒；如果网络慢，刷新后再看流水是否已经记录。"],
      ["想扣分怎么做", "在学生详情里的“减分提醒”区域，直接点常用减分项即可。"],
    ]),

    sectionHeading("七、培训当天给老师的一句提示"),
    infoBox("一句话记住", [
      "登录后先选班，再选学生；课堂里正常点按，系统会自动记分、累计和刷新。",
    ], COLORS.purpleSoft, COLORS.purple),
  ];

  return createBaseDocument(children, "积分系统任课老师快速上手");
}

async function writeDoc(fileName, doc) {
  const filePath = path.join(OUTPUT_DIR, fileName);
  const buffer = await Packer.toBuffer(doc);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const adminPath = await writeDoc("积分系统教务老师操作手册.docx", buildAdminDoc());
  const teacherPath = await writeDoc("积分系统任课老师快速上手.docx", buildTeacherDoc());

  console.log(JSON.stringify({ adminPath, teacherPath }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
