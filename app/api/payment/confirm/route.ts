import { NextResponse } from "next/server";

const TOSS_CONFIRM_URL =
  "https://api.tosspayments.com/v1/payments/confirm";

const EXPECTED_AMOUNT = 9900;

export async function POST(request: Request) {
  try {
    const { paymentKey, orderId, amount } = await request.json();

    if (
      typeof paymentKey !== "string" ||
      typeof orderId !== "string" ||
      amount !== EXPECTED_AMOUNT
    ) {
      return NextResponse.json(
        { error: "결제 정보가 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const secretKey = process.env.TOSS_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json(
        { error: "TOSS_SECRET_KEY가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const encodedKey = Buffer.from(`${secretKey}:`).toString("base64");

    const response = await fetch(TOSS_CONFIRM_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${encodedKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount,
      }),
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data.message || "토스 결제 승인에 실패했습니다.",
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      paymentKey: data.paymentKey,
      orderId: data.orderId,
      amount: data.totalAmount,
      status: data.status,
    });
  } catch (error) {
    console.error("Toss confirm error:", error);

    return NextResponse.json(
      { error: "결제 승인 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
