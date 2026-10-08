import OpenAI from "openai";
import { NextResponse } from "next/server";
import { Solar } from "lunar-javascript";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const birthDate =
      typeof body.birthDate === "string" ? body.birthDate.trim() : "";

    const birthTime =
      typeof body.birthTime === "string" ? body.birthTime.trim() : "";

    const gender =
      typeof body.gender === "string" ? body.gender.trim() : "";

    if (!birthDate || !birthTime || !gender) {
      return NextResponse.json(
        {
          error: "생년월일, 태어난 시간, 성별을 모두 입력해주세요.",
        },
        { status: 400 }
      );
    }

    // 생년월일: YYYY-MM-DD
    const dateParts = birthDate.split("-");

    if (dateParts.length !== 3) {
      return NextResponse.json(
        {
          error: "생년월일 형식이 올바르지 않습니다.",
        },
        { status: 400 }
      );
    }

    const year = Number(dateParts[0]);
    const month = Number(dateParts[1]);
    const day = Number(dateParts[2]);

    // 태어난 시간: HH:MM
    // 관리자 페이지에서 14:30~16:00처럼 전달되는 경우
    // 시작 시간 14:30만 사용합니다.
    const normalizedBirthTime = birthTime.split("~")[0].trim();
    const timeParts = normalizedBirthTime.split(":");

    if (timeParts.length !== 2) {
      return NextResponse.json(
        {
          error: "태어난 시간 형식이 올바르지 않습니다.",
        },
        { status: 400 }
      );
    }

    const hour = Number(timeParts[0]);
    const minute = Number(timeParts[1]);

    const validGender = gender === "남성" || gender === "여성";

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      !Number.isInteger(day) ||
      !Number.isInteger(hour) ||
      !Number.isInteger(minute) ||
      year < 1900 ||
      year > 2100 ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31 ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59 ||
      !validGender
    ) {
      return NextResponse.json(
        {
          error: "생년월일 또는 태어난 시간 형식이 올바르지 않습니다.",
        },
        { status: 400 }
      );
    }

    // 양력 생년월일시로 사주 계산
    const solar = Solar.fromYmdHms(
      year,
      month,
      day,
      hour,
      minute,
      0
    );

    const lunar = solar.getLunar();
    const eightChar = lunar.getEightChar();

    // 사주 4주
    const yearPillar = eightChar.getYear();
    const monthPillar = eightChar.getMonth();
    const dayPillar = eightChar.getDay();
    const timePillar = eightChar.getTime();

    const fourPillars = {
      year: yearPillar,
      month: monthPillar,
      day: dayPillar,
      time: timePillar,
    };

    // 오행 계산
    const fiveElementList = [
      ...eightChar.getYearWuXing().split(""),
      ...eightChar.getMonthWuXing().split(""),
      ...eightChar.getDayWuXing().split(""),
      ...eightChar.getTimeWuXing().split(""),
    ];

    const fiveElements = {
      wood: fiveElementList.filter((item) => item === "木").length,
      fire: fiveElementList.filter((item) => item === "火").length,
      earth: fiveElementList.filter((item) => item === "土").length,
      metal: fiveElementList.filter((item) => item === "金").length,
      water: fiveElementList.filter((item) => item === "水").length,
    };

    const prompt = `
당신은 한국 전통 사주를 설명하는 AI 상담가입니다.

사용자가 입력한 생년월일시와 프로그램으로 계산된 사주 원국을 바탕으로
재미와 자기성찰을 위한 사주 해석을 작성해주세요.

미래를 확정적으로 단정하지 말고,
전통적인 사주 해석이라는 점을 고려하여
부드럽고 이해하기 쉬운 표현을 사용해주세요.

[입력 정보]
- 생년월일: ${birthDate}
- 태어난 시간: ${normalizedBirthTime}
- 성별: ${gender}

[계산된 사주 원국]
- 년주: ${yearPillar}
- 월주: ${monthPillar}
- 일주: ${dayPillar}
- 시주: ${timePillar}

[오행]
- 목: ${fiveElements.wood}
- 화: ${fiveElements.fire}
- 토: ${fiveElements.earth}
- 금: ${fiveElements.metal}
- 수: ${fiveElements.water}

중요:
위에 제공된 사주 원국은 프로그램으로 계산된 값입니다.
임의로 다른 간지로 변경하거나 추측하지 마세요.

다음 항목을 포함해주세요.

# 1. 전체적인 성향
사주 원국을 바탕으로 전반적인 성향을 설명해주세요.

# 2. 성격 및 인간관계
대인관계에서 나타날 수 있는 특징과 강점을 설명해주세요.

# 3. 직업 및 재물운
어떤 업무 환경이나 일의 방식과 잘 맞을 수 있는지 설명해주세요.
재물운은 확정적인 미래 예측이 아니라 전통적인 해석 관점에서 설명해주세요.

# 4. 연애 및 대인관계
연애와 인간관계에서 나타날 수 있는 성향을 설명해주세요.

# 5. 앞으로의 흐름
특정 사건이나 결과를 단정하지 말고,
앞으로 참고할 수 있는 일반적인 흐름과 경향을 설명해주세요.

# 6. 생활에 도움이 되는 조언
현실적으로 적용할 수 있는 자기관리와 생활 조언을 작성해주세요.

각 항목은 이해하기 쉽고 자연스러운 한국어로 작성해주세요.
`;

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-6-luna",
      input: prompt,
    });

    return NextResponse.json({
      result: response.output_text || "",
      fourPillars,
      fiveElements,
    });
  } catch (error) {
    console.error("saju api error:", error);

    return NextResponse.json(
      {
        error: "AI 사주 분석 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
