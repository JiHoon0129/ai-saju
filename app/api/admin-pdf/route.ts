import { NextResponse } from "next/server";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;

const MARGIN_LEFT = 50;
const MARGIN_RIGHT = 50;
const TOP_Y = 785;
const BOTTOM_Y = 55;

const TITLE_SIZE = 18;
const BODY_SIZE = 10.5;
const LINE_HEIGHT = 18;

const MAX_CHARS_PER_LINE = 42;
const MAX_LINES_PER_PAGE = 39;

function utf16Hex(text: string) {
  const bytes: number[] = [];

  for (const char of text) {
    const codePoint = char.codePointAt(0) ?? 0;

    if (codePoint <= 0xffff) {
      bytes.push(
        (codePoint >> 8) & 0xff,
        codePoint & 0xff
      );
    } else {
      const value = codePoint - 0x10000;

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
      byte.toString(16).padStart(2, "0")
    )
    .join("");
}

function pdfText(text: string) {
  return `<${utf16Hex(text)}>`;
}

function cleanText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^[•●▪◦]\s*/gm, "• ")
    .trim();
}

function splitLongLine(
  text: string,
  maxChars = MAX_CHARS_PER_LINE
) {
  const result: string[] = [];

  if (!text) {
    return [""];
  }

  let current = "";

  for (const char of text) {
    current += char;

    if (current.length >= maxChars) {
      result.push(current);
      current = "";
    }
  }

  if (current) {
    result.push(current);
  }

  return result;
}

function makeTextLines(text: string) {
  const cleaned = cleanText(text);

  const result: string[] = [];

  for (const paragraph of cleaned.split("\n")) {
    if (!paragraph.trim()) {
      result.push("");
      continue;
    }

    const parts =
      splitLongLine(paragraph);

    result.push(...parts);
  }

  return result;
}

function escapeLiteral(text: string) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function buildPageContent(
  title: string,
  lines: string[],
  pageNumber: number,
  totalPages: number
) {
  const commands: string[] = [];

  commands.push("q");

  // 흰색 배경
  commands.push("1 1 1 rg");
  commands.push(
    `0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT} re`
  );
  commands.push("f");

  // 제목 영역
  commands.push("0.07 0.09 0.15 rg");
  commands.push(
    `0 ${PAGE_HEIGHT - 72} ${PAGE_WIDTH} 72 re`
  );
  commands.push("f");

  commands.push("BT");
  commands.push("/F1 18 Tf");
  commands.push("1 1 1 rg");
  commands.push(
    `50 ${PAGE_HEIGHT - 45} Td`
  );
  commands.push(
    `${pdfText(title)} Tj`
  );
  commands.push("ET");

  // 본문
  let y = TOP_Y - 25;

  for (const line of lines) {
    if (y < BOTTOM_Y + 25) {
      break;
    }

    if (!line.trim()) {
      y -= LINE_HEIGHT / 2;
      continue;
    }

    commands.push("BT");
    commands.push(
      `/F1 ${BODY_SIZE} Tf`
    );
    commands.push("0.12 0.12 0.12 rg");
    commands.push(
      `${MARGIN_LEFT} ${y} Td`
    );
    commands.push(
      `${pdfText(line)} Tj`
    );
    commands.push("ET");

    y -= LINE_HEIGHT;
  }

  // 페이지 하단
  commands.push("0.55 0.55 0.55 RG");
  commands.push(
    `${MARGIN_LEFT} 38 m ${
      PAGE_WIDTH - MARGIN_RIGHT
    } 38 l S`
  );

  commands.push("BT");
  commands.push("/F1 8 Tf");
  commands.push("0.45 0.45 0.45 rg");
  commands.push("50 24 Td");

  commands.push(
    `${pdfText(
      `AI 사주 분석 리포트  ·  ${pageNumber} / ${totalPages}`
    )} Tj`
  );

  commands.push("ET");

  commands.push("Q");

  return commands.join("\n");
}

function makeObjects(
  pages: string[][]
) {
  const objects: string[] = [];

  // 1 Catalog
  objects.push(
    `<< /Type /Catalog /Pages 2 0 R >>`
  );

  // 2 Pages
  const pageObjectNumbers: number[] = [];

  // 3 이후 페이지 객체
  let nextObject = 3;

  for (let i = 0; i < pages.length; i++) {
    pageObjectNumbers.push(nextObject);
    nextObject += 1;
  }

  const kids = pageObjectNumbers
    .map((number) => `${number} 0 R`)
    .join(" ");

  objects.push(
    `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`
  );

  // 페이지 객체
  for (let i = 0; i < pages.length; i++) {
    const contentObject =
      3 + pages.length + i;

    objects.push(
      `<< /Type /Page /Parent 2 0 R ` +
        `/MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
        `/Resources << /Font << /F1 ${
          3 + pages.length * 2
        } 0 R >> >> ` +
        `/Contents ${contentObject} 0 R >>`
    );
  }

  // 콘텐츠 객체
  for (const pageContent of pages) {
    const contentLength =
      Buffer.byteLength(
        pageContent,
        "utf8"
      );

    objects.push(
      `<< /Length ${contentLength} >>\n` +
        `stream\n` +
        `${pageContent}\n` +
        `endstream`
    );
  }

  const fontObject =
    3 + pages.length * 2;

  // Type0 font
  objects.push(
    `<< ` +
      `/Type /Font ` +
      `/Subtype /Type0 ` +
      `/BaseFont /HYSMyeongJo-Medium ` +
      `/Encoding /UniKS-UTF16-H ` +
      `/DescendantFonts [${fontObject + 1} 0 R] ` +
      `>>`
  );

  // CIDFont
  objects.push(
    `<< ` +
      `/Type /Font ` +
      `/Subtype /CIDFontType0 ` +
      `/BaseFont /HYSMyeongJo-Medium ` +
      `/CIDSystemInfo << ` +
      `/Registry (Adobe) ` +
      `/Ordering (Korea1) ` +
      `/Supplement 2 ` +
      `>> ` +
      `/FontDescriptor ${fontObject + 2} 0 R ` +
      `/DW 1000 ` +
      `>>`
  );

  // FontDescriptor
  objects.push(
    `<< ` +
      `/Type /FontDescriptor ` +
      `/FontName /HYSMyeongJo-Medium ` +
      `/Flags 4 ` +
      `/FontBBox [-250 -250 1000 1000] ` +
      `/ItalicAngle 0 ` +
      `/Ascent 880 ` +
      `/Descent -120 ` +
      `/CapHeight 700 ` +
      `/StemV 80 ` +
      `>>`
  );

  return objects;
}

function buildPdf(
  title: string,
  allLines: string[]
) {
  const pages: string[][] = [];

  let currentPage: string[] = [];

  for (const line of allLines) {
    if (
      currentPage.length >=
      MAX_LINES_PER_PAGE
    ) {
      pages.push(currentPage);
      currentPage = [];
    }

    currentPage.push(line);
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  if (pages.length === 0) {
    pages.push([""]);
  }

  const totalPages = pages.length;

  const pageContents = pages.map(
    (pageLines, index) =>
      buildPageContent(
        title,
        pageLines,
        index + 1,
        totalPages
      )
  );

  const objects = makeObjects(
    pageContents
  );

  const chunks: string[] = [
    "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n",
  ];

  const offsets: number[] = [0];

  for (
    let i = 0;
    i < objects.length;
    i += 1
  ) {
    const objectNumber = i + 1;

    offsets.push(
      Buffer.byteLength(
        chunks.join(""),
        "binary"
      )
    );

    chunks.push(
      `${objectNumber} 0 obj\n`
    );

    chunks.push(objects[i]);

    chunks.push("\nendobj\n");
  }

  const xrefOffset =
    Buffer.byteLength(
      chunks.join(""),
      "binary"
    );

  chunks.push(
    `xref\n0 ${objects.length + 1}\n`
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
      `${String(offsets[i]).padStart(
        10,
        "0"
      )} 00000 n \n`
    );
  }

  chunks.push(
    `trailer\n` +
      `<< /Size ${
        objects.length + 1
      } /Root 1 0 R >>\n` +
      `startxref\n` +
      `${xrefOffset}\n` +
      `%%EOF`
  );

  return Buffer.from(
    chunks.join(""),
    "binary"
  );
}

export async function POST(
  request: Request
) {
  try {
    const body = await request.json();

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
        { status: 400 }
      );
    }

    const title =
      "AI 사주 분석 리포트";

    const headerLines = [
      `상품: ${String(productName)}`,
      `생년월일: ${String(birthDate)}`,
      `태어난 시간: ${String(birthTime)}`,
      `성별: ${String(gender)}`,
      "",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "",
    ];

    const bodyLines =
      makeTextLines(result);

    const footerLines = [
      "",
      "",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "",
      "※ 본 결과는 전통 사주 해석을 참고한 AI 콘텐츠이며 미래를 확정적으로 예측하지 않습니다.",
    ];

    const allLines = [
      ...headerLines,
      ...bodyLines,
      ...footerLines,
    ];

    const pdf = buildPdf(
      title,
      allLines
    );

    if (!pdf.length) {
      throw new Error(
        "PDF 데이터가 생성되지 않았습니다."
      );
    }

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type":
          "application/pdf",
        "Content-Disposition":
          'attachment; filename="ai-saju-result.pdf"',
        "Content-Length":
          String(pdf.length),
        "Cache-Control":
          "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
        "X-PDF-Generated": "true",
      },
    });
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
      { status: 500 }
    );
  }
}
