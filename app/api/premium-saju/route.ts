import { NextResponse } from "next/server";
import OpenAI from "openai";

const TOSS_PAYMENT_BY_KEY_URL =
  "https://api.tosspayments.com/v1/payments";

const EXPECTED_AMOUNT = 9900;

function getAuthHeader(secretKey: string) {
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

async function readTossResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      code: "INVALID_TOSS_RESPONSE",
      message: "토스 결제 서버의 응답을 읽지 못했습니다.",
    };
  }
}

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
    const tossSecretKey = process.env.TOSS_SECRET_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    if (!tossSecretKey) {
      return NextResponse.json(
        { error: "TOSS_SECRET_KEY가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    /*
     * 서버에서 실제 토스 결제 상태 확인
     */
    const paymentResponse = await fetch(
      `${TOSS_PAYMENT_BY_KEY_URL}/${encodeURIComponent(paymentKey)}`,
      {
        method: "GET",
        headers: {
          Authorization: getAuthHeader(tossSecretKey),
        },
        cache: "no-store",
      }
    );

    const paymentData = await readTossResponse(paymentResponse);

    if (!paymentResponse.ok) {
      console.error("Toss payment lookup failed:", paymentData);

      return NextResponse.json(
        {
          error:
            paymentData?.message ||
            "결제 정보를 확인하지 못했습니다.",
          code:
            paymentData?.code ||
            "PAYMENT_LOOKUP_FAILED",
        },
        {
          status: paymentResponse.status || 400,
        }
      );
    }

    /*
     * 결제 완료 상태 확인
     */
    if (paymentData?.status !== "DONE") {
      return NextResponse.json(
        {
          error: "결제가 완료된 상태가 아닙니다.",
          code: "PAYMENT_NOT_DONE",
        },
        { status: 400 }
      );
    }

    /*
     * 주문번호 검증
     */
    if (paymentData?.orderId !== orderId) {
      return NextResponse.json(
        {
          error: "결제 주문번호가 일치하지 않습니다.",
          code: "PAYMENT_ORDER_MISMATCH",
        },
        { status: 400 }
      );
    }

    /*
     * 결제 금액 검증
     */
    if (Number(paymentData?.totalAmount) !== EXPECTED_AMOUNT) {
      return NextResponse.json(
        {
          error: "결제 금액이 일치하지 않습니다.",
          code: "PAYMENT_AMOUNT_MISMATCH",
        },
        { status: 400 }
      );
    }

    /*
     * 결제 검증이 모두 통과된 경우에만
     * 상세 사주 분석 실행
     */
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
      {
        error: "상세 AI 사주 분석 생성 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
