import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getProduct, type ProductId } from "@/lib/products";

type FourPillars = {
  year: string;
  month: string;
  day: string;
  time: string;
};

type FiveElements = {
  wood: number;
  fire: number;
  earth: number;
  metal: number;
  water: number;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const PRODUCT_GUIDES: Record<ProductId, string> = {
  detail: `
목표: 고객 한 사람의 사주를 상세하게 풀이합니다.
반드시 포함:
1. 기본 성향
2. 강점과 주의할 점
3. 오행 균형 해석
4. 대인관계 특징
5. 앞으로의 전반적인 흐름
`,
  comprehensive: `
목표: 고객의 사주를 종합적으로 풀이합니다.
반드시 포함:
1. 기본 성향
2. 재물운
3. 직업·커리어
4. 연애·대인관계
5. 오행 균형
6. 시기별 흐름
7. 종합 조언
`,
  love: `
목표: 연애와 인간관계에 집중해 풀이합니다.
반드시 포함:
1. 연애 성향
2. 호감 표현과 관계 패턴
3. 잘 맞는 관계의 특징
4. 갈등에서 주의할 점
5. 인연 흐름
6. 관계 조언
`,
  "money-job": `
목표: 재물과 직업에 집중해 풀이합니다.
반드시 포함:
1. 돈을 다루는 성향
2. 재물 흐름의 특징
3. 직업 적성 및 강점
4. 조직·사업 환경에서의 특징
5. 주의할 재물 습관
6. 커리어 방향과 조언
`,
  compatibility: `
목표: 두 사람의 관계 궁합을 풀이합니다.
두 사람의 만세력과 오행을 비교해야 합니다.
반드시 포함:
1. 두 사람의 기본 성향 비교
2. 오행 조화
3. 서로에게 끌리는 부분
4. 갈등이 생길 수 있는 부분
5. 관계 유지에 도움이 되는 방법
6. 종합 궁합 해석
`,
};

function isValidFourPillars(value: unknown): value is FourPillars {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return ["year", "month", "day", "time"].every(
    (key) => typeof v[key] === "string"
  );
}

function isValidFiveElements(value: unknown): value is FiveElements {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return ["wood", "fire", "earth", "metal", "water"].every(
    (key) => typeof v[key] === "number"
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const productId = body?.productId as ProductId;
    const product = getProduct(productId);

    if (!product) {
      return NextResponse.json(
        { error: "올바른 상품을 선택해주세요." },
        { status: 400 }
      );
    }

    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const birthDate =
      typeof body?.birthDate === "string" ? body.birthDate.trim() : "";
    const birthTime =
      typeof body?.birthTime === "string" ? body.birthTime.trim() : "";
    const gender = typeof body?.gender === "string" ? body.gender.trim() : "";

    if (!email || !birthDate || !birthTime || !gender) {
      return NextResponse.json(
        { error: "고객 정보가 부족합니다." },
        { status: 400 }
      );
    }

    if (!isValidFourPillars(body?.fourPillars)) {
      return NextResponse.json(
        { error: "본인 만세력 데이터가 올바르지 않습니다." },
        { status: 400 }
      );
    }

    if (!isValidFiveElements(body?.fiveElements)) {
      return NextResponse.json(
        { error: "본인 오행 데이터가 올바르지 않습니다." },
        { status: 400 }
      );
    }

    if (productId === "compatibility") {
      if (
        !isValidFourPillars(body?.partnerFourPillars) ||
        !isValidFiveElements(body?.partnerFiveElements)
      ) {
        return NextResponse.json(
          { error: "궁합 분석에는 상대방 만세력 데이터가 필요합니다." },
          { status: 400 }
        );
      }
    }

    const prompt = `
당신은 한국 전통 사주 해석을 참고해 읽기 쉬운 콘텐츠를 작성하는 분석가입니다.

중요 원칙:
- 제공된 만세력 데이터를 사실값으로 사용합니다.
- 만세력 자체를 새로 계산하거나 임의로 변경하지 않습니다.
- 단정적인 미래 예언처럼 표현하지 않습니다.
- 의료·법률·투자 등 전문적인 의사결정을 대신한다고 표현하지 않습니다.
- 고객이 실제 사람에게 설명받는 것처럼 자연스럽고 구체적으로 작성합니다.
- 같은 사람이라도 상품별 목적에 따라 분석의 초점을 명확하게 다르게 합니다.
- "AI가 분석했습니다", "프롬프트", "데이터 입력" 같은 내부 표현은 결과에 쓰지 않습니다.

상품: ${product.name}
상품 설명: ${product.description}

${PRODUCT_GUIDES[productId]}

고객:
이메일: ${email}
생년월일: ${birthDate}
출생 시간대: ${birthTime}
성별: ${gender}

본인 사주 원국:
년주: ${body.fourPillars.year}
월주: ${body.fourPillars.month}
일주: ${body.fourPillars.day}
시주: ${body.fourPillars.time}

본인 오행:
목: ${body.fiveElements.wood}
화: ${body.fiveElements.fire}
토: ${body.fiveElements.earth}
금: ${body.fiveElements.metal}
수: ${body.fiveElements.water}
`;

    if (productId === "compatibility") {
      prompt.concat(`
상대방:
생년월일: ${body.partnerBirthDate}
출생 시간대: ${body.partnerBirthTime}
성별: ${body.partnerGender}

상대방 사주 원국:
년주: ${body.partnerFourPillars.year}
월주: ${body.partnerFourPillars.month}
일주: ${body.partnerFourPillars.day}
시주: ${body.partnerFourPillars.time}

상대방 오행:
목: ${body.partnerFiveElements.wood}
화: ${body.partnerFiveElements.fire}
토: ${body.partnerFiveElements.earth}
금: ${body.partnerFiveElements.metal}
수: ${body.partnerFiveElements.water}
`);
    }

    const finalPrompt =
      productId === "compatibility"
        ? `${prompt}

상대방:
생년월일: ${body.partnerBirthDate}
출생 시간대: ${body.partnerBirthTime}
성별: ${body.partnerGender}

상대방 사주 원국:
년주: ${body.partnerFourPillars.year}
월주: ${body.partnerFourPillars.month}
일주: ${body.partnerFourPillars.day}
시주: ${body.partnerFourPillars.time}

상대방 오행:
목: ${body.partnerFiveElements.wood}
화: ${body.partnerFiveElements.fire}
토: ${body.partnerFiveElements.earth}
금: ${body.partnerFiveElements.metal}
수: ${body.partnerFiveElements.water}
`
        : prompt;

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      input: [
        {
          role: "system",
          content:
            "한국어로 자연스럽고 정돈된 사주 분석 결과를 작성하세요. 결과만 출력하세요.",
        },
        {
          role: "user",
          content: finalPrompt,
        },
      ],
    });

    const result = response.output_text?.trim();

    if (!result) {
      return NextResponse.json(
        { error: "분석 결과가 비어 있습니다." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      product,
      result,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("test-analysis error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "분석 생성 중 서버 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
