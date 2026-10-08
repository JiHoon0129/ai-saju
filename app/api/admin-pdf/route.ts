import { NextResponse } from "next/server";

type PdfLineType =
  | "title"
  | "meta"
  | "section"
  | "body"
  | "blank"
  | "notice";

type PdfLine = {
  text: string;
  type: PdfLineType;
  color: [number, number, number];
  size: number;
  gapAfter: number;
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;

const LEFT = 52;
const RIGHT = 52;
const TOP = 58;
const BOTTOM = 55;

const CONTENT_WIDTH =
  PAGE_WIDTH - LEFT - RIGHT;

const LINE_HEIGHT = 18;

const SECTION_COLORS: Array<
  [number, number, number]
> = [
  [0.12, 0.32, 0.62],
  [0.52, 0.22, 0.62],
  [0.10, 0.46, 0.38],
  [0.68, 0.36, 0.10],
  [0.72, 0.22, 0.25],
  [0.25, 0.35, 0.55],
];

const BODY_COLOR: [number, number, number] = [
  0.12,
  0.12,
  0.14,
];

const META_COLOR: [number, number, number] = [
  0.36,
  0.39,
  0.44,
];

const NOTICE_COLOR: [number, number, number] = [
  0.40,
  0.40,
  0.40,
];

function toUtf16Hex(text: string) {
  const bytes: number[] = [];

  for (const char of text) {
    const codePoint =
      char.codePointAt(0) ?? 0;

    if (codePoint <= 0xffff) {
      bytes.push(
        (codePoint >> 8) & 0xff,
        codePoint & 0xff
      );
    } else {
      const value =
        codePoint - 0x10000;

      const high =
        0xd800 + (value >> 10);

      const low =
        0xdc00 + (value & 0x3ff);

      bytes.push(
        (high >> 8) & 0xff,
        high & 0xff,
        (low >> 8) & 0xff,
        low & 0xff
      );
    }
  }

  return bytes
    .map((byte) =>
      byte
        .toString(16)
        .padStart(2, "0")
    )
    .join("");
}

function escapePdfText(text: string) {
  return `<${toUtf16Hex(text)}>`;
}

function cleanMarkdown(text: string) {
  return text
    .replace(/^#{1,6}\s*/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/^\s*[-*]\s+/g, "• ")
    .replace(/^\s*>\s*/g, "")
    .trimEnd();
}

function normalizeText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ");
}

function isSectionHeading(text: string) {
  const cleaned = cleanMarkdown(text).trim();

  if (!cleaned) {
    return false;
  }

  if (
    /^(\d+)[.)]\s+/.test(cleaned)
  ) {
    return true;
  }

  if (
    /^(제\s*\d+\s*[장절부])/.test(
      cleaned
    )
  ) {
    return true;
  }

  const sectionKeywords = [
    "총평",
    "종합",
    "성향",
    "오행",
    "재물",
    "직업",
    "연애",
    "대인관계",
    "건강",
    "장점",
    "주의점",
    "궁합",
    "인연",
    "결론",
    "마무리",
  ];

  return sectionKeywords.some(
    (keyword) =>
      cleaned === keyword ||
      cleaned.startsWith(
        `${keyword}:`
      ) ||
      cleaned.startsWith(
        `${keyword} `
      )
  );
}

function sectionIndexFromText(
  text: string,
  currentIndex: number
) {
  const match =
    cleanMarkdown(text).match(
      /^(\d+)[.)]/
    );

  if (match) {
    const number =
      Number(match[1]) - 1;

    if (
      Number.isFinite(number) &&
      number >= 0
    ) {
      return number;
    }
  }

  return currentIndex;
}

function estimateCharactersPerLine(
  fontSize: number
) {
  if (fontSize >= 17) {
    return 25;
  }

  if (fontSize >= 13) {
    return 31;
  }

  return 34;
}

function wrapText(
  text: string,
  maxCharacters: number
) {
  const result: string[] = [];

  if (!text) {
    return [""];
  }

  let current = "";

  for (const char of text) {
    current += char;

    if (
      current.length >=
      maxCharacters
    ) {
      result.push(current);
      current = "";
    }
  }

  if (current) {
    result.push(current);
  }

  return result;
}

function buildPdfLines(
  result: string,
  productName: string,
  birthDate: string,
  birthTime: string,
  gender: string
) {
  const lines: PdfLine[] = [];

  lines.push({
    text: "AI 사주 분석 결과",
    type: "title",
    color: [0.10, 0.12, 0.16],
    size: 21,
    gapAfter: 22,
  });

  lines.push({
    text: `상품  ·  ${productName}`,
    type: "meta",
    color: META_COLOR,
    size: 10,
    gapAfter: 5,
  });

  lines.push({
    text: `생년월일  ·  ${birthDate}`,
    type: "meta",
    color: META_COLOR,
    size: 10,
    gapAfter: 5,
  });

  lines.push({
    text: `태어난 시간  ·  ${birthTime}`,
    type: "meta",
    color: META_COLOR,
    size: 10,
    gapAfter: 5,
  });

  lines.push({
    text: `성별  ·  ${gender}`,
    type: "meta",
    color: META_COLOR,
    size: 10,
    gapAfter: 18,
  });

  const normalized =
    normalizeText(result);

  const paragraphs =
    normalized.split("\n");

  let currentSection = 0;

  for (const rawLine of paragraphs) {
    const cleaned =
      cleanMarkdown(rawLine);

    if (!cleaned) {
      lines.push({
        text: "",
        type: "blank",
        color: BODY_COLOR,
        size: 10,
        gapAfter: 7,
      });

      continue;
    }

    if (isSectionHeading(cleaned)) {
      currentSection =
        sectionIndexFromText(
          cleaned,
          currentSection
        );

      const color =
        SECTION_COLORS[
          currentSection %
            SECTION_COLORS.length
        ];

      lines.push({
        text: cleaned,
        type: "section",
        color,
        size: 14,
        gapAfter: 12,
      });

      continue;
    }

    const maxCharacters =
      estimateCharactersPerLine(
        10.5
      );

    const wrapped =
      wrapText(
        cleaned,
        maxCharacters
      );

    for (
      let index = 0;
      index < wrapped.length;
      index += 1
    ) {
      lines.push({
        text: wrapped[index],
        type: "body",
        color: BODY_COLOR,
        size: 10.5,
        gapAfter:
          index ===
          wrapped.length - 1
            ? 5
            : 2,
      });
    }
  }

  lines.push({
    text: "",
    type: "blank",
    color: BODY_COLOR,
    size: 10,
    gapAfter: 10,
  });

  lines.push({
    text:
      "본 결과는 전통 사주 해석을 참고한 AI 콘텐츠이며 미래를 확정적으로 예측하지 않습니다.",
    type: "notice",
    color: NOTICE_COLOR,
    size: 8.5,
    gapAfter: 4,
  });

  return lines;
}

function makePages(
  lines: PdfLine[]
) {
  const pages: PdfLine[][] = [];

  let currentPage: PdfLine[] = [];

  let usedHeight = TOP;

  const availableHeight =
    PAGE_HEIGHT - TOP - BOTTOM;

  for (const line of lines) {
    let lineHeight =
      line.type === "title"
        ? 27
        : line.type === "section"
        ? 22
        : line.type === "blank"
        ? line.gapAfter
        : 17;

    lineHeight += line.gapAfter;

    if (
      usedHeight +
        lineHeight >
        PAGE_HEIGHT - BOTTOM
    ) {
      if (
        currentPage.length > 0
      ) {
        pages.push(
          currentPage
        );
      }

      currentPage = [];

      usedHeight = TOP;
    }

    currentPage.push(line);

    usedHeight += lineHeight;
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  if (pages.length === 0) {
    pages.push([]);
  }

  return pages;
}

function colorCommand(
  color: [number, number, number]
) {
  return `${color[0].toFixed(
    3
  )} ${color[1].toFixed(
    3
  )} ${color[2].toFixed(
    3
  )} rg`;
}

function buildPageContent(
  lines: PdfLine[],
  pageNumber: number,
  totalPages: number
) {
  const commands: string[] = [];

  commands.push("BT");

  let y =
    PAGE_HEIGHT - TOP;

  for (const line of lines) {
    if (
      line.type === "blank"
    ) {
      y -= line.gapAfter;
      continue;
    }

    if (
      y <
      BOTTOM + 30
    ) {
      break;
    }

    if (
      line.type === "section"
    ) {
      const color =
        line.color;

      commands.push(
        `${color[0].toFixed(
          3
        )} ${color[1].toFixed(
          3
        )} ${color[2].toFixed(
          3
        )} rg`
      );

      commands.push(
        `50 ${y - 5} ${PAGE_WIDTH - 100} 2 re f`
      );

      y -= 15;
    }

    commands.push(
      colorCommand(
        line.color
      )
    );

    commands.push(
      `/F1 ${line.size} Tf`
    );

    commands.push(
      `52 ${y} Td`
    );

    commands.push(
      `${escapePdfText(
        line.text
      )} Tj`
    );

    commands.push(
      `-52 -${y} Td`
    );

    if (
      line.type ===
      "section"
    ) {
      y -= 23;
    } else if (
      line.type === "title"
    ) {
      y -= 29;
    } else if (
      line.type === "meta"
    ) {
      y -= 17;
    } else {
      y -= 17;
    }

    y -= line.gapAfter;
  }

  commands.push("ET");

  commands.push("BT");

  commands.push(
    colorCommand([
      0.55,
      0.55,
      0.58,
    ])
  );

  commands.push(
    "/F1 8 Tf"
  );

  commands.push(
    `260 28 Td`
  );

  commands.push(
    `${escapePdfText(
      `${pageNumber} / ${totalPages}`
    )} Tj`
  );

  commands.push("ET");

  return commands.join("\n");
}

function buildPdf(
  pages: PdfLine[][]
) {
  const totalPages =
    pages.length;

  const objects: string[] = [];

  objects.push(
    `<< /Type /Catalog /Pages 2 0 R >>`
  );

  const pageObjects: number[] =
    [];

  const firstPageObject = 3;

  const firstContentObject =
    firstPageObject +
    totalPages;

  const fontObject =
    firstContentObject +
    totalPages;

  const cidFontObject =
    fontObject + 1;

  for (
    let i = 0;
    i < totalPages;
    i += 1
  ) {
    pageObjects.push(
      firstPageObject + i
    );
  }

  objects.push(
    `<< /Type /Pages /Kids [${pageObjects
      .map(
        (number) =>
          `${number} 0 R`
      )
      .join(
        " "
      )}] /Count ${totalPages} >>`
  );

  for (
    let i = 0;
    i < totalPages;
    i += 1
  ) {
    const pageObject =
      firstPageObject + i;

    const contentObject =
      firstContentObject + i;

    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontObject} 0 R >> >> /Contents ${contentObject} 0 R >>`
    );
  }

  for (
    let i = 0;
    i < totalPages;
    i += 1
  ) {
    const content =
      buildPageContent(
        pages[i],
        i + 1,
        totalPages
      );

    objects.push(
      `<< /Length ${Buffer.byteLength(
        content,
        "utf8"
      )} >>\nstream\n${content}\nendstream`
    );
  }

  objects.push(
    `<< /Type /Font /Subtype /Type0 /BaseFont /HYSMyeongJo-Medium /Encoding /UniKS-UCS2-H /DescendantFonts [${cidFontObject} 0 R] >>`
  );

  objects.push(
    `<< /Type /Font /Subtype /CIDFontType0 /BaseFont /HYSMyeongJo-Medium /CIDSystemInfo << /Registry (Adobe) /Ordering (Korea1) /Supplement 2 >> /DW 1000 >>`
  );

  const chunks: string[] = [
    "%PDF-1.4\n",
  ];

  const offsets: number[] = [
    0,
  ];

  for (
    let i = 0;
    i < objects.length;
    i += 1
  ) {
    offsets.push(
      Buffer.byteLength(
        chunks.join(""),
        "utf8"
      )
    );

    chunks.push(
      `${i + 1} 0 obj\n${objects[i]}\nendobj\n`
    );
  }

  const xrefOffset =
    Buffer.byteLength(
      chunks.join(""),
      "utf8"
    );

  chunks.push(
    `xref\n0 ${
      objects.length + 1
    }\n`
  );

  chunks.push(
    "0000000000 65535 f \n"
  );

  for (
    let i = 1;
    i <= objects.length;
    i += 1
  ) {
    chunks.push(
      `${String(
        offsets[i]
      ).padStart(
        10,
        "0"
      )} 00000 n \n`
    );
  }

  chunks.push(
    `trailer\n<< /Size ${
      objects.length + 1
    } /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  );

  return Buffer.from(
    chunks.join(""),
    "utf8"
  );
}

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const {
      result,
      productName = "사주 분석",
      birthDate = "",
      birthTime = "",
      gender = "",
    } = body;

    if (
      typeof result !== "string" ||
      !result.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "PDF로 만들 분석 결과가 없습니다.",
        },
        {
          status: 400,
        }
      );
    }

    const lines =
      buildPdfLines(
        result,
        String(productName),
        String(birthDate),
        String(birthTime),
        String(gender)
      );

    const pages =
      makePages(lines);

    const pdf =
      buildPdf(pages);

    const safeProductName =
      String(productName)
        .replace(
          /[\\/:*?"<>|]/g,
          ""
        )
        .trim() ||
      "ai-saju";

    return new NextResponse(
      pdf,
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `attachment; filename="${safeProductName}-result.pdf"`,

          "Cache-Control":
            "no-store",

          "X-PDF-Generated":
            "true",
        },
      }
    );
  } catch (error) {
    console.error(
      "admin-pdf error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "PDF 생성 중 오류가 발생했습니다.",
      },
      {
        status: 500,
      }
    );
  }
}
