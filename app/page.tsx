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
    <main className="min-h-screen bg-gradient-to-b from-[#0b0914] via-[#151025] to-[#09070f] text-white">

      {/* 첫 화면 */}
      {step === "home" && (
        <section className="flex min-h-screen items-center justify-center px-6">
          <div className="w-full max-w-md text-center">

            <div className="mb-8 text-6xl">
              🔮
            </div>

           <h1 className="mb-4 text-5xl font-extrabold tracking-tight bg-gradient-to-r from-purple-300 via-white to-purple-400 bg-clip-text text-transparent">AI 사주</h1>

            <p className="mb-3 text-xl font-semibold">
              당신의 운명을 읽어드립니다
            </p>

            <p className="mb-10 text-sm leading-7 text-gray-400">
              생년월일과 태어난 시간을 입력하면
              <br />
              AI가 당신의 사주를 알기 쉽게 분석해드립니다.
            </p>

            <button
              onClick={() => setStep("input")}
              className="w-full rounded-2xl bg-purple-600 px-6 py-4 text-lg font-bold transition hover:bg-purple-500"
            >
              사주 분석 시작하기
            </button>

            <p className="mt-6 text-xs text-gray-500">
              AI 사주는 재미와 참고를 위한 서비스입니다.
            </p>

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
