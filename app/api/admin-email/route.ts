import { NextResponse } from "next/server";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

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
        {
          success: false,
          error: "수신 이메일 주소가 없습니다.",
        },
        { status: 400 }
      );
    }

    if (!isValidEmail(to)) {
      return NextResponse.json(
        {
          success: false,
          error: "이메일 주소 형식이 올바르지 않습니다.",
        },
        { status: 400 }
      );
    }

    if (!pdfBase64 || typeof pdfBase64 !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "첨부할 PDF 파일이 없습니다.",
        },
        { status: 400 }
      );
    }

    if (pdfBase64.length < 100) {
      return NextResponse.json(
        {
          success: false,
          error: "PDF 파일 데이터가 정상적으로 전달되지 않았습니다.",
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;

    if (!apiKey) {
      console.error("RESEND_API_KEY is missing");

      return NextResponse.json(
        {
          success: false,
          error:
            "RESEND_API_KEY가 설정되지 않았습니다. Vercel Environment Variables를 확인해주세요.",
        },
        { status: 500 }
      );
    }

    if (!fromEmail) {
      console.error("RESEND_FROM_EMAIL is missing");

      return NextResponse.json(
        {
          success: false,
          error:
            "RESEND_FROM_EMAIL이 설정되지 않았습니다. Vercel Environment Variables를 확인해주세요.",
        },
        { status: 500 }
      );
    }

    if (!isValidEmail(fromEmail)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "RESEND_FROM_EMAIL의 이메일 주소 형식이 올바르지 않습니다.",
        },
        { status: 500 }
      );
    }

    const resendResponse = await fetch(
      "https://api.resend.com/emails",
      {
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
            <div
              style="
                font-family:
                  Arial,
                  'Apple SD Gothic Neo',
                  'Malgun Gothic',
                  sans-serif;
                line-height: 1.7;
                color: #171717;
              "
            >
              <h2>AI 사주 분석 결과 안내</h2>

              <p>
                요청하신
                <strong>${productName}</strong>
                결과를 보내드립니다.
              </p>

              <p>
                첨부된 PDF 파일을 확인해주세요.
              </p>

              <div
                style="
                  margin: 24px 0;
                  padding: 16px;
                  background: #f5f5f5;
                  border-radius: 10px;
                "
              >
                PDF 파일명:
                <strong>ai-saju-result.pdf</strong>
              </div>

              <hr />

              <p
                style="
                  color: #777;
                  font-size: 13px;
                "
              >
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
      }
    );

    const responseText = await resendResponse.text();

    let resendData: {
      id?: string;
      message?: string;
      name?: string;
    } = {};

    try {
      resendData = JSON.parse(responseText);
    } catch {
      console.error(
        "Resend non-JSON response:",
        responseText
      );
    }

    if (!resendResponse.ok) {
      console.error("Resend API error:", {
        status: resendResponse.status,
        data: resendData,
      });

      return NextResponse.json(
        {
          success: false,
          error:
            resendData.message ||
            `이메일 발송 실패 (${resendResponse.status})`,
        },
        { status: 500 }
      );
    }

    if (!resendData.id) {
      console.error(
        "Resend succeeded without email id:",
        resendData
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Resend에서 발송 ID를 받지 못했습니다.",
        },
        { status: 500 }
      );
    }

    console.log("Email sent successfully:", {
      id: resendData.id,
      to,
      productName,
    });

    return NextResponse.json({
      success: true,
      message: "이메일 발송 완료",
      emailId: resendData.id,
    });
  } catch (error) {
    console.error("admin-email error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "이메일 발송 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
