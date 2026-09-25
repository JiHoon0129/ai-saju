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
    <main className="min-h-screen bg-[#070b13] text-white">
      {/* ==================== HOME ==================== */}
      {step === "home" && (
        <section
          className="relative min-h-screen overflow-hidden"
          style={{
            backgroundImage:
              "linear-gradient(rgba(4,7,14,0.12), rgba(4,7,14,0.30)), url('/ai-saju-hero-bg.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(218,177,88,0.12),transparent_38%)]" />

          {/* Header */}
          <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
            <button
              onClick={() => setStep("home")}
              className="group flex items-center gap-3 sm:gap-4"
              aria-label="AI 사주 홈"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d8b46a]/60 bg-[#0b1019]/70 text-lg text-[#e7c982] shadow-[0_0_25px_rgba(216,180,106,0.12)] backdrop-blur-md transition group-hover:border-[#e7c982]">
                ☯
              </span>
              <span className="text-xl font-semibold tracking-[0.14em] text-[#ead29a] sm:text-2xl lg:text-[26px]">
                AI 사주
              </span>
            </button>

            <nav className="hidden items-center gap-9 text-sm font-medium text-white/75 sm:flex">
              <button className="transition hover:text-[#e8cc8d]">
                서비스 소개
              </button>
              <button className="transition hover:text-[#e8cc8d]">
                이용안내
              </button>
              <button className="transition hover:text-[#e8cc8d]">
                고객센터
              </button>
            </nav>

            <button
              onClick={() => setStep("input")}
              className="rounded-full border border-[#d8b46a]/50 bg-[#0a1019]/55 px-4 py-2 text-xs font-semibold text-[#ead29a] backdrop-blur-md transition hover:border-[#e8cc8d] hover:bg-[#151b25]/75 sm:px-5 sm:text-sm"
            >
              사주 시작하기
            </button>
          </header>

          {/* Hero */}
          <div className="relative z-10 mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-7xl flex-col items-center px-5 pb-10 pt-10 text-center sm:px-8 sm:pt-14 lg:px-10 lg:pt-16">
            <div className="mb-5 flex items-center gap-3 text-[11px] font-medium tracking-[0.24em] text-[#e6c77f] sm:text-xs">
              <span className="h-px w-8 bg-[#d8b46a]/70 sm:w-12" />
              <span>AI가 풀어주는 당신의 운명</span>
              <span className="h-px w-8 bg-[#d8b46a]/70 sm:w-12" />
            </div>

            <p className="mb-4 text-sm font-medium tracking-[0.22em] text-white/75 sm:text-base">
              생년월일로 시작하는 나만의 이야기
            </p>

            <h1 className="text-6xl font-semibold tracking-[-0.045em] text-[#f2d99b] drop-shadow-[0_4px_28px_rgba(0,0,0,0.58)] sm:text-8xl lg:text-9xl">
              AI 사주
            </h1>

            <h2 className="mt-5 text-2xl font-semibold leading-[1.45] tracking-tight text-white sm:text-3xl lg:text-[42px]">
              당신의 사주에 담긴
              <br />
              <span className="text-[#e7ca88]">인생의 이야기를 확인해보세요.</span>
            </h2>

            <p className="mt-6 max-w-2xl text-sm leading-7 text-white/80 sm:text-base lg:text-[17px]">
              생년월일과 태어난 시간을 입력하면
              <br className="sm:hidden" />
              {" "}AI가 사주를 알기 쉽게 분석해드립니다.
            </p>

            {/* Input Card */}
            <div className="mt-10 w-full max-w-3xl rounded-[32px] border border-[#d8b46a]/50 bg-[#08101b]/76 p-6 shadow-[0_24px_90px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:mt-12 sm:p-8 lg:p-9">
              <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-5 text-left">
                <div>
                  <p className="text-base font-semibold tracking-wide text-[#ead29a]">
                    사주 정보 입력
                  </p>
                  <p className="mt-1 text-xs leading-5 text-white/45 sm:text-sm">
                    정확한 분석을 위해 입력해주세요.
                  </p>
                </div>
                <span className="rounded-full border border-[#d8b46a]/30 bg-[#d8b46a]/10 px-3 py-1 text-[10px] font-medium text-[#e7c982]">
                  무료 분석
                </span>
              </div>

              <div className="grid gap-4 text-left sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-semibold tracking-wide text-[#ead29a]">
                    생년월일
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.065] px-4 py-[17px] text-white outline-none transition placeholder:text-white/30 focus:border-[#d8b46a]/80 focus:bg-white/[0.08] focus:ring-1 focus:ring-[#d8b46a]/30"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold tracking-wide text-[#ead29a]">
                    태어난 시간
                  </label>
                  <input
                    type="time"
                    value={birthTime}
                    onChange={(e) => setBirthTime(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-4 text-white outline-none transition focus:border-[#d8b46a]/80 focus:bg-white/[0.08] focus:ring-1 focus:ring-[#d8b46a]/30"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold tracking-wide text-[#ead29a]">
                    성별
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setGender("남성")}
                      className={`rounded-2xl border px-4 py-4 text-sm font-semibold transition ${
                        gender === "남성"
                          ? "border-[#d8b46a] bg-[#d8b46a] text-[#151109] shadow-[0_8px_25px_rgba(216,180,106,0.18)]"
                          : "border-white/10 bg-white/[0.055] text-white/65 hover:border-[#d8b46a]/45 hover:bg-white/[0.08]"
                      }`}
                    >
                      남성
                    </button>
                    <button
                      onClick={() => setGender("여성")}
                      className={`rounded-2xl border px-4 py-4 text-sm font-semibold transition ${
                        gender === "여성"
                          ? "border-[#d8b46a] bg-[#d8b46a] text-[#151109] shadow-[0_8px_25px_rgba(216,180,106,0.18)]"
                          : "border-white/10 bg-white/[0.055] text-white/65 hover:border-[#d8b46a]/45 hover:bg-white/[0.08]"
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
                className="mt-6 w-full rounded-2xl border border-[#f1d58d]/70 bg-gradient-to-r from-[#c79b43] via-[#f0d18a] to-[#c79b43] px-6 py-[17px] text-base font-bold tracking-wide text-[#171107] sm:text-lg shadow-[0_12px_35px_rgba(199,155,67,0.22)] transition hover:brightness-105 hover:shadow-[0_14px_42px_rgba(199,155,67,0.30)] disabled:cursor-not-allowed disabled:opacity-50 sm:text-lg"
              >
                {loading ? "🔮 사주를 분석하고 있습니다..." : "사주 분석 시작하기  →"}
              </button>

              <p className="mt-4 text-[11px] leading-5 text-white/35">
                입력 정보는 사주 분석을 위한 용도로 사용됩니다.
                <br />
                AI 사주는 재미와 참고를 위한 서비스입니다.
              </p>
            </div>

            {/* Benefits */}
            <div className="mt-12 grid w-full max-w-5xl grid-cols-2 gap-4 border-t border-white/10 pt-7 sm:mt-14 sm:grid-cols-4 sm:gap-5 sm:pt-9">
              {[
                ["✦", "맞춤형 사주 분석", "입력한 정보를 바탕으로"],
                ["◈", "AI 맞춤 해석", "쉽게 이해하는 풀이"],
                ["▤", "한눈에 보는 결과", "사주·오행을 함께 확인"],
                ["♙", "안심하고 이용", "개인정보 보호를 고려"],
              ].map(([icon, title, desc]) => (
                <div
                  key={title}
                  className="rounded-2xl border border-white/[0.09] bg-[#08101b]/20 px-4 py-5 backdrop-blur-md transition hover:border-[#d8b46a]/25 hover:bg-[#08101b]/30"
                >
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-[#d8b46a]/45 bg-[#d8b46a]/[0.06] text-lg text-[#e7c982]">
                    {icon}
                  </div>
                  <p className="text-xs font-semibold text-white sm:text-sm">
                    {title}
                  </p>
                  <p className="mt-1 text-[10px] leading-4 text-white/40 sm:text-xs">
                    {desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 text-[10px] tracking-[0.2em] text-white/30">
              SCROLL TO EXPLORE
            </div>
          </div>
        </section>
      )}

      {/* ==================== INPUT ==================== */}
      {step === "input" && (
        <section
          className="min-h-screen px-5 py-8 sm:px-6 sm:py-12"
          style={{
            backgroundImage:
              "linear-gradient(rgba(4,7,14,0.92), rgba(4,7,14,0.96)), url('/ai-saju-hero-bg.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg items-center justify-center">
            <div className="w-full rounded-[30px] border border-[#d8b46a]/35 bg-[#08101b]/85 p-6 shadow-[0_25px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8">
              <button
                onClick={() => setStep("home")}
                className="mb-8 text-sm text-white/50 transition hover:text-[#e7c982]"
              >
                ← 처음으로
              </button>

              <div className="mb-8">
                <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-[#d8b46a]">
                  AI SAJU
                </p>
                <h2 className="text-3xl font-semibold tracking-tight text-white">
                  사주 정보 입력
                </h2>
                <p className="mt-3 text-sm leading-6 text-white/45">
                  생년월일과 태어난 시간을 입력하면
                  <br />
                  당신의 사주를 분석해드립니다.
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#ead29a]">
                    생년월일
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-4 text-white outline-none transition focus:border-[#d8b46a]/80 focus:ring-1 focus:ring-[#d8b46a]/25"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#ead29a]">
                    태어난 시간
                  </label>
                  <input
                    type="time"
                    value={birthTime}
                    onChange={(e) => setBirthTime(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-4 text-white outline-none transition focus:border-[#d8b46a]/80 focus:ring-1 focus:ring-[#d8b46a]/25"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#ead29a]">
                    성별
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setGender("남성")}
                      className={`rounded-2xl border px-4 py-4 font-semibold transition ${
                        gender === "남성"
                          ? "border-[#d8b46a] bg-[#d8b46a] text-[#151109]"
                          : "border-white/10 bg-white/[0.055] text-white/60 hover:border-[#d8b46a]/40"
                      }`}
                    >
                      남성
                    </button>
                    <button
                      onClick={() => setGender("여성")}
                      className={`rounded-2xl border px-4 py-4 font-semibold transition ${
                        gender === "여성"
                          ? "border-[#d8b46a] bg-[#d8b46a] text-[#151109]"
                          : "border-white/10 bg-white/[0.055] text-white/60 hover:border-[#d8b46a]/40"
                      }`}
                    >
                      여성
                    </button>
                  </div>
                </div>

                <button
                  onClick={startAnalysis}
                  disabled={loading}
                  className="mt-2 w-full rounded-2xl bg-gradient-to-r from-[#c79b43] via-[#f0d18a] to-[#c79b43] px-6 py-4 text-lg font-bold text-[#171107] shadow-[0_12px_35px_rgba(199,155,67,0.2)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "🔮 사주를 분석하고 있습니다..." : "사주 분석하기  →"}
                </button>

                <p className="text-center text-[11px] text-white/30">
                  AI 사주는 재미와 참고를 위한 서비스입니다.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ==================== RESULT ==================== */}
      {step === "result" && (
        <section className="min-h-screen bg-[#070b13] px-4 py-8 sm:px-6 sm:py-12">
          <div className="mx-auto max-w-3xl">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#d8b46a]/45 bg-[#d8b46a]/[0.07] text-2xl text-[#e7c982]">
                ✦
              </div>
              <p className="mb-2 text-xs font-semibold tracking-[0.22em] text-[#d8b46a]">
                AI SAJU ANALYSIS
              </p>
              <h2 className="text-3xl font-semibold text-white sm:text-4xl">
                AI 사주 분석 결과
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/45">
                입력하신 생년월일과 태어난 시간을 바탕으로
                <br />
                전통 사주 해석을 참고하여 AI가 분석한 결과입니다.
              </p>
            </div>

            {/* Input info */}
            <div className="mb-5 rounded-[24px] border border-[#d8b46a]/20 bg-white/[0.035] p-5">
              <p className="mb-4 text-sm font-semibold text-[#e7c982]">
                📋 입력 정보
              </p>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.035] p-3 text-center">
                  <p className="text-[10px] text-white/35 sm:text-xs">생년월일</p>
                  <p className="mt-1 text-xs font-semibold text-white sm:text-sm">
                    {birthDate}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.035] p-3 text-center">
                  <p className="text-[10px] text-white/35 sm:text-xs">태어난 시간</p>
                  <p className="mt-1 text-xs font-semibold text-white sm:text-sm">
                    {birthTime}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.035] p-3 text-center">
                  <p className="text-[10px] text-white/35 sm:text-xs">성별</p>
                  <p className="mt-1 text-xs font-semibold text-white sm:text-sm">
                    {gender}
                  </p>
                </div>
              </div>
            </div>

            {/* Four pillars */}
            <div className="mb-5 rounded-[24px] border border-[#d8b46a]/20 bg-white/[0.035] p-5">
              <p className="mb-4 text-sm font-semibold text-[#e7c982]">
                🔮 사주 원국
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["년주", fourPillars.year],
                  ["월주", fourPillars.month],
                  ["일주", fourPillars.day],
                  ["시주", fourPillars.time],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-white/[0.06] bg-[#0b111b] p-4 text-center"
                  >
                    <div className="text-xs text-white/35">{label}</div>
                    <div className="mt-2 text-xl font-bold text-[#f0d18a]">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Five elements */}
            <div className="mb-5 rounded-[24px] border border-[#d8b46a]/20 bg-white/[0.035] p-5">
              <p className="mb-4 text-sm font-semibold text-[#e7c982]">
                🌿 오행 분석
              </p>
              <div className="space-y-4">
                {elements.map((element) => (
                  <div key={element.name}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-semibold text-white/80">
                        {element.name}
                      </span>
                      <div className="flex items-center">
                        <span className="text-sm font-semibold text-[#e7c982]">
                          {element.value}개
                        </span>
                        <span className="ml-2 rounded-full bg-[#d8b46a]/10 px-2 py-1 text-[10px] text-[#e7c982]">
                          {element.value >= 3
                            ? "많음"
                            : element.value <= 1
                              ? "적음"
                              : "참고"}
                        </span>
                      </div>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.07]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#a97b2d] to-[#f0d18a] transition-all duration-500"
                        style={{
                          width: `${Math.min(element.value * 12.5, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Five element interpretation */}
            <div className="mb-5 rounded-[24px] border border-[#d8b46a]/20 bg-white/[0.035] p-5">
              <p className="mb-4 text-sm font-semibold text-[#e7c982]">
                🌿 오행 해석
              </p>
              <p className="mb-5 text-xs leading-6 text-white/35">
                ※ 아래 내용은 오행의 단순 개수를 기준으로 한 참고용 해석이며,
                전통 명리학의 오행 강약을 확정적으로 판단하는 기준은 아닙니다.
              </p>

              <div className="mb-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-[#d8b46a]/15 bg-[#d8b46a]/[0.06] p-4">
                  <p className="text-xs text-white/40">가장 많은 오행</p>
                  <p className="mt-1 text-lg font-bold text-[#f0d18a]">
                    {mostElement.name}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
                  <p className="text-xs text-white/40">가장 적은 오행</p>
                  <p className="mt-1 text-lg font-bold text-white/75">
                    {leastElement.name}
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm leading-7 text-white/65">
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

            {/* AI analysis */}
            <div className="mb-5 rounded-[24px] border border-[#d8b46a]/20 bg-white/[0.035] p-5">
              <div className="mb-5 flex items-center justify-between">
                <p className="text-sm font-semibold text-[#e7c982]">
                  🧠 AI 분석 내용
                </p>
                <span className="rounded-full border border-[#d8b46a]/20 bg-[#d8b46a]/[0.05] px-3 py-1 text-[10px] text-[#d8b46a]">
                  FREE
                </span>
              </div>

              <div className="space-y-4">
                {analysis
                  .split(/(?=#\s*\d+\.)/)
                  .filter((section) => section.trim())
                  .map((section, index) => {
                    const lines = section.trim().split("\n");
                    const title =
                      lines[0]?.replace(/^#\s*/, "") ||
                      `분석 ${index + 1}`;
                    const content = lines.slice(1).join("\n").trim();

                    return (
                      <div
                        key={index}
                        className="rounded-2xl border border-white/[0.06] bg-[#0a1019] p-5"
                      >
                        <h3 className="mb-3 text-lg font-bold text-[#f0d18a]">
                          {title}
                        </h3>
                        <p className="whitespace-pre-line text-sm leading-7 text-white/65">
                          {content}
                        </p>
                      </div>
                    );
                  })}
              </div>
            </div>

            <button
              onClick={copyAnalysis}
              className="mb-3 w-full rounded-2xl border border-white/10 bg-white/[0.035] px-6 py-4 font-bold text-white/75 transition hover:border-[#d8b46a]/30 hover:bg-white/[0.06]"
            >
              📋 분석 결과 복사하기
            </button>

            <button
              onClick={resetInput}
              className="w-full rounded-2xl border border-[#d8b46a]/40 bg-[#d8b46a]/10 px-6 py-4 font-bold text-[#e7c982] transition hover:bg-[#d8b46a]/15"
            >
              다시 입력하기
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
