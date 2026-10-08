import { NextResponse } from "next/server";

function toUtf16Hex(text: string): string {
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

function pdfText(text: string): string {
  return `<${toUtf16Hex(text)}>`;
}

function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/```/g, "")
    .replace(/##/g, "")
    .replace(/\*\*/g, "")
    .replace(/\t/g, "    ")
    .trim();
}

function splitLine(
  text: string,
  maxLength = 36
): string[] {
  const result: string[] = [];

  if (!text) {
    return [""];
  }

  let current = "";

  for (const char of text) {
    current += char;

    if (current.length >= maxLength) {
      result.push(current);
      current = "";
    }
  }

  if (current) {
    result.push(current);
  }

  return result;
}

function makeTextLines(
  result: string,
  productName: string,
  birthDate: string,
  birthTime: string,
  gender: string
): string[] {
  const lines: string[] = [];

  lines.push("AI 사주 분석 결과");
  lines.push("");

  lines.push(`상품: ${productName || "사주 분석"}`);
  lines.push(`생년월일: ${birthDate || "-"}`);
  lines.push(`출생시간: ${birthTime || "-"}`);
  lines.push(`성별: ${gender || "-"}`);

  lines.push("");
  lines.push("--------------------------------");
  lines.push("");

  const normalized = normalizeText(result);

  const paragraphs = normalized.split("\n");

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();

    if (!trimmed) {
      lines.push("");
      continue;
    }

    const wrapped = splitLine(trimmed);

    for (const line of wrapped) {
      lines.push(line);
    }

    lines.push("");
  }

  lines.push("--------------------------------");
  lines.push("");
  lines.push(
    "본 결과는 전통 사주 해석을 참고한 AI 콘텐츠입니다."
  );
  lines.push(
    "미래를 확정적으로 예측하는 내용은 아닙니다."
  );

  return lines;
}

function escapePdfLiteral(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function buildPdf(lines: string[]): Buffer {
  const PAGE_WIDTH = 595;
  const PAGE_HEIGHT = 842;

  const LEFT = 50;
  const TOP = 790;
  const LINE_HEIGHT = 17;

  const MAX_LINES_PER_PAGE = 42;

  const pages: string[][] = [];

  let currentPage: string[] = [];

  for (const line of lines) {
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
    pages.push(["AI 사주 분석 결과"]);
  }

  const objects: string[] = [];

  // 1. Catalog
  objects.push(
    "<< /Type /Catalog /Pages 2 0 R >>"
  );

  // 2. Pages
  const pageCount = pages.length;

  const pageObjectStart = 3;

  const pageReferences: string[] = [];

  for (let i = 0; i < pageCount; i += 1) {
    pageReferences.push(
      `${pageObjectStart + i} 0 R`
    );
  }

  objects.push(
    `<< /Type /Pages /Kids [${pageReferences.join(
      " "
    )}] /Count ${pageCount} >>`
  );

  // 페이지 객체
  const contentObjectStart =
    pageObjectStart + pageCount;

  for (let i = 0; i < pageCount; i += 1) {
    const pageObjectNumber =
      pageObjectStart + i;

    const contentObjectNumber =
      contentObjectStart + i;

    objects.push(
      `<< /Type /Page /Parent 2 0 R ` +
        `/MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
        `/Resources << /Font << /F1 ${
          contentObjectStart + pageCount
        } 0 R >> >> ` +
        `/Contents ${contentObjectNumber} 0 R >>`
    );
  }

  // 콘텐츠 객체
  for (const pageLines of pages) {
    const contentLines: string[] = [];

    contentLines.push("BT");
    contentLines.push("/F1 11 Tf");
    contentLines.push(
      `${LEFT} ${TOP} Td`
    );

    for (let i = 0; i < pageLines.length; i += 1) {
      const line = pageLines[i];

      if (i === 0) {
        contentLines.push(
          "/F1 16 Tf"
        );
        contentLines.push(
          `${pdfText(line)} Tj`
        );
        contentLines.push(
          "/F1 11 Tf"
        );
      } else {
        contentLines.push(
          `${pdfText(line)} Tj`
        );
      }

      contentLines.push(
        `0 -${LINE_HEIGHT} Td`
      );
    }

    contentLines.push("ET");

    const content = contentLines.join("\n");

    objects.push(
      `<< /Length ${Buffer.byteLength(
        content,
        "utf8"
      )} >>\nstream\n${content}\nendstream`
    );
  }

  // CID Font
  const fontObjectNumber =
    contentObjectStart + pageCount;

  objects.push(
    `<< /Type /Font ` +
      `/Subtype /Type0 ` +
      `/BaseFont /HYSMyeongJo-Medium ` +
      `/Encoding /UniKS-UTF16-H ` +
      `/DescendantFonts [${fontObjectNumber + 1} 0 R] >>`
  );

  objects.push(
    `<< /Type /Font ` +
      `/Subtype /CIDFontType0 ` +
      `/BaseFont /HYSMyeongJo-Medium ` +
      `/CIDSystemInfo << ` +
      `/Registry (Adobe) ` +
      `/Ordering (Korea1) ` +
      `/Supplement 2 >> ` +
      `/DW 1000 >>`
  );

  const pdfParts: string[] = [];
  const offsets: number[] = [];

  pdfParts.push("%PDF-1.4\n");

  for (
    let i = 0;
    i < objects.length;
    i += 1
  ) {
    const objectNumber = i + 1;

    offsets.push(
      Buffer.byteLength(
        pdfParts.join(""),
        "binary"
      )
    );

    pdfParts.push(
      `${objectNumber} 0 obj\n`
    );

    pdfParts.push(objects[i]);

    pdfParts.push("\nendobj\n");
  }

  const xrefOffset =
    Buffer.byteLength(
      pdfParts.join(""),
      "binary"
    );

  pdfParts.push(
    `xref\n0 ${
      objects.length + 1
    }\n`
  );

  pdfParts.push(
    "0000000000 65535 f \n"
  );

  for (const offset of offsets) {
    pdfParts.push(
      `${String(offset).padStart(
        10,
        "0"
      )} 00000 n \n`
    );
  }

  pdfParts.push(
    `trailer\n<< /Size ${
      objects.length + 1
    } /Root 1 0 R >>\n`
  );

  pdfParts.push(
    `startxref\n${xrefOffset}\n%%EOF`
  );

  const pdfString =
    pdfParts.join("");

  return Buffer.from(
    pdfString,
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

    const lines = makeTextLines(
      result,
      String(productName),
      String(birthDate),
      String(birthTime),
      String(gender)
    );

    const pdf = buildPdf(lines);

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="ai-saju-result.pdf"',
        "Content-Length":
          String(pdf.length),
        "Cache-Control": "no-store",
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
