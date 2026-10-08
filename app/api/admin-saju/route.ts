import { NextResponse } from "next/server";
import { Solar } from "lunar-javascript";

function getStartTime(value: string) {
  return value.includes("~") ? value.split("~")[0] : value;
}

export async function POST(request: Request) {
  try {
    const { birthDate, birthTime, gender } = await request.json();

    if (!birthDate || !birthTime || !gender) {
      return NextResponse.json(
        { error: "생년월일, 태어난 시간, 성별을 모두 입력해주세요." },
        { status: 400 }
      );
    }

    const normalizedTime = getStartTime(String(birthTime));

    const [year, month, day] = String(birthDate)
      .split("-")
      .map(Number);

    const [hour, minute] = normalizedTime
      .split(":")
      .map(Number);

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      !Number.isInteger(day) ||
      !Number.isInteger(hour) ||
      !Number.isInteger(minute) ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31 ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59 ||
      !["남성", "여성"].includes(gender)
    ) {
      return NextResponse.json(
        { error: "생년월일 또는 태어난 시간 형식이 올바르지 않습니다." },
        { status: 400 }
      );
    }

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

    const fourPillars = {
      year: eightChar.getYear(),
      month: eightChar.getMonth(),
      day: eightChar.getDay(),
      time: eightChar.getTime(),
    };

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

    return NextResponse.json({
      fourPillars,
      fiveElements,
    });
  } catch (error) {
    console.error("admin-saju error:", error);

    return NextResponse.json(
      { error: "관리자 만세력 계산 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
