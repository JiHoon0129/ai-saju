import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getAdminProduct } from "@/lib/admin-products";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type PersonData = {
  birthDate: string;
  birthTime: string;
  gender: string;
};

function cleanText(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function buildCommonStyle(): string {
  return `
당신은 딱딱한 사주 풀이를 작성하는 사람이 아니라,
사람에게 직접 이야기해주는 전문 사주 상담가입니다.

이번 분석은 정확하면서도 재미있게 읽히는 사주 리포트를 만드는 것이 목표입니다.

[문체]

1. 실제 사람이 상담해주는 것처럼 자연스럽게 작성하세요.
2. 짧은 문장과 긴 문장을 적절히 섞으세요.
3. 어려운 사주 용어는 쉬운 말로 풀어서 설명하세요.
4. 같은 표현을 반복하지 마세요.
5. 좋은 점과 주의할 점을 균형 있게 작성하세요.
6. 공포를 유발하거나 불안감을 조성하지 마세요.
7. "~합니다"만 반복하지 마세요.
8. 지나치게 AI가 쓴 것처럼 딱딱한 표현을 피하세요.

[후킹]

각 주요 파트의 첫 부분에는 독자가 계속 읽고 싶어지는 한 문장을 넣으세요.

예:
"겉으로는 차분해 보여도 속으로는 생각이 꽤 빠른 편입니다."

"여기서 재미있는 특징이 하나 보입니다."

"이 부분은 본인보다 주변 사람들이 먼저 알아차릴 수도 있습니다."

"연애에서는 의외의 모습이 나타날 수 있습니다."

후킹을 과장하거나 자극적으로 만들지는 마세요.

[딕션]

다음과 같은 자연스러운 표현을 필요한 곳에 사용하세요.

"쉽게 말하면 이렇습니다."

"그런데 여기서 한 가지가 중요합니다."

"이 부분은 꽤 눈여겨볼 만합니다."

"본인은 별일 아니라고 생각할 수 있지만..."

"주변에서는 오히려 이렇게 느낄 수 있습니다."

모든 문단에 반복하지 마세요.

[엑트]

가능한 파트에는 현실적인 상황 예시를 넣으세요.

예:
"예를 들어 갑자기 새로운 일을 제안받았을 때..."

"친한 사람과 의견이 부딪혔을 때..."

"연애 중 상대방의 연락이 평소보다 줄어들었을 때..."

상황을 사주 데이터에 맞게 자연스럽게 연결하세요.

사주 데이터에 없는 구체적인 사건을 실제 사실처럼 단정하지 마세요.

[가독성]

각 주요 파트는 반드시 번호 제목으로 시작하세요.

예:

1. 핵심 성향
2. 강점과 매력
3. 주의할 점

Markdown의 ##, ###은 사용하지 마세요.

**굵은 글씨 표시도 사용하지 마세요.

번호 제목을 명확하게 작성하세요.

[주의]

사주는 자기이해와 오락을 위한 콘텐츠입니다.

질병, 의료, 법률, 투자, 생명과 관련된 확정적인 판단은 하지 마세요.

"무조건", "반드시", "100%", "절대" 같은 표현은 피하세요.
`;
}

function buildProductInstruction(productId: string): string {
  switch (productId) {
    case "free":
      return `
상품: 무료 사주 맛보기

약 1,000~1,500자.

구성:

1. 첫인상 한마디
2. 핵심 성향
3. 강점
4. 주의할 점
5. 한 줄 정리

첫 부분은 특히 재미있게 작성하세요.
`;

    case "love":
      return `
상품: 연애운 분석

약 2,000~2,800자.

포함:

1. 연애 첫인상
2. 사랑할 때의 모습
3. 끌리는 사람의 특징
4. 관계에서의 강점
5. 갈등이 생길 수 있는 포인트
6. 실제 연애 상황 예시
7. 연애에서 기억하면 좋은 포인트
8. 한 줄 총평

실제 연애 상황 예시는 최소 2개 넣으세요.
`;

    case "money-job":
      return `
상품: 재물·직업운 분석

약 2,000~2,800자.

포함:

1. 돈을 대하는 기본 성향
2. 돈을 벌 때 강점
3. 소비에서 주의할 점
4. 직업적 강점
5. 잘 맞는 업무 환경
6. 조직생활에서 나타날 수 있는 모습
7. 실제 직장 및 업무 상황 예시
8. 강점을 활용하는 방법
9. 한 줄 총평

금전적인 성공이나 특정 직업의 합격 등을 예언하지 마세요.
`;

    case "detail":
      return `
상품: 상세 사주 분석

약 2,500~3,500자.

포함:

1. 이 사주의 첫인상
2. 핵심 성향
3. 오행 특징
4. 강점과 매력
5. 약점과 주의점
6. 인간관계
7. 연애 성향
8. 직업 성향
9. 재물 성향
10. 실제 생활에서 나타날 수 있는 모습
11. 가장 중요한 조언
12. 한 줄 총평
`;

    case "compatibility":
      return `
상품: 궁합 분석

약 2,500~3,500자.

중요:
반드시 고객과 상대방의 사주 원국과 오행을 비교해서 작성하세요.

단순히 두 사람의 생년월일을 보고 추측하지 마세요.

포함:

1. 두 사람의 첫 번째 차이
2. 서로 잘 맞는 부분
3. 서로에게 끌릴 수 있는 부분
4. 갈등이 생길 수 있는 부분
5. 감정 표현 방식의 차이
6. 대화 방식의 차이
7. 실제 관계 상황 예시
8. 서로에게 필요한 배려
9. 관계를 오래 유지하기 위한 포인트
10. 한 줄 총평

"천생연분", "무조건 헤어진다" 같은 단정적인 표현은 금지합니다.

좋고 나쁨을 단순하게 판단하기보다
서로 다른 점을 어떻게 이해하면 좋은지를 설명하세요.
`;

    case "comprehensive":
      return `
상품: 종합 사주 분석

약 4,000~5,500자.

포함:

1. 이 사람을 한 문장으로 표현한다면
2. 핵심 성향
3. 오행 특징
4. 강점과 매력
5. 약점과 주의점
6. 인간관계
7. 연애
8. 재물
9. 직업
10. 실제 생활 속 모습
11. 앞으로 강점을 활용하는 방법
12. 가장 기억해야 할 한 가지
13. 최종 총평

각 주요 파트에 후킹과 현실적인 상황 예시를 적절히 넣으세요.
`;

    default:
      return `
기본 사주 분석 형식으로 작성하세요.
`;
  }
}

function buildPrompt(params: {
  productName: string;
  productId: string;
  customer: PersonData;
  partner?: PersonData;
  fourPillars: unknown;
  fiveElements: unknown;
  partnerFourPillars?: unknown;
  partnerFiveElements?: unknown;
}) {
  const {
    productName,
    productId,
    customer,
    partner,
    fourPillars,
    fiveElements,
    partnerFourPillars,
    partnerFiveElements,
  } = params;

  const compatibilityData =
    productId === "compatibility"
      ? `
━━━━━━━━━━━━━━━━━━
상대방 사주 원국
━━━━━━━━━━━━━━━━━━

${JSON.stringify(
  partnerFourPillars,
  null,
  2
)}

━━━━━━━━━━━━━━━━━━
상대방 오행
━━━━━━━━━━━━━━━━━━

${JSON.stringify(
  partnerFiveElements,
  null,
  2
)}
`
      : "";

  return `
${buildCommonStyle()}

━━━━━━━━━━━━━━━━━━
상품 정보
━━━━━━━━━━━━━━━━━━

상품명: ${productName}
상품 ID: ${productId}

━━━━━━━━━━━━━━━━━━
고객 기본 정보
━━━━━━━━━━━━━━━━━━

생년월일: ${customer.birthDate}
출생시간: ${customer.birthTime}
성별: ${customer.gender}

━━━━━━━━━━━━━━━━━━
고객 사주 원국
━━━━━━━━━━━━━━━━━━

${JSON.stringify(
  fourPillars,
  null,
  2
)}

━━━━━━━━━━━━━━━━━━
고객 오행
━━━━━━━━━━━━━━━━━━

${JSON.stringify(
  fiveElements,
  null,
  2
)}

${
  partner
    ? `
━━━━━━━━━━━━━━━━━━
상대방 기본 정보
━━━━━━━━━━━━━━━━━━

생년월일: ${partner.birthDate}
출생시간: ${partner.birthTime}
성별: ${partner.gender}
`
    : ""
}

${compatibilityData}

━━━━━━━━━━━━━━━━━━
상품별 작성 지침
━━━━━━━━━━━━━━━━━━

${buildProductInstruction(productId)}

━━━━━━━━━━━━━━━━━━
최종 지침
━━━━━━━━━━━━━━━━━━

위에 제공된 실제 사주 데이터를 기준으로 분석하세요.

특히 궁합 분석에서는 반드시 고객과 상대방의 사주 원국과 오행을 비교하세요.

사주 데이터에 없는 사실을 만들어내지 마세요.

설명만 나열하지 말고,

후킹
→ 성향 설명
→ 실제 상황 예시
→ 해석
→ 현실적인 조언

의 흐름을 적극적으로 사용하세요.

읽는 사람이
"아, 그래서 내가 이런 식으로 행동했구나."

라고 느낄 수 있는 결과를 만들어주세요.

마지막에는 기억에 남는 한 문장으로 마무리하세요.
`;
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY가 설정되지 않았습니다.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const {
      productId,
      customer,
      partner,
      fourPillars,
      fiveElements,
      partnerFourPillars,
      partnerFiveElements,
    } = body;

    if (!productId) {
      return NextResponse.json(
        {
          error:
            "상품이 선택되지 않았습니다.",
        },
        { status: 400 }
      );
    }

    const product =
      getAdminProduct(productId);

    if (!product) {
      return NextResponse.json(
        {
          error:
            "존재하지 않는 상품입니다.",
        },
        { status: 400 }
      );
    }

    if (!customer) {
      return NextResponse.json(
        {
          error:
            "고객 정보가 없습니다.",
        },
        { status: 400 }
      );
    }

    if (
      !cleanText(customer.birthDate) ||
      !cleanText(customer.birthTime) ||
      !cleanText(customer.gender)
    ) {
      return NextResponse.json(
        {
          error:
            "고객의 생년월일, 출생시간, 성별을 확인해주세요.",
        },
        { status: 400 }
      );
    }

    if (!fourPillars || !fiveElements) {
      return NextResponse.json(
        {
          error:
            "고객 사주 계산 결과가 없습니다.",
        },
        { status: 400 }
      );
    }

    if (productId === "compatibility") {
      if (!partner) {
        return NextResponse.json(
          {
            error:
              "궁합 분석에는 상대방 정보가 필요합니다.",
          },
          { status: 400 }
        );
      }

      if (
        !cleanText(partner.birthDate) ||
        !cleanText(partner.birthTime) ||
        !cleanText(partner.gender)
      ) {
        return NextResponse.json(
          {
            error:
              "상대방의 생년월일, 출생시간, 성별을 확인해주세요.",
          },
          { status: 400 }
        );
      }

      if (
        !partnerFourPillars ||
        !partnerFiveElements
      ) {
        return NextResponse.json(
          {
            error:
              "상대방 사주 계산 결과가 없습니다.",
          },
          { status: 400 }
        );
      }
    }

    const prompt = buildPrompt({
      productName: product.name,
      productId,
      customer,
      partner,
      fourPillars,
      fiveElements,
      partnerFourPillars,
      partnerFiveElements,
    });

    const response =
      await openai.responses.create({
        model:
          process.env.OPENAI_MODEL ||
          "gpt-4o-mini",
        input: prompt,
      });

    const result =
      response.output_text?.trim();

    if (!result) {
      return NextResponse.json(
        {
          error:
            "AI 분석 결과가 생성되지 않았습니다.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      result,
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
      },
    });
  } catch (error) {
    console.error(
      "TEST ANALYSIS ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "AI 분석 중 알 수 없는 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
