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
- 결과는 5개 핵심 항목으로 구성한다.
- ① 전체적인 첫인상 ② 강점 ③ 주의할 점 ④ 오행 균형 ⑤ 한 줄 조언
- 700~1000자 정도로 간결하게 작성한다.
- 유료 상품에서 제공할 세부 운세나 장기 흐름은 깊게 다루지 않는다.
`;

    case "love":
      return `
[연애운 분석]
- 연애만 집중해서 분석한다.
- 반드시 다음 순서로 작성한다:
  1. 연애 기본 성향
  2. 호감 표현 방식
  3. 관계에서 반복되기 쉬운 패턴
  4. 잘 맞는 상대의 특징
  5. 갈등이 생겼을 때 주의점
  6. 인연을 키우는 실전 조언
- 재물·직업 이야기는 최소화한다.
- 일반적인 사주 문구를 반복하지 말고 원국과 오행을 근거로 구체화한다.
`;

    case "money-job":
      return `
[재물·직업운 분석]
- 재물과 직업에만 초점을 맞춘다.
- 반드시 다음 순서로 작성한다:
  1. 돈을 다루는 성향
  2. 소비·저축에서의 특징
  3. 일할 때 강점을 발휘하는 환경
  4. 직업 선택 시 유리한 방향
  5. 조직생활과 독립업무 중 특징
  6. 현실적인 커리어 조언
- 연애 이야기는 넣지 않는다.
- 단순히 "돈복이 좋다/나쁘다"로 끝내지 말고 오행 구조를 연결한다.
`;

    case "detail":
      return `
[상세 사주 분석]
- 개인의 원국 구조와 오행 균형을 중심으로 분석한다.
- 반드시 다음 순서로 작성한다:
  1. 사주 원국 해석
  2. 오행 분포
  3. 성격과 행동 특성
  4. 강점
  5. 취약점과 주의점
  6. 대인관계 특징
  7. 생활에서 활용할 조언
- 연애·재물·직업을 단독 운세처럼 길게 예측하지 않는다.
- 무료 결과보다 최소 2배 이상 구체적으로 작성한다.
`;

    case "compatibility":
      return `
[궁합 분석]
- 두 사람의 원국을 직접 비교한다.
- 반드시 다음 순서로 작성한다:
  1. 두 사람의 기본 기질 비교
  2. 오행 상호작용
  3. 서로에게 끌리는 부분
  4. 갈등이 발생하기 쉬운 지점
  5. 대화와 감정 표현의 차이
  6. 관계를 오래 유지하기 위한 방법
  7. 궁합 총평
- 한 사람만 단독으로 해석하지 않는다.
- "좋다/나쁘다" 단정 대신 어떤 상호작용 때문에 그런 경향이 생기는지 설명한다.
`;

    case "comprehensive":
      return `
[종합 사주 분석]
- 가장 깊고 넓은 보고서로 작성한다.
- 반드시 다음 순서로 작성한다:
  1. 전체 원국 핵심 요약
  2. 오행 구조와 균형
  3. 성격 및 행동 패턴
  4. 대인관계
  5. 연애 및 인연
  6. 재물 흐름
  7. 직업 및 커리어
  8. 생활 습관과 주의점
  9. 앞으로의 방향을 잡는 실전 조언
  10. 전체 총평
- 다른 상품보다 가장 상세해야 한다.
- 각 항목에서 같은 문장을 반복하지 않는다.
- 막연한 미래 예언보다 원국을 근거로 현실적인 방향을 제시한다.
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

    const productInstructions = buildProductInstructions(
      productId as AdminProductId
    );

    // 같은 사람이라도 상품을 바꾸면 반드시 다른 분석 구조가 나오도록
    // 상품 ID와 상품명을 프롬프트의 핵심 조건으로 전달합니다.
    const uniqueAnalysisKey = [
      product.id,
      product.name,
      customer.birthDate,
      customer.birthTime,
      customer.gender,
      fourPillars.year,
      fourPillars.month,
      fourPillars.day,
      fourPillars.time,
    ].join("|");

    const prompt = `
당신은 한국 전통 사주를 현대적인 언어로 설명하는 전문 상담 AI입니다.

중요한 운영 규칙:
1. 아래에서 선택된 상품 하나만 분석합니다.
2. 다른 상품의 보고서처럼 답하지 않습니다.
3. 같은 고객이라도 상품이 달라지면 반드시 분석 관점, 목차, 설명 내용이 달라야 합니다.
4. 입력된 사주 원국과 오행을 근거로 작성합니다.
5. 근거 없는 확정적 예언, 질병 진단, 법률·투자 보장은 하지 않습니다.
6. 결과는 고객이 실제 상품을 구매하고 받은 보고서처럼 자연스럽고 구체적으로 작성합니다.
7. 고객 이메일은 분석 내용에 사용하지 않습니다.
8. 아래의 UNIQUE KEY는 결과가 상품별로 섞이지 않도록 하기 위한 내부 식별자입니다. 답변에 그대로 출력하지 마세요.

상품명: ${product.name}
상품 가격: ${product.price.toLocaleString("ko-KR")}원
상품 ID: ${product.id}
UNIQUE KEY: ${uniqueAnalysisKey}

고객:
- 생년월일: ${customer.birthDate}
- 태어난 시간: ${customer.birthTime}
- 성별: ${customer.gender}

고객 사주 원국:
- 년주: ${fourPillars.year}
- 월주: ${fourPillars.month}
- 일주: ${fourPillars.day}
- 시주: ${fourPillars.time}

고객 오행:
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

${productInstructions}

작성 방식:
- 한국어
- 제목과 소제목을 명확하게 구분
- 같은 표현을 반복하지 않기
- 입력값과 맞지 않는 내용을 만들어내지 않기
- 무료 상품은 짧고 핵심적으로, 유료 상품은 해당 상품의 전문 범위에 맞게 더 구체적으로 작성
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
