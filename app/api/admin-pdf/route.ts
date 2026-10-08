import { NextResponse } from "next/server";

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

function splitText(
  text: string,
  maxLength = 40
) {
  const lines: string[] = [];

  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  for (const paragraph of normalized.split(
    "\n"
  )) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }

    let current = "";

    for (const char of paragraph) {
      current += char;

      if (
        current.length >= maxLength
      ) {
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

function chunkLines(
  lines: string[],
  pageSize = 40
) {
  const pages: string[][] = [];

  for (
    let i = 0;
    i < lines.length;
    i += pageSize
  ) {
    pages.push(
      lines.slice(
        i,
        i + pageSize
      )
    );
  }

  if (pages.length === 0) {
    pages.push([]);
  }

  return pages;
}

function buildPageContent(
  lines: string[],
  pageNumber: number,
  totalPages: number
) {
  const contentLines: string[] = [
    "BT",
    "/F1 16 Tf",
    "50 790 Td",
    `${escapePdfText(
      "AI 사주 분석 결과"
    )} Tj`,
    "/F1 10 Tf",
    "0 -24 Td",
  ];

  for (const line of lines) {
    contentLines.push(
      `${escapePdfText(line)} Tj`
    );

    contentLines.push(
      "0 -18 Td"
    );
  }

  contentLines.push(
    "/F1 8 Tf"
  );

  contentLines.push(
    `0 -10 Td`
  );

  contentLines.push(
    `${escapePdfText(
      `페이지 ${pageNumber} / ${totalPages}`
    )} Tj`
  );

  contentLines.push("ET");

  return contentLines.join("\n");
}

function buildPdf(
  lines: string[]
) {
  const pages = chunkLines(
    lines,
    40
  );

  const totalPages =
    pages.length;

  const objects: string[] = [];

  objects.push(
    `<< /Type /Catalog /Pages 2 0 R >>`
  );

  const pageObjectNumbers: number[] =
    [];

  const firstPageObject =
    3;

  const firstContentObject =
    firstPageObject +
    totalPages;

  for (
    let i = 0;
    i < totalPages;
    i += 1
  ) {
    pageObjectNumbers.push(
      firstPageObject + i
    );
  }

  const pageKids =
    pageObjectNumbers
      .map(
        (number) =>
          `${number} 0 R`
      )
      .join(" ");

  objects.push(
    `<< /Type /Pages /Kids [${pageKids}] /Count ${totalPages} >>`
  );

  for (
    let i = 0;
    i < totalPages;
    i += 1
  ) {
    const pageObjectNumber =
      firstPageObject + i;

    const contentObjectNumber =
      firstContentObject + i;

    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${
        firstContentObject +
        totalPages
      } 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`
    );
  }

  const contentStreams: string[] =
    pages.map(
      (pageLines, index) =>
        buildPageContent(
          pageLines,
          index + 1,
          totalPages
        )
    );

  for (const content of contentStreams) {
    objects.push(
      `<< /Length ${Buffer.byteLength(
        content,
        "utf8"
      )} >>\nstream\n${content}\nendstream`
    );
  }

  const fontObjectNumber =
    firstContentObject +
    totalPages;

  objects.push(
    `<< /Type /Font /Subtype /Type0 /BaseFont /HYSMyeongJo-Medium /Encoding /UniKS-UCS2-H /DescendantFonts [${fontObjectNumber + 1} 0 R] >>`
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

    const header = [
      "AI 사주 분석 결과",
      "",
      `상품: ${String(
        productName
      )}`,
      `생년월일: ${String(
        birthDate
      )}`,
      `태어난 시간: ${String(
        birthTime
      )}`,
      `성별: ${String(
        gender
      )}`,
      "",
      "",
    ];

    const resultLines =
      splitText(result);

    const footer = [
      "",
      "",
      "※ 본 결과는 전통 사주 해석을 참고한 AI 콘텐츠이며",
      "미래를 확정적으로 예측하지 않습니다.",
    ];

    const lines = [
      ...header,
      ...resultLines,
      ...footer,
    ];

    const pdf =
      buildPdf(lines);

    const fileName =
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
            `attachment; filename="${fileName}-result.pdf"`,

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
