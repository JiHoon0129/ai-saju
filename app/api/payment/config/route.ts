import { NextResponse } from "next/server";

export async function GET() {
  const clientKey = process.env.TOSS_CLIENT_KEY;

  if (!clientKey) {
    return NextResponse.json(
      { error: "TOSS_CLIENT_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ clientKey });
}
