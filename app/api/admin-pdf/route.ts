import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

type FontData = {
  bytes: Buffer;
  unitsPerEm: number;
  numGlyphs: number;
  advances: number[];
  glyphForCodePoint: (codePoint: number) => number;
  bbox: [number, number, number, number];
  ascent: number;
  descent: number;
};

function u16(view: DataView, offset: number) {
  return view.getUint16(offset, false);
}

function s16(view: DataView, offset: number) {
  return view.getInt16(offset, false);
}

function u32(view: DataView, offset: number) {
  return view.getUint32(offset, false);
}

function tableMap(bytes: Buffer) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = u16(view, 4);
  const tables = new Map<string, { offset: number; length: number }>();

  for (let i = 0; i < count; i += 1) {
    const base = 12 + i * 16;
    const tag = String.fromCharCode(
      bytes[base],
      bytes[base + 1],
      bytes[base + 2],
      bytes[base + 3]
    );
    tables.set(tag, {
      offset: u32(view, base + 8),
      length: u32(view, base + 12),
    });
  }

  return { view, tables };
}

function parseCmap(bytes: Buffer) {
  const { view, tables } = tableMap(bytes);
  const cmap = tables.get("cmap");

  if (!cmap) {
    throw new Error("SUIT 폰트의 cmap 테이블을 찾을 수 없습니다.");
  }

  const base = cmap.offset;
  const numTables = u16(view, base + 2);

  let format4Offset = -1;
  let format12Offset = -1;

  for (let i = 0; i < numTables; i += 1) {
    const record = base + 4 + i * 8;
    const subtableOffset = base + u32(view, record + 4);
    const format = u16(view, subtableOffset);

    if (format === 12) {
      format12Offset = subtableOffset;
    } else if (format === 4) {
      format4Offset = subtableOffset;
    }
  }

  function glyphFromFormat4(codePoint: number) {
    if (format4Offset < 0 || codePoint > 0xffff) return 0;

    const p = format4Offset;
    const segCount = u16(view, p + 6) / 2;

    const endCode = p + 14;
    const startCode = endCode + segCount * 2 + 2;
    const idDelta = startCode + segCount * 2;
    const idRangeOffset = idDelta + segCount * 2;

    for (let i = 0; i < segCount; i += 1) {
      const end = u16(view, endCode + i * 2);
      if (codePoint > end) continue;

      const start = u16(view, startCode + i * 2);
      if (codePoint < start) return 0;

      const delta = s16(view, idDelta + i * 2);
      const rangeOffset = u16(view, idRangeOffset + i * 2);

      if (rangeOffset === 0) {
        return (codePoint + delta) & 0xffff;
      }

      const glyphAddress =
        idRangeOffset +
        i * 2 +
        rangeOffset +
        (codePoint - start) * 2;

      const glyph = u16(view, glyphAddress);
      if (glyph === 0) return 0;

      return (glyph + delta) & 0xffff;
    }

    return 0;
  }

  function glyphFromFormat12(codePoint: number) {
    if (format12Offset < 0) return 0;

    const p = format12Offset;
    const groupCount = u32(view, p + 12);
    let low = 0;
    let high = groupCount - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const group = p + 16 + mid * 12;
      const start = u32(view, group);
      const end = u32(view, group + 4);

      if (codePoint < start) {
        high = mid - 1;
      } else if (codePoint > end) {
        low = mid + 1;
      } else {
        const startGlyph = u32(view, group + 8);
        return startGlyph + (codePoint - start);
      }
    }

    return 0;
  }

  return (codePoint: number) => {
    const from12 = glyphFromFormat12(codePoint);
    if (from12 !== 0) return from12;
    return glyphFromFormat4(codePoint);
  };
}

async function loadFont(fileName: string): Promise<FontData> {
  const filePath = path.join(process.cwd(), "public", "fonts", fileName);
  const bytes = await fs.readFile(filePath);
  const { view, tables } = tableMap(bytes);

  const head = tables.get("head");
  const hhea = tables.get("hhea");
  const hmtx = tables.get("hmtx");
  const maxp = tables.get("maxp");

  if (!head || !hhea || !hmtx || !maxp) {
    throw new Error(`${fileName}의 필수 TrueType 테이블이 없습니다.`);
  }

  const unitsPerEm = u16(view, head.offset + 18);
  const bbox: [number, number, number, number] = [
    s16(view, head.offset + 36),
    s16(view, head.offset + 38),
    s16(view, head.offset + 40),
    s16(view, head.offset + 42),
  ];

  const ascent = s16(view, hhea.offset + 4);
  const descent = s16(view, hhea.offset + 6);
  const numGlyphs = u16(view, maxp.offset + 4);
  const numberOfHMetrics = u16(view, hhea.offset + 34);

  const advances: number[] = [];
  let lastAdvance = 0;

  for (let i = 0; i < numberOfHMetrics; i += 1) {
    const offset = hmtx.offset + i * 4;
    lastAdvance = u16(view, offset);
    advances.push(lastAdvance);
  }

  while (advances.length < numGlyphs) {
    advances.push(lastAdvance);
  }

  return {
    bytes,
    unitsPerEm,
    numGlyphs,
    advances,
    glyphForCodePoint: parseCmap(bytes),
    bbox,
    ascent,
    descent,
  };
}

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

  return Buffer.from(bytes);
}

function textToGlyphHex(text: string, font: FontData) {
  const bytes: number[] = [];

  for (const char of text) {
    const codePoint = char.codePointAt(0) ?? 0;
    const glyph = font.glyphForCodePoint(codePoint);

    bytes.push((glyph >> 8) & 0xff, glyph & 0xff);
  }

  return Buffer.from(bytes).toString("hex").toUpperCase();
}

function normalizeText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, "    ")
    .replace(/[ ]{3,}/g, "  ")
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

function pdfEscapeLiteral(text: string) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function buildToUnicode(font: FontData, textLines: string[]) {
  const pairs = new Map<number, string>();

  for (const line of textLines) {
    for (const char of line) {
      const codePoint = char.codePointAt(0) ?? 0;
      const glyph = font.glyphForCodePoint(codePoint);

      if (glyph === 0 || pairs.has(glyph)) continue;

      pairs.set(glyph, toUtf16Hex(char).toString("hex").toUpperCase());
    }
  }

  const entries = Array.from(pairs.entries());

  const chunks: string[] = [
    "/CIDInit /ProcSet findresource begin",
    "12 dict begin",
    "begincmap",
    "/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def",
    "/CMapName /SUIT-UCS def",
    "/CMapType 2 def",
    "1 begincodespacerange",
    "<0000><FFFF>",
    "endcodespacerange",
  ];

  const size = 100;

  for (let i = 0; i < entries.length; i += size) {
    const batch = entries.slice(i, i + size);

    chunks.push(`${batch.length} beginbfchar`);

    for (const [glyph, unicodeHex] of batch) {
      chunks.push(
        `<${glyph.toString(16).padStart(4, "0").toUpperCase()}><${unicodeHex}>`
      );
    }

    chunks.push("endbfchar");
  }

  chunks.push(
    "endcmap",
    "CMapName currentdict /CMap defineresource pop",
    "end",
    "end"
  );

  return Buffer.from(chunks.join("\n"), "utf8");
}

function pdfText(font: FontData, text: string) {
  return `<${textToGlyphHex(text, font)}> Tj`;
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

function buildPageContent(
  pageItems: Array<{
    kind: "title" | "info" | "toc" | "body" | "notice";
    text: string;
    colorIndex?: number;
  }>,
  regular: FontData,
  semiBold: FontData
) {
  const commands: string[] = [
    "q",
    "BT",
    "50 790 Td",
  ];

  for (const item of pageItems) {
    if (item.kind === "title") {
      commands.push(
        "0 -8 Td",
        "/F1 22 Tf",
        grayText(),
        pdfText(semiBold, item.text),
        "0 -34 Td"
      );
      continue;
    }

    if (item.kind === "info") {
      commands.push(
        "/F1 10 Tf",
        grayText(),
        pdfText(regular, item.text),
        "0 -16 Td"
      );
      continue;
    }

    if (item.kind === "toc") {
      commands.push(
        "0 -6 Td",
        "/F2 17 Tf",
        colorCommand(item.colorIndex ?? 0),
        pdfText(semiBold, item.text),
        "0 -28 Td"
      );
      continue;
    }

    if (item.kind === "notice") {
      commands.push(
        "0 -4 Td",
        "/F1 9 Tf",
        "0.38 0.38 0.38 rg",
        pdfText(regular, item.text),
        "0 -16 Td"
      );
      continue;
    }

    commands.push(
      "/F1 11 Tf",
      grayText(),
      pdfText(regular, item.text),
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

  const prefix = Buffer.from(
    `${header}\nstream\n`,
    "utf8"
  );
  const suffix = Buffer.from("\nendstream", "utf8");

  return Buffer.concat([prefix, bodyBuffer, suffix]);
}

function makeFontObjects(
  font: FontData,
  fontName: string,
  fontFileObjectId: number,
  descriptorObjectId: number,
  cidObjectId: number,
  toUnicodeObjectId: number,
  toUnicode: Buffer,
  usedGlyphs: number[]
) {
  const [xMin, yMin, xMax, yMax] = font.bbox;

  const scale = 1000 / font.unitsPerEm;
  const pdfBBox = [
    Math.round(xMin * scale),
    Math.round(yMin * scale),
    Math.round(xMax * scale),
    Math.round(yMax * scale),
  ];

  const ascent = Math.round(font.ascent * scale);
  const descent = Math.round(font.descent * scale);

  const descriptor = `<<
/Type /FontDescriptor
/FontName /${fontName}
/Flags 32
/FontBBox [${pdfBBox.join(" ")}]
/ItalicAngle 0
/Ascent ${ascent}
/Descent ${descent}
/CapHeight ${ascent}
/StemV 80
/FontFile2 ${fontFileObjectId} 0 R
>>`;

  const widthParts = usedGlyphs
    .filter((glyph) => glyph >= 0 && glyph < font.advances.length)
    .sort((a, b) => a - b)
    .map((glyph) => {
      const width = Math.round(
        (font.advances[glyph] * 1000) / font.unitsPerEm
      );
      return `${glyph} [${width}]`;
    });

  const widths = widthParts.length
    ? `/W [${widthParts.join(" ")}]`
    : "";

  const cidFont = `<<
/Type /Font
/Subtype /CIDFontType2
/BaseFont /${fontName}
/CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >>
/FontDescriptor ${descriptorObjectId} 0 R
/CIDToGIDMap /Identity
/DW 1000
${widths}
>>`;

  const type0 = `<<
/Type /Font
/Subtype /Type0
/BaseFont /${fontName}
/Encoding /Identity-H
/DescendantFonts [${cidObjectId} 0 R]
/ToUnicode ${toUnicodeObjectId} 0 R
>>`;

  return {
    descriptor: Buffer.from(descriptor, "utf8"),
    cidFont: Buffer.from(cidFont, "utf8"),
    type0: Buffer.from(type0, "utf8"),
  };
}

function buildPdf(
  title: string,
  infoLines: string[],
  tocLines: string[],
  bodyLines: string[],
  regular: FontData,
  semiBold: FontData
) {
  const pageWidth = 595;
  const pageHeight = 842;
  const topY = 790;
  const bottomY = 55;

  const allItems: Array<{
    kind: "title" | "info" | "toc" | "body" | "notice";
    text: string;
    colorIndex?: number;
  }> = [];

  allItems.push({ kind: "title", text: title });

  for (const line of infoLines) {
    allItems.push({ kind: "info", text: line });
  }

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

  for (const line of bodyLines) {
    allItems.push({ kind: "body", text: line });
  }

  allItems.push({
    kind: "notice",
    text: "※ 본 결과는 전통 사주 해석을 참고한 AI 콘텐츠이며 미래를 확정적으로 예측하지 않습니다.",
  });

  const pages: typeof allItems[] = [];
  let current: typeof allItems = [];
  let estimatedY = topY;

  const heightFor = (item: (typeof allItems)[number]) => {
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

  const objectBuffers: Buffer[] = [];
  const pageObjectIds: number[] = [];

  const pageCount = pages.length;
  const firstPageId = 3;
  const firstContentId = firstPageId + pageCount;

  const regularType0Id = firstContentId + pageCount;
  const regularCidId = regularType0Id + 1;
  const regularDescriptorId = regularType0Id + 2;
  const regularFileId = regularType0Id + 3;
  const regularUnicodeId = regularType0Id + 4;

  const semiType0Id = regularUnicodeId + 1;
  const semiCidId = semiType0Id + 1;
  const semiDescriptorId = semiType0Id + 2;
  const semiFileId = semiType0Id + 3;
  const semiUnicodeId = semiType0Id + 4;

  objectBuffers[0] = Buffer.from(
    `<< /Type /Catalog /Pages 2 0 R >>`,
    "utf8"
  );

  const pageIds = Array.from(
    { length: pageCount },
    (_, index) => firstPageId + index
  );

  objectBuffers[1] = Buffer.from(
    `<< /Type /Pages /Kids [${pageIds
      .map((id) => `${id} 0 R`)
      .join(" ")}] /Count ${pageCount} >>`,
    "utf8"
  );

  const pageContents = pages.map((page) =>
    buildPageContent(page, regular, semiBold)
  );

  for (let i = 0; i < pageCount; i += 1) {
    const pageId = firstPageId + i;
    const contentId = firstContentId + i;

    pageObjectIds.push(pageId);

    objectBuffers[pageId - 1] = Buffer.from(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${regularType0Id} 0 R /F2 ${semiType0Id} 0 R >> >> /Contents ${contentId} 0 R >>`,
      "utf8"
    );

    objectBuffers[contentId - 1] = objectBuffer(
      `<< /Length ${pageContents[i].length} >>`,
      pageContents[i]
    );
  }

  const allText = [...infoLines, ...tocLines, ...bodyLines, "목차", title];

  const regularUnicode = buildToUnicode(regular, allText);
  const semiUnicode = buildToUnicode(semiBold, [
    title,
    "목차",
    ...tocLines,
  ]);

  const regularFontObjects = makeFontObjects(
    regular,
    "SUIT-Regular",
    regularFileId,
    regularDescriptorId,
    regularCidId,
    regularUnicodeId,
    regularUnicode,
    Array.from(new Set(
      [...infoLines, ...tocLines, ...bodyLines, title]
        .flatMap((line) => Array.from(line))
        .map((char) => regular.glyphForCodePoint(char.codePointAt(0) ?? 0))
    ))
  );

  const semiFontObjects = makeFontObjects(
    semiBold,
    "SUIT-SemiBold",
    semiFileId,
    semiDescriptorId,
    semiCidId,
    semiUnicodeId,
    semiUnicode,
    Array.from(new Set(
      [title, "목차", ...tocLines]
        .flatMap((line) => Array.from(line))
        .map((char) => semiBold.glyphForCodePoint(char.codePointAt(0) ?? 0))
    ))
  );

  objectBuffers[regularType0Id - 1] = regularFontObjects.type0;
  objectBuffers[regularCidId - 1] = regularFontObjects.cidFont;
  objectBuffers[regularDescriptorId - 1] = regularFontObjects.descriptor;

  objectBuffers[regularFileId - 1] = objectBuffer(
    `<< /Length ${regular.bytes.length} /Length1 ${regular.bytes.length} >>`,
    regular.bytes
  );

  objectBuffers[regularUnicodeId - 1] = objectBuffer(
    `<< /Length ${regularUnicode.length} >>`,
    regularUnicode
  );

  objectBuffers[semiType0Id - 1] = semiFontObjects.type0;
  objectBuffers[semiCidId - 1] = semiFontObjects.cidFont;
  objectBuffers[semiDescriptorId - 1] = semiFontObjects.descriptor;

  objectBuffers[semiFileId - 1] = objectBuffer(
    `<< /Length ${semiBold.bytes.length} /Length1 ${semiBold.bytes.length} >>`,
    semiBold.bytes
  );

  objectBuffers[semiUnicodeId - 1] = objectBuffer(
    `<< /Length ${semiUnicode.length} >>`,
    semiUnicode
  );

  const chunks: Buffer[] = [Buffer.from("%PDF-1.7\n%\xE2\xE3\xCF\xD3\n", "binary")];
  const offsets: number[] = [0];
  let currentOffset = chunks[0].length;

  for (let i = 0; i < objectBuffers.length; i += 1) {
    offsets.push(currentOffset);

    const object = Buffer.concat([
      Buffer.from(`${i + 1} 0 obj\n`, "utf8"),
      objectBuffers[i],
      Buffer.from("\nendobj\n", "utf8"),
    ]);

    chunks.push(object);
    currentOffset += object.length;
  }

  const xrefOffset = currentOffset;
  const xref: string[] = [
    `xref`,
    `0 ${objectBuffers.length + 1}`,
    "0000000000 65535 f ",
  ];

  for (let i = 1; i < offsets.length; i += 1) {
    xref.push(`${String(offsets[i]).padStart(10, "0")} 00000 n `);
  }

  chunks.push(
    Buffer.from(
      `${xref.join("\n")}\ntrailer\n<< /Size ${
        objectBuffers.length + 1
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

    const [regular, semiBold] = await Promise.all([
      loadFont("SUIT-Regular.ttf"),
      loadFont("SUIT-SemiBold.ttf"),
    ]);

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

    const bodyLines = rawLines;

    const pdf = buildPdf(
      title,
      infoLines,
      tocLines,
      bodyLines,
      regular,
      semiBold
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
