import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  getAdminProduct,
  type AdminProductId,
} from "../../../lib/admin-products";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

function buildProductInstructions(productId: AdminProductId) {
  switch (productId) {
    case "free":
      return `
[무료 사주 맛보기]
- 핵심만 간결하게 설명합니다.
- 다음 순서로 작성합니다.
  1. 전체적인 성향
  2. 가장 두드러지는 강점
  3. 주의할 점
  4. 오행 균형
  5. 한 줄 조언
- 약 700~1000자 정도로 작성합니다.
- 장기적인 운의 흐름이나 세부 운세는 깊게 다루지 않습니다.
`;

    case "love":
      return `
[연애운 분석]
연애와 인간관계의 감정적인 측면에 집중합니다.

다음 순서로 작성합니다.
1. 연애 기본 성향
2. 호감 표현 방식
3. 관계에서 반복되기 쉬운 패턴
4. 잘 맞는 상대의 특징
5. 갈등이 생겼을 때 주의할 점
6. 관계를 발전시키는 현실적인 조언

재물과 직업은 중심 주제로 다루지 않습니다.
원국과 오행을 근거로 구체적으로 설명합니다.
`;

    case "money-job":
      return `
[재물·직업운 분석]
재물과 직업에 집중합니다.

다음 순서로 작성합니다.
1. 돈을 다루는 성향
2. 소비와 저축의 특징
3. 업무에서 강점을 발휘하는 환경
4. 직업 선택에서 고려할 방향
5. 조직생활과 독립적인 업무의 특징
6. 현실적인 커리어 조언

연애 내용은 중심적으로 다루지 않습니다.
단순히 "재물운이 좋다/나쁘다"라고 단정하지 말고
오행 구조와 원국을 연결하여 설명합니다.
`;

    case "detail":
      return `
[상세 사주 분석]
사주 원국과 오행 구조 자체를 중심으로 상세하게 분석합니다.

다음 순서로 작성합니다.
1. 사주 원국 해석
2. 오행 분포
3. 성격과 행동 특성
4. 강점
5. 취약점과 주의점
6. 대인관계 특징
7. 생활에서 활용할 수 있는 조언

무료 상품보다 훨씬 구체적으로 작성합니다.
특정 운세 하나만 집중적으로 예측하지 않습니다.
`;

    case "compatibility":
      return `
[궁합 분석]
두 사람의 사주를 비교하는 것이 핵심입니다.

다음 순서로 작성합니다.
1. 두 사람의 기본 기질 비교
2. 오행 상호작용
3. 서로에게 끌리는 부분
4. 갈등이 발생하기 쉬운 부분
5. 대화와 감정 표현의 차이
6. 관계를 오래 유지하기 위한 방법
7. 궁합 총평

한 사람의 사주만 분석해서는 안 됩니다.
두 사람 사이의 차이와 보완 관계를 중심으로 설명합니다.
`;

    case "comprehensive":
      return `
[종합 사주 분석]
가장 넓고 상세한 종합 보고서입니다.

다음 순서로 작성합니다.
1. 전체 원국 핵심 요약
2. 오행 구조와 균형
3. 성격 및 행동 패턴
4. 대인관계
5. 연애 및 인연
6. 재물 흐름
7. 직업 및 커리어
8. 생활 습관과 주의점
9. 앞으로의 방향을 잡는 현실적인 조언
10. 전체 총평

모든 항목을 충분히 구체적으로 작성합니다.
다른 상품보다 가장 상세해야 합니다.
같은 문장을 반복하지 않습니다.
막연한 미래 예언보다 입력된 원국을 근거로 설명합니다.
`;

    default:
      return "";
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      productId,
      customer,
      fourPillars,
      fiveElements,
      partnerFourPillars,
      partnerFiveElements,
    } = body;

    const product = getAdminProduct(String(productId));

    if (!product) {
      return NextResponse.json(
        { error: "선택한 상품을 찾을 수 없습니다." },
        { status: 400 }
      );
    }

    if (
      !customer?.birthDate ||
      !customer?.birthTime ||
      !customer?.gender ||
      !fourPillars ||
      !fiveElements
    ) {
      return NextResponse.json(
        { error: "고객 사주 정보가 부족합니다." },
        { status: 400 }
      );
    }

    if (
      productId === "compatibility" &&
      (!partnerFourPillars || !partnerFiveElements)
    ) {
      return NextResponse.json(
        { error: "궁합 분석에는 상대방 사주 정보가 필요합니다." },
        { status: 400 }
      );
    }

    const instructions = buildProductInstructions(
      productId as AdminProductId
    );

    const prompt = `
당신은 한국 전통 사주를 현대적인 언어로 설명하는 전문 상담 AI입니다.

중요한 규칙:

1. 반드시 선택된 상품 하나만 분석합니다.
2. 같은 고객이라도 상품이 달라지면 분석 관점과 결과가 달라야 합니다.
3. 입력된 사주 원국과 오행을 근거로 작성합니다.
4. 근거 없는 확정적인 미래 예언을 하지 않습니다.
5. 질병 진단, 투자 보장, 법률적 판단을 하지 않습니다.
6. 고객 이메일은 분석 내용에 사용하지 않습니다.
7. 고객이 실제 상품을 구매하고 받은 분석 보고서처럼 자연스럽게 작성합니다.
8. 같은 문장을 반복하지 않습니다.

상품:
- 상품명: ${product.name}
- 상품 ID: ${product.id}
- 가격: ${product.price.toLocaleString("ko-KR")}원

고객 정보:
- 생년월일: ${customer.birthDate}
- 태어난 시간: ${customer.birthTime}
- 성별: ${customer.gender}

사주 원국:
- 년주: ${fourPillars.year}
- 월주: ${fourPillars.month}
- 일주: ${fourPillars.day}
- 시주: ${fourPillars.time}

오행:
- 목: ${fiveElements.wood}
- 화: ${fiveElements.fire}
- 토: ${fiveElements.earth}
- 금: ${fiveElements.metal}
- 수: ${fiveElements.water}

${
  productId === "compatibility"
    ? `
상대방 사주 원국:
- 년주: ${partnerFourPillars.year}
- 월주: ${partnerFourPillars.month}
- 일주: ${partnerFourPillars.day}
- 시주: ${partnerFourPillars.time}

상대방 오행:
- 목: ${partnerFiveElements.wood}
- 화: ${partnerFiveElements.fire}
- 토: ${partnerFiveElements.earth}
- 금: ${partnerFiveElements.metal}
- 수: ${partnerFiveElements.water}
`
    : ""
}

${instructions}

작성 형식:
- 한국어
- 제목과 소제목을 명확하게 표시
- 읽기 편한 문단 구성
- 상품의 가격대와 범위에 맞는 충분한 차별화
- 입력된 사주 정보와 맞지 않는 내용을 임의로 만들어내지 않기
`;

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const response = await openai.responses.create({
      model,
      input: prompt,
    });

    return NextResponse.json({
      result: response.output_text,
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
      },
    });
  } catch (error) {
    console.error("test-analysis error:", error);

    return NextResponse.json(
      { error: "테스트 분석 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
