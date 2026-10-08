import { NextResponse } from "next/server";

function toUtf16Hex(text: string) {
  const bytes: number[] = [];

  for (const char of text) {
    const codePoint = char.codePointAt(0) ?? 0;

    if (codePoint <= 0xffff) {
      bytes.push((codePoint >> 8) & 0xff, codePoint & 0xff);
    } else {
      const value = codePoint - 0x10000;
      const high = 0xd800 + (value >> 10);
      const low = 0xdc00 + (value & 0x3ff);
      bytes.push(
        (high >> 8) & 0xff,
        high & 0xff,
        (low >> 8) & 0xff,
        low & 0xff
      );
    }
  }

  return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function escapePdfText(text: string) {
  return `<${toUtf16Hex(text)}>`;
}

function normalizeText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, "    ")
    .trim();
}

function splitLine(text: string, maxLength = 42) {
  const lines: string[] = [];
  let current = "";

  for (const char of text) {
    current += char;

    if (current.length >= maxLength) {
      lines.push(current);
      current = "";
    }
  }

  if (current) lines.push(current);

  return lines;
}

function makeBodyLines(text: string) {
  const result: string[] = [];

  for (const paragraph of normalizeText(text).split("\n")) {
    if (!paragraph.trim()) {
      result.push("");
      continue;
    }

    result.push(...splitLine(paragraph));
  }

  return result;
}

function isHeading(line: string) {
  return /^\s*\d+\s*[\.\)]\s*\S+/.test(line);
}

function colorCommand(index: number) {
  const colors = [
    [0.16, 0.42, 0.78],
    [0.16, 0.58, 0.38],
    [0.76, 0.38, 0.16],
    [0.55, 0.32, 0.72],
    [0.72, 0.24, 0.36],
    [0.82, 0.56, 0.12],
    [0.12, 0.52, 0.62],
    [0.44, 0.44, 0.44],
  ];

  const [r, g, b] = colors[index % colors.length];
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`;
}

function grayText() {
  return "0.12 0.12 0.12 rg";
}

type PageItem = {
  kind: "title" | "info" | "toc" | "body" | "notice";
  text: string;
  colorIndex?: number;
};

function buildPageContent(pageItems: PageItem[]) {
  const commands: string[] = [
    "q",
    "BT",
    "/F1 1 Tf",
    "50 790 Td",
  ];

  for (const item of pageItems) {
    if (item.kind === "title") {
      commands.push(
        "0 -8 Td",
        "/F1 22 Tf",
        grayText(),
        escapePdfText(item.text) + " Tj",
        "0 -34 Td"
      );
      continue;
    }

    if (item.kind === "info") {
      commands.push(
        "/F1 10 Tf",
        grayText(),
        escapePdfText(item.text) + " Tj",
        "0 -16 Td"
      );
      continue;
    }

    if (item.kind === "toc") {
      commands.push(
        "0 -6 Td",
        "/F1 17 Tf",
        colorCommand(item.colorIndex ?? 0),
        escapePdfText(item.text) + " Tj",
        "0 -28 Td"
      );
      continue;
    }

    if (item.kind === "notice") {
      commands.push(
        "0 -4 Td",
        "/F1 9 Tf",
        "0.38 0.38 0.38 rg",
        escapePdfText(item.text) + " Tj",
        "0 -16 Td"
      );
      continue;
    }

    commands.push(
      "/F1 11 Tf",
      grayText(),
      escapePdfText(item.text) + " Tj",
      "0 -18 Td"
    );
  }

  commands.push("ET", "Q");

  return Buffer.from(commands.join("\n"), "utf8");
}

function objectBuffer(header: string, body: Buffer | string) {
  const bodyBuffer = Buffer.isBuffer(body)
    ? body
    : Buffer.from(body, "utf8");

  return Buffer.concat([
    Buffer.from(`${header}\nstream\n`, "utf8"),
    bodyBuffer,
    Buffer.from("\nendstream", "utf8"),
  ]);
}

function buildPdf(
  title: string,
  infoLines: string[],
  tocLines: string[],
  bodyLines: string[]
) {
  const pageWidth = 595;
  const pageHeight = 842;
  const topY = 790;
  const bottomY = 55;

  const allItems: PageItem[] = [];

  allItems.push({
    kind: "title",
    text: title,
  });

  for (const line of infoLines) {
    allItems.push({
      kind: "info",
      text: line,
    });
  }

  if (tocLines.length > 0) {
    allItems.push({
      kind: "toc",
      text: "목차",
      colorIndex: 0,
    });

    tocLines.forEach((line, index) => {
      allItems.push({
        kind: "toc",
        text: line,
        colorIndex: index,
      });
    });
  }

  for (const line of bodyLines) {
    allItems.push({
      kind: "body",
      text: line,
    });
  }

  allItems.push({
    kind: "notice",
    text: "※ 본 결과는 전통 사주 해석을 참고한 AI 콘텐츠이며 미래를 확정적으로 예측하지 않습니다.",
  });

  const pages: PageItem[][] = [];
  let current: PageItem[] = [];
  let estimatedY = topY;

  const heightFor = (item: PageItem) => {
    if (item.kind === "title") return 42;
    if (item.kind === "info") return 16;
    if (item.kind === "toc") return item.text === "목차" ? 34 : 28;
    if (item.kind === "notice") return 18;
    return 18;
  };

  for (const item of allItems) {
    const height = heightFor(item);

    if (estimatedY - height < bottomY && current.length > 0) {
      pages.push(current);
      current = [];
      estimatedY = topY;
    }

    current.push(item);
    estimatedY -= height;
  }

  if (current.length > 0) {
    pages.push(current);
  }

  const objects: Buffer[] = [];

  const pageCount = pages.length;
  const firstPageId = 3;
  const firstContentId = firstPageId + pageCount;
  const fontId = firstContentId + pageCount;

  objects[0] = Buffer.from(
    "<< /Type /Catalog /Pages 2 0 R >>",
    "utf8"
  );

  const pageIds = Array.from(
    { length: pageCount },
    (_, index) => firstPageId + index
  );

  objects[1] = Buffer.from(
    `<< /Type /Pages /Kids [${pageIds.join(
      " "
    )}] /Count ${pageCount} >>`,
    "utf8"
  );

  for (let i = 0; i < pageCount; i += 1) {
    const pageId = firstPageId + i;
    const contentId = firstContentId + i;
    const content = buildPageContent(pages[i]);

    objects[pageId - 1] = Buffer.from(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`,
      "utf8"
    );

    objects[contentId - 1] = objectBuffer(
      `<< /Length ${content.length} >>`,
      content
    );
  }

  objects[fontId - 1] = Buffer.from(
    `<< /Type /Font /Subtype /Type0 /BaseFont /HYSMyeongJo-Medium /Encoding /UniKS-UCS2-H /DescendantFonts [${fontId + 1} 0 R] >>`,
    "utf8"
  );

  objects[fontId] = Buffer.from(
    `<< /Type /Font /Subtype /CIDFontType0 /BaseFont /HYSMyeongJo-Medium /CIDSystemInfo << /Registry (Adobe) /Ordering (Korea1) /Supplement 2 >> /DW 1000 >>`,
    "utf8"
  );

  const chunks: Buffer[] = [
    Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "binary"),
  ];

  const offsets: number[] = [0];
  let currentOffset = chunks[0].length;

  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(currentOffset);

    const object = Buffer.concat([
      Buffer.from(`${i + 1} 0 obj\n`, "utf8"),
      objects[i],
      Buffer.from("\nendobj\n", "utf8"),
    ]);

    chunks.push(object);
    currentOffset += object.length;
  }

  const xrefOffset = currentOffset;

  const xref: string[] = [
    "xref",
    `0 ${objects.length + 1}`,
    "0000000000 65535 f ",
  ];

  for (let i = 1; i < offsets.length; i += 1) {
    xref.push(`${String(offsets[i]).padStart(10, "0")} 00000 n `);
  }

  chunks.push(
    Buffer.from(
      `${xref.join("\n")}\ntrailer\n<< /Size ${
        objects.length + 1
      } /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`,
      "utf8"
    )
  );

  return Buffer.concat(chunks);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      result,
      productName = "사주 분석",
      birthDate = "",
      birthTime = "",
      gender = "",
    } = body;

    if (typeof result !== "string" || !result.trim()) {
      return NextResponse.json(
        { error: "PDF로 만들 분석 결과가 없습니다." },
        { status: 400 }
      );
    }

    const title = "AI 사주 분석 결과";

    const infoLines = [
      `상품: ${String(productName)}`,
      `생년월일: ${String(birthDate)}`,
      `태어난 시간: ${String(birthTime)}`,
      `성별: ${String(gender)}`,
    ];

    const rawLines = makeBodyLines(result);

    const tocLines = rawLines
      .filter(isHeading)
      .map((line) => line.trim());

    const pdf = buildPdf(
      title,
      infoLines,
      tocLines,
      rawLines
    );

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="ai-saju-result.pdf"',
        "Cache-Control": "no-store",
        "X-PDF-Generated": "true",
        },
    });
  } catch (error) {
    console.error("admin-pdf error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `PDF 생성 중 오류가 발생했습니다: ${error.message}`
            : "PDF 생성 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
