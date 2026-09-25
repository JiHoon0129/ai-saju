import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: Request) {
  try {
    const {
      birthDate,
      birthTime,
      gender,
      paymentKey,
      orderId,
    } = await request.json();

    if (
      !birthDate ||
      !birthTime ||
      !gender ||
      !paymentKey ||
      !orderId
    ) {
      return NextResponse.json(
        { error: "상세 사주 분석에 필요한 정보가 부족합니다." },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const client = new OpenAI({
      apiKey,
    });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "당신은 한국 전통 사주 해석을 참고한 콘텐츠를 작성하는 AI입니다. 미래를 확정적으로 단정하지 말고 오락 및 참고용으로 설명하세요. 사용자가 이해하기 쉽게 작성하고 과도한 공포나 단정적 표현은 피하세요. 반드시 다음 6개 제목을 순서대로 사용하세요: # 1. 종합 사주, # 2. 재물운, # 3. 직업운, # 4. 연애·대인관계, # 5. 시기별 흐름, # 6. 오행 상세 분석.",
        },
        {
          role: "user",
          content: `다음 정보를 바탕으로 상세 사주 분석을 작성해주세요.

생년월일: ${birthDate}
태어난 시간: ${birthTime}
성별: ${gender}

각 항목은 충분히 구체적으로 설명하되, 사주가 미래를 확정한다는 식으로 표현하지 마세요.`,
        },
      ],
    });

    const result =
      completion.choices[0]?.message?.content?.trim() ||
      "상세 사주 분석 결과를 생성하지 못했습니다.";

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Premium saju error:", error);

    return NextResponse.json(
      { error: "상세 AI 사주 분석 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
