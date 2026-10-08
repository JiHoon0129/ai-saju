import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      to,
      productName = "AI 사주 분석",
      pdfBase64,
    } = body;

    if (!to || typeof to !== "string") {
      return NextResponse.json(
        { error: "수신 이메일 주소가 없습니다." },
        { status: 400 }
      );
    }

    if (!pdfBase64 || typeof pdfBase64 !== "string") {
      return NextResponse.json(
        { error: "첨부할 PDF 파일이 없습니다." },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;

    if (!apiKey) {
      return NextResponse.json(
        { error: "RESEND_API_KEY 환경변수가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    if (!fromEmail) {
      return NextResponse.json(
        { error: "RESEND_FROM_EMAIL 환경변수가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject: `${productName} 결과 안내`,
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.7;">
            <h2>AI 사주 분석 결과 안내</h2>
            <p>요청하신 <strong>${productName}</strong> 결과를 보내드립니다.</p>
            <p>첨부된 PDF 파일을 확인해주세요.</p>
            <hr />
            <p style="color:#777;font-size:13px;">
              본 결과는 전통 사주 해석을 참고한 AI 콘텐츠이며
              미래를 확정적으로 예측하지 않습니다.
            </p>
          </div>
        `,
        attachments: [
          {
            filename: "ai-saju-result.pdf",
            content: pdfBase64,
          },
        ],
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend error:", resendData);

      return NextResponse.json(
        {
          error:
            resendData?.message ||
            "이메일 발송에 실패했습니다.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "이메일 발송 완료",
      emailId: resendData.id || null,
    });
  } catch (error) {
    console.error("admin-email error:", error);

    return NextResponse.json(
      { error: "이메일 발송 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
