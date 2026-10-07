import { NextResponse } from "next/server";

const TOSS_CONFIRM_URL =
  "https://api.tosspayments.com/v1/payments/confirm";

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
    const secretKey = process.env.TOSS_SECRET_KEY;

    if (!secretKey) {
     return NextResponse.json(
  {
    success: false,
    error: "결제 승인 처리 중 오류가 발생했습니다.",
  },
  { status: 500 }
);
    }

    const body = await request.json().catch(() => null);

    const paymentKey =
      typeof body?.paymentKey === "string"
        ? body.paymentKey.trim()
        : "";

    const orderId =
      typeof body?.orderId === "string"
        ? body.orderId.trim()
        : "";

    const amount = Number(body?.amount);

    if (!paymentKey || !orderId || !Number.isFinite(amount)) {
      return NextResponse.json(
        {
          success: false,
          error: "결제 승인에 필요한 정보가 부족합니다.",
        },
        { status: 400 }
      );
    }

    if (amount !== EXPECTED_AMOUNT) {
      return NextResponse.json(
        {
          success: false,
          error: "결제 금액이 올바르지 않습니다.",
        },
        { status: 400 }
      );
    }

    if (
      orderId.length < 6 ||
      orderId.length > 64 ||
      !/^[A-Za-z0-9_-]+$/.test(orderId)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "주문번호 형식이 올바르지 않습니다.",
        },
        { status: 400 }
      );
    }

    const auth = getAuthHeader(secretKey);

    const confirmResponse = await fetch(TOSS_CONFIRM_URL, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
        "Idempotency-Key": paymentKey,
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount,
      }),
      cache: "no-store",
    });

    const confirmData = await readTossResponse(confirmResponse);

    if (confirmResponse.ok) {
      if (
        confirmData?.status !== "DONE" ||
        confirmData?.orderId !== orderId ||
        Number(confirmData?.totalAmount) !== amount
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "결제 승인 결과 검증에 실패했습니다.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        alreadyProcessed: false,
        paymentKey: confirmData.paymentKey,
        orderId: confirmData.orderId,
        amount: Number(confirmData.totalAmount),
        status: confirmData.status,
      });
    }

    /*
     * 성공 URL 새로고침이나 재전송으로
     * 이미 승인된 결제를 다시 승인하려는 경우
     */
    if (confirmData?.code === "ALREADY_PROCESSED_PAYMENT") {
      const paymentResponse = await fetch(
        `${TOSS_PAYMENT_BY_KEY_URL}/${encodeURIComponent(paymentKey)}`,
        {
          method: "GET",
          headers: {
            Authorization: auth,
          },
          cache: "no-store",
        }
      );

      const paymentData = await readTossResponse(paymentResponse);

      if (
        paymentResponse.ok &&
        paymentData?.status === "DONE" &&
        paymentData?.orderId === orderId &&
        Number(paymentData?.totalAmount) === amount
      ) {
        return NextResponse.json({
          success: true,
          alreadyProcessed: true,
          paymentKey: paymentData.paymentKey,
          orderId: paymentData.orderId,
          amount: Number(paymentData.totalAmount),
          status: paymentData.status,
        });
      }
    }

    return NextResponse.json(
      {
        success: false,
        error:
          confirmData?.message ||
          "결제 승인에 실패했습니다.",
        code:
          confirmData?.code ||
          "PAYMENT_CONFIRM_FAILED",
      },
      {
        status: confirmResponse.status || 400,
      }
    );
  } catch (error) {
    console.error("payment confirm error", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "결제 승인 처리 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
