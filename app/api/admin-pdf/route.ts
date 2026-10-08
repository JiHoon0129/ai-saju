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

function splitText(text: string, maxLength = 42) {
  const lines: string[] = [];

  for (const paragraph of text.replace(/\r\n/g, "\n").split("\n")) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }

    let current = "";
    for (const char of paragraph) {
      current += char;

      if (current.length >= maxLength) {
        lines.push(current);
        current = "";
      }
    }

    if (current) {
      lines.push(current);
    }
  }

  return lines;
}

function buildPdf(lines: string[]) {
  const contentLines = [
    "BT",
    "/F1 16 Tf",
    "50 800 Td",
    `${escapePdfText("AI 사주 분석 결과")} Tj`,
    "/F1 11 Tf",
    "0 -24 Td",
    ...lines.flatMap((line) => [
      `${escapePdfText(line)} Tj`,
      "0 -18 Td",
    ]),
    "ET",
  ];

  const content = contentLines.join("\n");

  const objects = [
    `<< /Type /Catalog /Pages 2 0 R >>`,
    `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`,
    `<< /Type /Font /Subtype /Type0 /BaseFont /HYSMyeongJo-Medium /Encoding /UniKS-UCS2-H /DescendantFonts [6 0 R] >>`,
    `<< /Type /Font /Subtype /CIDFontType0 /BaseFont /HYSMyeongJo-Medium /CIDSystemInfo << /Registry (Adobe) /Ordering (Korea1) /Supplement 2 >> /DW 1000 >>`,
  ];

  const chunks: string[] = ["%PDF-1.4\n"];
  const offsets: number[] = [0];

  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(Buffer.byteLength(chunks.join(""), "utf8"));
    chunks.push(`${i + 1} 0 obj\n${objects[i]}\nendobj\n`);
  }

  const xrefOffset = Buffer.byteLength(chunks.join(""), "utf8");

  chunks.push(`xref\n0 ${objects.length + 1}\n`);
  chunks.push("0000000000 65535 f \n");

  for (let i = 1; i <= objects.length; i += 1) {
    chunks.push(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  }

  chunks.push(
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  );

  return Buffer.from(chunks.join(""), "utf8");
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

    const header = [
      `상품: ${String(productName)}`,
      `생년월일: ${String(birthDate)}`,
      `태어난 시간: ${String(birthTime)}`,
      `성별: ${String(gender)}`,
      "",
    ];

    const lines = [
      ...header,
      ...splitText(result),
      "",
      "※ 본 결과는 전통 사주 해석을 참고한 AI 콘텐츠이며 미래를 확정적으로 예측하지 않습니다.",
    ];

    const pdf = buildPdf(lines);

    return new NextResponse(pdf, {
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
      { error: "PDF 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
