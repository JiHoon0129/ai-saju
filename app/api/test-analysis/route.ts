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

이번 분석은 "정확하고 재미있게 읽히는 사주 리포트"를 만드는 것이 목표입니다.

[문체 규칙]
1. 어려운 한자어나 전문용어를 남발하지 마세요.
2. 전문적인 사주 용어가 필요한 경우 반드시 쉬운 말로 풀어서 설명하세요.
3. "~합니다"만 반복하지 말고 자연스러운 문장을 섞으세요.
4. 실제 상담사가 말해주는 것처럼 따뜻하고 자신감 있게 작성하세요.
5. 지나치게 운명론적이거나 공포를 유발하는 표현은 사용하지 마세요.
6. "무조건", "반드시", "100%", "절대" 같은 단정적인 표현을 피하세요.
7. 좋은 점만 말하지 말고 주의할 점도 현실적으로 설명하세요.
8. 같은 의미의 문장을 반복하지 마세요.
9. 문단을 너무 길게 만들지 마세요.
10. 한 문단은 2~4문장 정도로 읽기 편하게 작성하세요.

[후킹 규칙]
각 주요 파트의 시작에는 독자가 궁금해할 만한 한 문장을 넣으세요.

예:
"겉으로는 차분해 보여도, 속에서는 생각이 상당히 빠른 편입니다."
"여기서 꽤 재미있는 특징이 하나 보입니다."
"이 부분은 본인보다 주변 사람들이 먼저 알아차릴 가능성이 있습니다."
"연애에서는 의외의 모습이 나타날 수 있습니다."
"돈을 대하는 방식에서 이 사주의 특징이 꽤 뚜렷합니다."

후킹은 억지로 자극적으로 만들지 말고,
"어? 이거 내 이야기인가?"라는 느낌이 들도록 작성하세요.

[딕션 규칙]
설명만 하지 말고 말을 거는 듯한 표현을 적절히 사용하세요.

예:
"쉽게 말하면 이렇습니다."
"그런데 여기서 한 가지가 중요합니다."
"이 부분은 꽤 눈여겨볼 만합니다."
"본인은 별일 아니라고 생각할 수 있지만..."
"주변에서는 오히려 이렇게 느낄 수 있습니다."

단, 이런 표현을 모든 문단에 반복해서 사용하지 마세요.

[엑트 규칙]
가능한 부분에는 실제 생활 장면을 하나씩 넣으세요.

예:
"예를 들어 갑자기 새로운 일을 제안받았을 때,
처음에는 고민하는 것처럼 보여도 마음속에서는 이미 계산을 끝내고 있을 가능성이 있습니다."

또는

"친한 사람과 의견이 부딪혔을 때 바로 화를 내기보다는
일단 참았다가 나중에 한꺼번에 이야기하는 모습으로 나타날 수 있습니다."

단, 사주에서 근거가 부족한 구체적인 사건을 사실처럼 단정하지 마세요.
"~할 수 있습니다", "~한 모습으로 나타날 수 있습니다"처럼 표현하세요.

[구성 규칙]
각 파트는 반드시 아래처럼 번호가 있는 제목으로 시작하세요.

1. 핵심 성향
2. 강점과 매력
3. 주의할 점
4. 현실에서 나타나는 모습
5. 앞으로의 활용 포인트

상품에 따라 필요한 항목을 추가하거나 변경할 수 있습니다.

[가독성 규칙]
- 한 줄이 지나치게 길어지지 않게 작성하세요.
- 짧은 문장과 긴 문장을 적절히 섞으세요.
- 핵심 문장은 독자가 기억하기 쉽게 작성하세요.
- Markdown의 ##, ### 같은 제목 문법은 사용하지 마세요.
- 별표(**)를 이용한 굵은 글씨도 사용하지 마세요.
- 번호 제목만 사용하세요.
- 이모지는 전체 결과에서 최대 3개까지만 사용하고 남발하지 마세요.

[중요]
사주 분석은 오락 및 자기이해를 위한 콘텐츠라는 성격을 유지하세요.
의학, 법률, 투자, 질병, 생명과 관련된 확정적 판단을 하지 마세요.
`;
}

function buildProductInstruction(productId: string): string {
  switch (productId) {
    case "free":
      return `
상품: 무료 사주 맛보기

목적:
처음 방문한 사람이 "내 사주가 이런 특징이 있구나"라고 재미있게 느끼게 만드는 분석입니다.

분량:
약 1,000~1,500자.

구성:
1. 첫인상 한마디
2. 핵심 성향
3. 강점
4. 주의할 점
5. 한 줄 정리

처음 2~3문장은 특히 재미있고 강하게 작성하세요.
유료 상품을 억지로 홍보하지 말고 무료 분석 자체의 만족도를 높이세요.
`;

    case "love":
      return `
상품: 연애운 분석

목적:
연애할 때 어떤 방식으로 사랑하고, 어떤 상황에서 마음이 움직이며,
어떤 부분에서 갈등이 생길 수 있는지를 재미있게 보여주는 분석입니다.

분량:
약 2,000~2,800자.

반드시 포함:
1. 연애 첫인상
2. 사랑할 때의 모습
3. 끌리는 사람의 특징
4. 관계에서의 강점
5. 갈등이 생길 수 있는 포인트
6. 실제 연애 상황 예시
7. 연애에서 기억하면 좋은 포인트
8. 한 줄 총평

연애 상황 예시는 최소 2개 넣으세요.

예:
"연락이 평소보다 줄어들었을 때..."
"상대방이 서운하다고 이야기했을 때..."

단, 특정 사건이 반드시 발생한다고 단정하지 마세요.
`;

    case "money-job":
      return `
상품: 재물·직업운 분석

목적:
돈을 대하는 방식과 일할 때의 특징을 현실적인 관점에서 설명하세요.

분량:
약 2,000~2,800자.

반드시 포함:
1. 돈을 대하는 기본 성향
2. 돈을 벌 때 강점
3. 지출 및 소비에서 주의할 점
4. 직업적 강점
5. 잘 맞는 업무 환경
6. 조직생활에서 나타날 수 있는 모습
7. 실제 직장/업무 상황 예시
8. 앞으로 활용하면 좋은 강점
9. 한 줄 총평

투자 수익률, 금전적 성공, 특정 직업의 합격 등을 예언하지 마세요.
`;

    case "detail":
      return `
상품: 상세 사주 분석

목적:
사주 전체적인 성향을 가장 균형 있게 설명하는 상세 분석입니다.

분량:
약 2,500~3,500자.

반드시 포함:
1. 이 사주의 첫인상
2. 핵심 성향
3. 오행에서 나타나는 특징
4. 강점과 매력
5. 약점과 주의점
6. 인간관계
7. 연애 성향
8. 직업 성향
9. 재물 성향
10. 실제 생활에서 나타날 수 있는 모습
11. 가장 중요한 조언
12. 한 줄 총평

각 파트마다 최소 하나의 "실제 상황에서 어떻게 나타날 수 있는지"를 넣어주세요.
`;

    case "compatibility":
      return `
상품: 궁합 분석

목적:
두 사람의 차이와 잘 맞는 부분을 재미있게 비교해서 설명하세요.

분량:
약 2,500~3,500자.

반드시 포함:
1. 두 사람의 첫 번째 차이
2. 서로 잘 맞는 부분
3. 서로에게 끌릴 수 있는 부분
4. 갈등이 생길 수 있는 부분
5. 감정 표현 방식의 차이
6. 대화 방식의 차이
7. 실제 상황 예시
8. 관계를 오래 유지하기 위한 포인트
9. 한 줄 총평

"천생연분", "무조건 헤어진다" 같은 단정적인 표현은 금지합니다.

궁합은 좋고 나쁨을 단순하게 판단하기보다
"서로 다른 점을 어떻게 이해하면 좋은가"에 초점을 맞추세요.
`;

    case "comprehensive":
      return `
상품: 종합 사주 분석

목적:
사용자가 자신의 사주를 전체적으로 이해할 수 있도록 가장 풍부하고 재미있게 작성하세요.

분량:
약 4,000~5,500자.

반드시 포함:
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

각 주요 파트에 후킹 문장을 넣고,
가능한 파트에는 현실적인 상황 예시를 넣으세요.

마지막은 단순한 요약이 아니라
사용자가 읽고 "아, 그래서 내가 이런 식으로 행동했구나"라고 느낄 수 있는 문장으로 마무리하세요.
`;

    default:
      return `
상품 정보를 확인할 수 없습니다.
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
}) {
  const { productName, productId, customer, partner, fourPillars, fiveElements } =
    params;

  return `
${buildCommonStyle()}

━━━━━━━━━━━━━━━━━━
상품 정보
━━━━━━━━━━━━━━━━━━

상품명: ${productName}
상품 ID: ${productId}

━━━━━━━━━━━━━━━━━━
고객 정보
━━━━━━━━━━━━━━━━━━

생년월일: ${customer.birthDate}
출생시간: ${customer.birthTime}
성별: ${customer.gender}

${partner
  ? `
━━━━━━━━━━━━━━━━━━
상대방 정보
━━━━━━━━━━━━━━━━━━

생년월일: ${partner.birthDate}
출생시간: ${partner.birthTime}
성별: ${partner.gender}
`
  : ""}

━━━━━━━━━━━━━━━━━━
사주 원국
━━━━━━━━━━━━━━━━━━

${JSON.stringify(fourPillars, null, 2)}

━━━━━━━━━━━━━━━━━━
오행
━━━━━━━━━━━━━━━━━━

${JSON.stringify(fiveElements, null, 2)}

━━━━━━━━━━━━━━━━━━
상품별 작성 지침
━━━━━━━━━━━━━━━━━━

${buildProductInstruction(productId)}

━━━━━━━━━━━━━━━━━━
최종 작성 지침
━━━━━━━━━━━━━━━━━━

이제 위의 실제 사주 데이터를 바탕으로 분석을 작성하세요.

중요합니다.

1. 사주 데이터에 없는 사실을 만들어내지 마세요.
2. 단순히 사주 용어를 나열하지 마세요.
3. 반드시 사람이 읽었을 때 자연스러워야 합니다.
4. 각 파트의 첫 부분에는 짧은 후킹을 넣으세요.
5. 가능한 경우 실제 생활 속 상황을 예시로 보여주세요.
6. 장점과 주의점을 균형 있게 작성하세요.
7. 같은 표현을 반복하지 마세요.
8. "당신은 ~한 사람입니다"만 반복하지 마세요.
9. 독자가 직접 상담받는 느낌이 들도록 작성하세요.
10. 과도하게 무겁거나 무서운 표현은 피하세요.
11. 결과 전체가 하나의 이야기처럼 자연스럽게 이어져야 합니다.
12. 마지막에는 기억에 남는 한 문장으로 마무리하세요.

다시 강조합니다.

이 결과의 목적은
"사주 용어를 많이 보여주는 것"이 아니라
"읽는 사람이 자신의 모습을 재미있게 발견하게 만드는 것"입니다.

따라서 설명 → 상황 예시 → 해석 → 현실적인 조언의 흐름을 적극적으로 사용하세요.
`;
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY가 설정되지 않았습니다." },
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
    } = body;

    if (!productId) {
      return NextResponse.json(
        { error: "상품이 선택되지 않았습니다." },
        { status: 400 }
      );
    }

    const product = getAdminProduct(productId);

    if (!product) {
      return NextResponse.json(
        { error: "존재하지 않는 상품입니다." },
        { status: 400 }
      );
    }

    if (!customer) {
      return NextResponse.json(
        { error: "고객 정보가 없습니다." },
        { status: 400 }
      );
    }

    if (
      !cleanText(customer.birthDate) ||
      !cleanText(customer.birthTime) ||
      !cleanText(customer.gender)
    ) {
      return NextResponse.json(
        { error: "고객의 생년월일, 출생시간, 성별을 확인해주세요." },
        { status: 400 }
      );
    }

    if (productId === "compatibility" && !partner) {
      return NextResponse.json(
        { error: "궁합 분석에는 상대방 정보가 필요합니다." },
        { status: 400 }
      );
    }

    const prompt = buildPrompt({
      productName: product.name,
      productId,
      customer,
      partner,
      fourPillars,
      fiveElements,
    });

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      input: prompt,
    });

    const result = response.output_text?.trim();

    if (!result) {
      return NextResponse.json(
        { error: "AI 분석 결과가 생성되지 않았습니다." },
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
    console.error("TEST ANALYSIS ERROR:", error);

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
