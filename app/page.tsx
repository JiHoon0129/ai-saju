"use client";

import { useState } from "react";

export default function Home() {
  const [step, setStep] = useState<"home" | "input" | "result">("home");

  const [analysis, setAnalysis] = useState("");

  const [fourPillars, setFourPillars] = useState({
    year: "",
    month: "",
    day: "",
    time: "",
  });

  const [fiveElements, setFiveElements] = useState({
    wood: 0,
    fire: 0,
    earth: 0,
    metal: 0,
    water: 0,
  });

  const [loading, setLoading] = useState(false);

  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [gender, setGender] = useState<"남성" | "여성" | "">("");

  const startAnalysis = async () => {
    if (!birthDate) {
      alert("생년월일을 입력해주세요.");
      return;
    }

    if (!birthTime) {
      alert("태어난 시간을 입력해주세요.");
      return;
    }

    if (!gender) {
      alert("성별을 선택해주세요.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/saju", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          birthDate,
          birthTime,
          gender,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "AI 분석에 실패했습니다.");
      }

      setAnalysis(data.result);
      setFourPillars(data.fourPillars);
      setFiveElements(data.fiveElements);
      setStep("result");
    } catch (error) {
      console.error(error);
      alert("AI 사주 분석 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const copyAnalysis = async () => {
    try {
      await navigator.clipboard.writeText(analysis);
      alert("AI 사주 분석 결과가 복사되었습니다.");
    } catch (error) {
      console.error(error);
      alert("복사에 실패했습니다.");
    }
  };

  const resetInput = () => {
    setStep("input");
    setAnalysis("");
    setFourPillars({
      year: "",
      month: "",
      day: "",
      time: "",
    });
    setFiveElements({
      wood: 0,
      fire: 0,
      earth: 0,
      metal: 0,
      water: 0,
    });
  };

  const elements = [
    { name: "목(木)", value: fiveElements.wood },
    { name: "화(火)", value: fiveElements.fire },
    { name: "토(土)", value: fiveElements.earth },
    { name: "금(金)", value: fiveElements.metal },
    { name: "수(水)", value: fiveElements.water },
  ];

  const mostElement = [...elements].sort((a, b) => b.value - a.value)[0];
  const leastElement = [...elements].sort((a, b) => a.value - b.value)[0];

  return (
    <main className="min-h-screen bg-[#0f0d1a] text-white">

      {/* 첫 화면 */}
      {step === "home" && (
        <section
          className="relative min-h-screen overflow-hidden bg-[#090b12]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(4,7,14,0.58), rgba(4,7,14,0.78)), url('/ai-saju-hero-bg.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* 은은한 별빛 */}
          <div className="pointer-events-none absolute inset-0 opacity-70">
            <div className="absolute left-[12%] top-[16%] h-1 w-1 rounded-full bg-[#f6d78b] shadow-[0_0_14px_4px_rgba(246,215,139,0.35)]" />
            <div className="absolute right-[18%] top-[12%] h-1.5 w-1.5 rounded-full bg-[#fff3c4] shadow-[0_0_18px_5px_rgba(255,243,196,0.28)]" />
            <div className="absolute left-[26%] top-[28%] h-1 w-1 rounded-full bg-[#fff3c4]" />
            <div className="absolute right-[30%] top-[24%] h-1 w-1 rounded-full bg-[#f6d78b]" />
          </div>

          {/* 상단 네비게이션 */}
          <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 lg:px-10">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d9aa4d]/60 bg-black/20 text-xl text-[#f4cf7a] backdrop-blur-sm">
                ☯
              </div>
              <span className="text-2xl font-semibold tracking-wide text-[#f4cf7a]">
                AI 사주
              </span>
            </div>

            <nav className="hidden items-center gap-8 text-sm text-gray-200 sm:flex">
              <button className="transition hover:text-[#f4cf7a]">서비스 소개</button>
              <button className="transition hover:text-[#f4cf7a]">이용안내</button>
              <button className="transition hover:text-[#f4cf7a]">고객센터</button>
            </nav>
          </header>

          {/* 중앙 히어로 */}
          <div className="relative z-10 mx-auto flex min-h-[calc(100vh-89px)] w-full max-w-6xl flex-col items-center px-6 pb-14 pt-12 text-center lg:px-10 lg:pt-16">
            <div className="mb-5 flex items-center gap-3 text-sm font-medium tracking-[0.2em] text-[#f0c86d]">
              <span className="h-px w-12 bg-[#d9aa4d]/70" />
              <span>AI가 풀어주는 당신의 운명</span>
              <span className="h-px w-12 bg-[#d9aa4d]/70" />
            </div>

            <h1 className="text-6xl font-semibold tracking-tight text-[#f7dc9a] drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)] sm:text-7xl lg:text-8xl">
              AI 사주
            </h1>

            <p className="mt-6 text-2xl font-medium leading-relaxed text-white sm:text-3xl">
              당신의 사주에 담긴
              <br />
              인생의 이야기를 확인해보세요.
            </p>

            <p className="mt-5 max-w-xl text-sm leading-7 text-gray-300 sm:text-base">
              생년월일과 태어난 시간을 입력하면
              <br />
              AI가 당신의 사주를 알기 쉽게 분석해드립니다.
            </p>

            {/* 기존 기능을 유지하는 입력 카드 */}
            <div className="mt-10 w-full max-w-2xl rounded-[28px] border border-[#d9aa4d]/50 bg-[#090d16]/80 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-7">
              <div className="grid gap-5 text-left sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-[#f1d58d]">
                    생년월일
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-4 text-white outline-none transition focus:border-[#d9aa4d] focus:bg-white/10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#f1d58d]">
                    태어난 시간
                  </label>
                  <input
                    type="time"
                    value={birthTime}
                    onChange={(e) => setBirthTime(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-4 text-white outline-none transition focus:border-[#d9aa4d] focus:bg-white/10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#f1d58d]">
                    성별
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setGender("남성")}
                      className={`rounded-xl border px-4 py-4 font-medium transition ${
                        gender === "남성"
                          ? "border-[#d9aa4d] bg-[#d9aa4d] text-[#17110a]"
                          : "border-white/15 bg-white/5 text-gray-300 hover:bg-white/10"
                      }`}
                    >
                      남성
                    </button>
                    <button
                      onClick={() => setGender("여성")}
                      className={`rounded-xl border px-4 py-4 font-medium transition ${
                        gender === "여성"
                          ? "border-[#d9aa4d] bg-[#d9aa4d] text-[#17110a]"
                          : "border-white/15 bg-white/5 text-gray-300 hover:bg-white/10"
                      }`}
                    >
                      여성
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={startAnalysis}
                disabled={loading}
                className="mt-6 w-full rounded-full bg-gradient-to-r from-[#d7a943] via-[#f3d17c] to-[#d7a943] px-6 py-4 text-lg font-bold text-[#1a1308] shadow-[0_8px_30px_rgba(215,169,67,0.22)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "🔮 사주를 분석하고 있습니다..." : "사주 분석 시작하기  →"}
              </button>

              <p className="mt-4 text-xs text-gray-500">
                AI 사주는 재미와 참고를 위한 서비스입니다.
              </p>
            </div>

            {/* 핵심 장점 */}
            <div className="mt-12 grid w-full max-w-4xl grid-cols-2 gap-5 border-t border-white/10 pt-8 sm:grid-cols-4">
              {[
                ["✦", "정확한 사주 분석"],
                ["◈", "AI가 전하는 맞춤 해석"],
                ["▤", "쉽고 자세한 풀이"],
                ["♙", "개인정보 보호"],
              ].map(([icon, title]) => (
                <div key={title} className="text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[#d9aa4d]/60 text-xl text-[#f1cf7b]">
                    {icon}
                  </div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 정보 입력 */}
      {step === "input" && (
        <section className="flex min-h-screen items-center justify-center px-6 py-10">
          <div className="w-full max-w-md">

            <button
              onClick={() => setStep("home")}
              className="mb-8 text-sm text-gray-400 hover:text-white"
            >
              ← 처음으로
            </button>

            <h2 className="mb-2 text-3xl font-bold">
              사주 정보 입력
            </h2>

            <p className="mb-8 text-sm text-gray-400">
              정확한 분석을 위해 정보를 입력해주세요.
            </p>

            <div className="space-y-6">

              {/* 생년월일 */}
              <div>
                <label className="mb-2 block text-sm font-medium">
                  생년월일
                </label>

                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-700 bg-[#191625] px-4 py-4 text-white outline-none focus:border-purple-500"
                />
              </div>

              {/* 태어난 시간 */}
              <div>
                <label className="mb-2 block text-sm font-medium">
                  태어난 시간
                </label>

                <input
                  type="time"
                  value={birthTime}
                  onChange={(e) => setBirthTime(e.target.value)}
                  className="w-full rounded-xl border border-gray-700 bg-[#191625] px-4 py-4 text-white outline-none focus:border-purple-500"
                />
              </div>

              {/* 성별 */}
              <div>
                <label className="mb-2 block text-sm font-medium">
                  성별
                </label>

                <div className="grid grid-cols-2 gap-3">

                  <button
                    onClick={() => setGender("남성")}
                    className={`rounded-xl border px-4 py-4 transition ${
                      gender === "남성"
                        ? "border-purple-500 bg-purple-600"
                        : "border-gray-700 bg-[#191625]"
                    }`}
                  >
                    남성
                  </button>

                  <button
                    onClick={() => setGender("여성")}
                    className={`rounded-xl border px-4 py-4 transition ${
                      gender === "여성"
                        ? "border-purple-500 bg-purple-600"
                        : "border-gray-700 bg-[#191625]"
                    }`}
                  >
                    여성
                  </button>

                </div>
              </div>

              {/* 분석 버튼 */}
              <button
                onClick={startAnalysis}
                disabled={loading}
                className="mt-2 w-full rounded-2xl bg-purple-600 px-6 py-4 text-lg font-bold transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "🔮 사주를 분석하고 있습니다..."
                  : "사주 분석하기"}
              </button>

            </div>
          </div>
        </section>
      )}

      {/* 결과 화면 */}
      {step === "result" && (
        <section className="mx-auto max-w-3xl px-4 py-10">

          {/* 제목 */}
          <div className="mb-8 text-center">

            <div className="mb-4 text-5xl">
              ✨
            </div>

            <h2 className="mb-3 text-3xl font-bold text-white">
              AI 사주 분석 결과
            </h2>

            <p className="text-sm leading-6 text-gray-400">
              입력하신 생년월일과 태어난 시간을 바탕으로
              <br />
              전통 사주 해석을 참고하여 AI가 분석한 결과입니다.
            </p>

          </div>

          {/* 입력 정보 */}
          <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-5">

            <p className="mb-4 text-sm font-semibold text-purple-200">
              📋 입력 정보
            </p>

            <div className="grid grid-cols-3 gap-3">

              <div className="rounded-xl bg-white/5 p-3 text-center">
                <p className="text-xs text-gray-500">
                  생년월일
                </p>

                <p className="mt-1 text-sm font-semibold text-white">
                  {birthDate}
                </p>
              </div>

              <div className="rounded-xl bg-white/5 p-3 text-center">
                <p className="text-xs text-gray-500">
                  태어난 시간
                </p>

                <p className="mt-1 text-sm font-semibold text-white">
                  {birthTime}
                </p>
              </div>

              <div className="rounded-xl bg-white/5 p-3 text-center">
                <p className="text-xs text-gray-500">
                  성별
                </p>

                <p className="mt-1 text-sm font-semibold text-white">
                  {gender}
                </p>
              </div>

            </div>
          </div>

          {/* 사주 원국 */}
          <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-5">

            <p className="mb-4 text-sm font-semibold text-purple-200">
              🔮 사주 원국
            </p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

              <div className="rounded-xl bg-white/5 p-4 text-center">
                <div className="text-xs text-gray-400">
                  년주
                </div>

                <div className="mt-2 text-xl font-bold text-white">
                  {fourPillars.year}
                </div>
              </div>

              <div className="rounded-xl bg-white/5 p-4 text-center">
                <div className="text-xs text-gray-400">
                  월주
                </div>

                <div className="mt-2 text-xl font-bold text-white">
                  {fourPillars.month}
                </div>
              </div>

              <div className="rounded-xl bg-white/5 p-4 text-center">
                <div className="text-xs text-gray-400">
                  일주
                </div>

                <div className="mt-2 text-xl font-bold text-white">
                  {fourPillars.day}
                </div>
              </div>

              <div className="rounded-xl bg-white/5 p-4 text-center">
                <div className="text-xs text-gray-400">
                  시주
                </div>

                <div className="mt-2 text-xl font-bold text-white">
                  {fourPillars.time}
                </div>
              </div>

            </div>
          </div>

          {/* 오행 분석 */}
          <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-5">

            <p className="mb-4 text-sm font-semibold text-purple-200">
              🌿 오행 분석
            </p>

            <div className="space-y-4">

              {elements.map((element) => (
                <div key={element.name}>

                  <div className="mb-1 flex items-center justify-between">

                    <span className="text-sm font-semibold text-gray-200">
                      {element.name}
                    </span>

                    <div className="flex items-center">
                      <span className="text-sm font-semibold text-purple-300">
                        {element.value}개
                      </span>

                      <span
                        className={`ml-2 rounded-full px-2 py-1 text-xs ${
                          element.value >= 3
                            ? "bg-purple-500/20 text-purple-300"
                            : element.value <= 1
                              ? "bg-white/10 text-gray-400"
                              : "bg-blue-500/20 text-blue-300"
                        }`}
                      >
                        {element.value >= 3
                          ? "많음"
                          : element.value <= 1
                            ? "적음"
                            : "참고"}
                      </span>
                    </div>

                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-white/10">

                    <div
                      className="h-full rounded-full bg-purple-500 transition-all duration-500"
                      style={{
                        width: `${Math.min(element.value * 12.5, 100)}%`,
                      }}
                    />

                  </div>

                </div>
              ))}

            </div>
          </div>

          {/* 오행 해석 */}
          <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-5">

            <p className="mb-4 text-sm font-semibold text-purple-200">
              🌿 오행 해석
            </p>

            <p className="mb-4 text-xs leading-6 text-gray-500">
              ※ 아래 내용은 오행의 단순 개수를 기준으로 한 참고용 해석이며,
              전통 명리학의 오행 강약을 확정적으로 판단하는 기준은 아닙니다.
            </p>

            <div className="mb-5 grid grid-cols-2 gap-3">

              <div className="rounded-xl bg-purple-500/10 p-4">
                <p className="text-xs text-gray-400">
                  가장 많은 오행
                </p>

                <p className="mt-1 text-lg font-bold text-purple-300">
                  {mostElement.name}
                </p>
              </div>

              <div className="rounded-xl bg-white/5 p-4">
                <p className="text-xs text-gray-400">
                  가장 적은 오행
                </p>

                <p className="mt-1 text-lg font-bold text-gray-300">
                  {leastElement.name}
                </p>
              </div>

            </div>

            <div className="space-y-3 text-sm leading-7 text-gray-300">

              {fiveElements.wood === 0 && (
                <p>
                  🌱 목(木)이 부족한 편으로, 새로운 시작이나 유연한 사고를
                  의식적으로 보완해보는 것이 좋습니다.
                </p>
              )}

              {fiveElements.fire === 0 && (
                <p>
                  🔥 화(火)가 부족한 편으로, 활력과 표현력을 생활 속에서
                  조금씩 키워보는 것이 도움이 될 수 있습니다.
                </p>
              )}

              {fiveElements.earth === 0 && (
                <p>
                  🏔️ 토(土)가 부족한 편으로, 안정감과 꾸준함을 의식적으로
                  유지하는 것이 도움이 될 수 있습니다.
                </p>
              )}

              {fiveElements.metal === 0 && (
                <p>
                  ⚔️ 금(金)이 부족한 편으로, 원칙과 판단력을 균형 있게
                  활용하는 것이 도움이 될 수 있습니다.
                </p>
              )}

              {fiveElements.water === 0 && (
                <p>
                  💧 수(水)가 부족한 편으로, 휴식과 유연한 사고를 생활 속에서
                  챙기는 것이 좋습니다.
                </p>
              )}

              {fiveElements.wood > 0 &&
                fiveElements.fire > 0 &&
                fiveElements.earth > 0 &&
                fiveElements.metal > 0 &&
                fiveElements.water > 0 && (
                  <p>
                    🌈 다섯 오행이 모두 나타나 있어 특정 오행이 완전히 빠진
                    구조는 아닙니다. 각 요소의 비중을 참고해 균형을
                    살펴볼 수 있습니다.
                  </p>
                )}

            </div>
          </div>

          {/* AI 분석 내용 */}
          <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-5">

            <p className="mb-4 text-sm font-semibold text-purple-200">
              🧠 AI 분석 내용
            </p>

            <div className="space-y-6">

              {analysis
                .split(/(?=#\s*\d+\.)/)
                .filter((section) => section.trim())
                .map((section, index) => {

                  const lines = section.trim().split("\n");

                  const title =
                    lines[0]?.replace(/^#\s*/, "") ||
                    `분석 ${index + 1}`;

                  const content =
                    lines.slice(1).join("\n").trim();

                  return (
                    <div
                      key={index}
                      className="rounded-2xl border border-white/10 bg-black/10 p-5"
                    >

                      <h3 className="mb-3 text-lg font-bold text-purple-200">
                        {title}
                      </h3>

                      <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
                        {content}
                      </p>

                    </div>
                  );
                })}

            </div>
          </div>

          {/* 복사 버튼 */}
          <button
            onClick={copyAnalysis}
            className="mb-3 w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-4 font-bold text-gray-200 transition hover:bg-white/10"
          >
            📋 분석 결과 복사하기
          </button>

          {/* 다시 입력하기 */}
          <button
            onClick={resetInput}
            className="w-full rounded-2xl border border-purple-500/50 bg-purple-600/20 px-6 py-4 font-bold text-white transition hover:bg-purple-600/30"
          >
            다시 입력하기
          </button>

        </section>
      )}

    </main>
  );
}
