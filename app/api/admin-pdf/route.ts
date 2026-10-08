import { NextResponse } from "next/server";

type PdfLine =
  | {
      type: "title";
      text: string;
    }
  | {
      type: "meta";
      text: string;
    }
  | {
      type: "section";
      text: string;
      color: [number, number, number];
    }
  | {
      type: "body";
      text: string;
    }
  | {
      type: "highlight";
      text: string;
      color: [number, number, number];
    }
  | {
      type: "notice";
      text: string;
    };

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;

const MARGIN_LEFT = 52;
const MARGIN_RIGHT = 52;
const TOP_MARGIN = 54;
const BOTTOM_MARGIN = 52;

const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

const BODY_FONT_SIZE = 10.5;
const BODY_LINE_HEIGHT = 17;

const SECTION_COLORS: [number, number, number][] = [
  [0.25, 0.38, 0.72],
  [0.58, 0.31, 0.65],
  [0.82, 0.42, 0.28],
  [0.18, 0.55, 0.47],
  [0.72, 0.48, 0.20],
  [0.36, 0.43, 0.62],
  [0.67, 0.36, 0.47],
  [0.30, 0.52, 0.65],
];

function cleanMarkdown(text: string) {
  return text
    .trim()
    .replace(/^#{1,6}\s*/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^[-*•]\s+/g, "")
    .replace(/^>\s*/g, "")
    .trim();
}

function isSectionHeading(text: string) {
  return /^\d+[\.\)]\s+/.test(text);
}

function isHighlight(text: string) {
  const value = text.trim();

  return (
    value.startsWith("예를 들어") ||
    value.startsWith("예를 들면") ||
    value.startsWith("중요합니다") ||
    value.startsWith("핵심") ||
    value.startsWith("기억할") ||
    value.startsWith("한 줄 총평") ||
    value.startsWith("한마디로") ||
    value.startsWith("포인트")
  );
}

function isNotice(text: string) {
  const value = text.trim();

  return (
    value.startsWith("※") ||
    value.startsWith("주의") ||
    value.startsWith("참고")
  );
}

function wrapText(text: string, maxChars: number) {
  const result: string[] = [];

  let current = "";

  for (const char of text) {
    current += char;

    if (current.length >= maxChars) {
      result.push(current);
      current = "";
    }
  }

  if (current.trim()) {
    result.push(current);
  }

  return result.length ? result : [""];
}

function buildPdfLines(params: {
  result: string;
  productName?: string;
  birthDate?: string;
  birthTime?: string;
  gender?: string;
}) {
  const {
    result,
    productName,
    birthDate,
    birthTime,
    gender,
  } = params;

  const lines: PdfLine[] = [];

  lines.push({
    type: "title",
    text: "AI 사주 분석 리포트",
  });

  if (productName) {
    lines.push({
      type: "meta",
      text: `분석 상품  ·  ${productName}`,
    });
  }

  if (birthDate) {
    lines.push({
      type: "meta",
      text: `생년월일  ·  ${birthDate}`,
    });
  }

  if (birthTime) {
    lines.push({
      type: "meta",
      text: `출생시간  ·  ${birthTime}`,
    });
  }

  if (gender) {
    lines.push({
      type: "meta",
      text: `성별  ·  ${gender}`,
    });
  }

  lines.push({
    type: "notice",
    text: "이 리포트는 사주 원국과 오행을 바탕으로 자기이해를 돕기 위한 콘텐츠입니다.",
  });

  lines.push({
    type: "body",
    text: "",
  });

  const rawLines = result
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n");

  let sectionIndex = 0;

  for (const rawLine of rawLines) {
    const cleaned = cleanMarkdown(rawLine);

    if (!cleaned) {
      lines.push({
        type: "body",
        text: "",
      });
      continue;
    }

    if (isSectionHeading(cleaned)) {
      const color =
        SECTION_COLORS[sectionIndex % SECTION_COLORS.length];

      lines.push({
        type: "section",
        text: cleaned,
        color,
      });

      sectionIndex += 1;
      continue;
    }

    if (isHighlight(cleaned)) {
      const color =
        SECTION_COLORS[
          Math.max(sectionIndex - 1, 0) % SECTION_COLORS.length
        ];

      lines.push({
        type: "highlight",
        text: cleaned,
        color,
      });

      continue;
    }

    if (isNotice(cleaned)) {
      lines.push({
        type: "notice",
        text: cleaned,
      });

      continue;
    }

    const wrapped = wrapText(cleaned, 34);

    for (const line of wrapped) {
      lines.push({
        type: "body",
        text: line,
      });
    }
  }

  return lines;
}

function estimateLineHeight(line: PdfLine) {
  switch (line.type) {
    case "title":
      return 42;

    case "meta":
      return 19;

    case "section":
      return 39;

    case "highlight":
      return 48;

    case "notice":
      return 34;

    case "body":
      return line.text ? BODY_LINE_HEIGHT : 10;

    default:
      return BODY_LINE_HEIGHT;
  }
}

function makePages(lines: PdfLine[]) {
  const pages: PdfLine[][] = [];

  let currentPage: PdfLine[] = [];
  let currentHeight = TOP_MARGIN;

  for (const line of lines) {
    const lineHeight = estimateLineHeight(line);

    if (
      currentPage.length > 0 &&
      currentHeight + lineHeight >
        PAGE_HEIGHT - BOTTOM_MARGIN
    ) {
      pages.push(currentPage);
      currentPage = [];
      currentHeight = TOP_MARGIN;
    }

    currentPage.push(line);
    currentHeight += lineHeight;
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
}

function escapePdfText(text: string) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function colorCommand(color: [number, number, number]) {
  return `${color[0]} ${color[1]} ${color[2]} rg`;
}

function buildPageContent(
  lines: PdfLine[],
  pageNumber: number,
  totalPages: number
) {
  const commands: string[] = [];

  let y = PAGE_HEIGHT - TOP_MARGIN;

  commands.push("q");

  // 상단 장식선
  commands.push("0.92 0.94 0.98 rg");
  commands.push(
    `${MARGIN_LEFT} ${y + 10} ${CONTENT_WIDTH} 2 re`
  );
  commands.push("f");

  for (const line of lines) {
    if (line.type === "title") {
      y -= 7;

      commands.push("0.12 0.15 0.22 rg");
      commands.push("BT");
      commands.push("/F2 21 Tf");
      commands.push(`${MARGIN_LEFT} ${y} Td`);
      commands.push(`(${escapePdfText(line.text)}) Tj`);
      commands.push("ET");

      y -= 35;
      continue;
    }

    if (line.type === "meta") {
      commands.push("0.35 0.38 0.45 rg");
      commands.push("BT");
      commands.push("/F1 9 Tf");
      commands.push(`${MARGIN_LEFT} ${y} Td`);
      commands.push(`(${escapePdfText(line.text)}) Tj`);
      commands.push("ET");

      y -= 18;
      continue;
    }

    if (line.type === "notice") {
      const boxHeight = 25;

      y -= 4;

      commands.push("0.96 0.97 0.99 rg");
      commands.push(
        `${MARGIN_LEFT} ${y - 6} ${CONTENT_WIDTH} ${boxHeight} re`
      );
      commands.push("f");

      commands.push("0.40 0.43 0.50 rg");
      commands.push("BT");
      commands.push("/F1 8.5 Tf");
      commands.push(`${MARGIN_LEFT + 10} ${y + 3} Td`);
      commands.push(`(${escapePdfText(line.text)}) Tj`);
      commands.push("ET");

      y -= 31;
      continue;
    }

    if (line.type === "section") {
      y -= 6;

      // 왼쪽 컬러 바
      commands.push(colorCommand(line.color));
      commands.push(
        `${MARGIN_LEFT} ${y - 6} 5 27 re`
      );
      commands.push("f");

      // 제목 배경
      commands.push(
        `${line.color[0]} ${line.color[1]} ${line.color[2]} 0.08 rg`
      );
      commands.push(
        `${MARGIN_LEFT + 5} ${y - 6} ${CONTENT_WIDTH - 5} 27 re`
      );
      commands.push("f");

      // 제목
      commands.push(colorCommand(line.color));
      commands.push("BT");
      commands.push("/F2 13 Tf");
      commands.push(`${MARGIN_LEFT + 15} ${y + 2} Td`);
      commands.push(`(${escapePdfText(line.text)}) Tj`);
      commands.push("ET");

      y -= 36;
      continue;
    }

    if (line.type === "highlight") {
      const boxHeight = 34;

      y -= 4;

      commands.push(
        `${line.color[0]} ${line.color[1]} ${line.color[2]} 0.10 rg`
      );

      commands.push(
        `${MARGIN_LEFT} ${y - 7} ${CONTENT_WIDTH} ${boxHeight} re`
      );
      commands.push("f");

      commands.push(colorCommand(line.color));
      commands.push(
        `${MARGIN_LEFT} ${y - 7} 4 ${boxHeight} re`
      );
      commands.push("f");

      const wrapped = wrapText(line.text, 31);

      let localY = y + 4;

      for (const textLine of wrapped.slice(0, 2)) {
        commands.push("BT");
        commands.push("/F2 9.5 Tf");
        commands.push(`${MARGIN_LEFT + 13} ${localY} Td`);
        commands.push(`(${escapePdfText(textLine)}) Tj`);
        commands.push("ET");

        localY -= 14;
      }

      y -= boxHeight + 8;
      continue;
    }

    if (line.type === "body") {
      if (!line.text) {
        y -= 7;
        continue;
      }

      commands.push("0.16 0.18 0.23 rg");
      commands.push("BT");
      commands.push(`/F1 ${BODY_FONT_SIZE} Tf`);
      commands.push(`${MARGIN_LEFT} ${y} Td`);
      commands.push(`(${escapePdfText(line.text)}) Tj`);
      commands.push("ET");

      y -= BODY_LINE_HEIGHT;
    }
  }

  // 페이지 번호
  commands.push("0.55 0.57 0.62 rg");
  commands.push("BT");
  commands.push("/F1 8 Tf");
  commands.push(`${PAGE_WIDTH - 95} 25 Td`);
  commands.push(
    `(${pageNumber} / ${totalPages}) Tj`
  );
  commands.push("ET");

  commands.push("Q");

  return commands.join("\n");
}

function buildPdf(pages: PdfLine[][]) {
  const objects: string[] = [];

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");

  const pageObjectNumbers: number[] = [];

  const fontRegularNumber = 3;
  const fontBoldNumber = 4;

  let nextObjectNumber = 5;

  for (let i = 0; i < pages.length; i++) {
    pageObjectNumbers.push(nextObjectNumber);
    nextObjectNumber += 2;
  }

  objects.push(
    `<< /Type /Pages /Kids [${pageObjectNumbers
      .map((n) => `${n} 0 R`)
      .join(" ")}] /Count ${pages.length} >>`
  );

  objects.push(
    "<< /Type /Font /Subtype /Type0 /BaseFont /HYSMyeongJo-Medium /Encoding /UniKS-UCS2-H >>"
  );

  objects.push(
    "<< /Type /Font /Subtype /Type0 /BaseFont /HYSMyeongJo-Medium /Encoding /UniKS-UCS2-H >>"
  );

  for (let i = 0; i < pages.length; i++) {
    const pageNumber = pageObjectNumbers[i];
    const contentNumber = pageNumber + 1;

    const content = buildPageContent(
      pages[i],
      i + 1,
      pages.length
    );

    objects[pageNumber - 1] =
      `<< /Type /Page /Parent 2 0 R ` +
      `/MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      `/Resources << /Font << /F1 ${fontRegularNumber} 0 R /F2 ${fontBoldNumber} 0 R >> >> ` +
      `/Contents ${contentNumber} 0 R >>`;

    objects[contentNumber - 1] =
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
  }

  let pdf = "%PDF-1.4\n%\xFF\xFF\xFF\xFF\n";

  const offsets: number[] = [0];

  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdf.length);

    pdf += `${i + 1} 0 obj\n`;
    pdf += `${objects[i]}\n`;
    pdf += "endobj\n";
  }

  const xrefOffset = pdf.length;

  pdf += `xref\n`;
  pdf += `0 ${objects.length + 1}\n`;
  pdf += `0000000000 65535 f \n`;

  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += "trailer\n";
  pdf += `<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += "startxref\n";
  pdf += `${xrefOffset}\n`;
  pdf += "%%EOF";

  return new TextEncoder().encode(pdf);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      result,
      productName,
      birthDate,
      birthTime,
      gender,
    } = body;

    if (!result || typeof result !== "string") {
      return NextResponse.json(
        { error: "PDF로 변환할 분석 결과가 없습니다." },
        { status: 400 }
      );
    }

    const lines = buildPdfLines({
      result,
      productName,
      birthDate,
      birthTime,
      gender,
    });

    const pages = makePages(lines);

    const pdfBytes = buildPdf(pages);

    const safeProductName =
      typeof productName === "string"
        ? productName.replace(/[\\/:*?"<>|]/g, "")
        : "사주분석";

    const filename = `${safeProductName}_사주분석.pdf`;

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          filename
        )}"`,
        "X-PDF-Generated": "true",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("ADMIN PDF ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "PDF 생성 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
