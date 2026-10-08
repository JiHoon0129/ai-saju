"use client";

import { useState } from "react";

const birthTimeRanges = [
  "00:00~01:30",
  "01:30~03:00",
  "03:00~04:30",
  "04:30~06:00",
  "06:00~07:30",
  "07:30~09:00",
  "09:00~10:30",
  "10:30~12:00",
  "12:00~13:30",
  "13:30~15:00",
  "15:00~16:30",
  "16:30~18:00",
  "18:00~19:30",
  "19:30~21:00",
  "21:00~22:30",
  "22:30~00:00",
];

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [gender, setGender] = useState<"남성" | "여성" | "">("");

  const handleNext = () => {
    if (!email.trim()) {
      alert("고객 이메일을 입력해주세요.");
      return;
    }

    if (!birthDate) {
      alert("생년월일을 입력해주세요.");
      return;
    }

    if (!birthTime) {
      alert("태어난 시간을 선택해주세요.");
      return;
    }

    if (!gender) {
      alert("성별을 선택해주세요.");
      return;
    }

    alert("입력 정보가 정상적으로 확인되었습니다.");
  };

  return (
    <main className="min-h-screen bg-[#070b13] px-4 py-8 text-white sm:px-6 sm:py-12">
      <div className="mx-auto max-w-2xl">

        {/* Header */}
        <header className="mb-8 text-center sm:mb-10">
          <p className="text-xs font-semibold tracking-[0.28em] text-[#d8b46a]">
            DAON SAJU
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            관리자 시스템
          </h1>

          <p className="mt-3 text-sm leading-6 text-white/40">
            고객 정보를 입력하고 사주 분석을 준비합니다.
          </p>
        </header>

        {/* Main Card */}
        <section className="rounded-[28px] border border-[#d8b46a]/25 bg-white/[0.035] p-5 shadow-[0_25px_100px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-8">

          {/* Email */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#ead29a]">
              고객 이메일
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@example.com"
              className="min-h-[54px] w-full rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-4 text-base text-white outline-none transition placeholder:text-white/20 focus:border-[#d8b46a]/70 focus:bg-white/[0.08]"
            />

            <p className="mt-2 text-xs text-white/30">
              분석 결과를 이메일로 보내기 위해 사용합니다.
            </p>
          </div>

          {/* Birth Date */}
          <div className="mt-5">
            <label className="mb-2 block text-sm font-semibold text-[#ead29a]">
              생년월일
            </label>

            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="min-h-[54px] w-full cursor-pointer rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-4 text-base text-white outline-none transition focus:border-[#d8b46a]/70 focus:bg-white/[0.08]"
              style={{ colorScheme: "dark" }}
            />
          </div>

          {/* Birth Time */}
          <div className="mt-5">
            <label className="mb-2 block text-sm font-semibold text-[#ead29a]">
              태어난 시간
            </label>

            <select
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
              className="min-h-[54px] w-full cursor-pointer appearance-none rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-4 text-base text-white outline-none transition focus:border-[#d8b46a]/70 focus:bg-white/[0.08]"
            >
              <option value="" className="bg-[#08101b]">
                태어난 시간대를 선택해주세요
              </option>

              {birthTimeRanges.map((range) => (
                <option
                  key={range}
                  value={range}
                  className="bg-[#08101b]"
                >
                  {range}
                </option>
              ))}
            </select>

            <p className="mt-2 text-xs leading-5 text-white/30">
              정확한 출생시간을 모르는 경우 해당 시간대를 선택해주세요.
            </p>
          </div>

          {/* Gender */}
          <div className="mt-5">
            <label className="mb-2 block text-sm font-semibold text-[#ead29a]">
              성별
            </label>

            <div className="grid grid-cols-2 gap-3">

              <button
                type="button"
                onClick={() => setGender("남성")}
                className={`min-h-[54px] rounded-2xl border px-4 py-4 font-semibold transition ${
                  gender === "남성"
                    ? "border-[#d8b46a] bg-[#d8b46a] text-[#151109]"
                    : "border-white/10 bg-white/[0.055] text-white/55 hover:border-[#d8b46a]/40"
                }`}
              >
                남성
              </button>

              <button
                type="button"
                onClick={() => setGender("여성")}
                className={`min-h-[54px] rounded-2xl border px-4 py-4 font-semibold transition ${
                  gender === "여성"
                    ? "border-[#d8b46a] bg-[#d8b46a] text-[#151109]"
                    : "border-white/10 bg-white/[0.055] text-white/55 hover:border-[#d8b46a]/40"
                }`}
              >
                여성
              </button>

            </div>
          </div>

          {/* Next */}
          <button
            type="button"
            onClick={handleNext}
            className="mt-7 min-h-[58px] w-full rounded-2xl bg-gradient-to-r from-[#c79b43] via-[#f0d18a] to-[#c79b43] px-6 py-4 text-base font-bold text-[#171107] shadow-[0_12px_35px_rgba(199,155,67,0.2)] transition hover:brightness-105 sm:text-lg"
          >
            다음 단계 →
          </button>

        </section>

        {/* Notice */}
        <p className="mt-5 text-center text-[11px] leading-5 text-white/25">
          관리자용 테스트 페이지입니다.
          <br />
          현재는 실제 결제 및 상품 판매가 진행되지 않습니다.
        </p>

      </div>
    </main>
  );
}
