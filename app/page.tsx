"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [step, setStep] = useState<"home" | "input" | "result" | "service" | "guide" | "support" | "checkout" | "legal">("home");

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
  const [paid, setPaid] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [premiumLoading, setPremiumLoading] = useState(false);
  const [premiumAnalysis, setPremiumAnalysis] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [legalPage, setLegalPage] = useState<"terms" | "privacy" | "refund" | "business">("terms");

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
    setPaid(false);
    setAnalysis("");
    setPremiumAnalysis("");
    setPaymentError("");
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get("payment");

    if (paymentStatus !== "success" && paymentStatus !== "fail") {
      return;
    }

    const handlePaymentResult = async () => {
      if (paymentStatus === "fail") {
        setPaymentError(
          params.get("message") || "결제가 취소되었거나 실패했습니다."
        );
        setStep("checkout");
        window.history.replaceState({}, "", window.location.pathname);
        return;
      }

      const paymentKey = params.get("paymentKey");
      const orderId = params.get("orderId");
      const amount = Number(params.get("amount"));

      if (!paymentKey || !orderId || !amount) {
        setPaymentError("결제 결과 정보가 올바르지 않습니다.");
        setStep("checkout");
        window.history.replaceState({}, "", window.location.pathname);
        return;
      }

      try {
        setPremiumLoading(true);

        const saved = sessionStorage.getItem("saju_payment_order");
        const order = saved ? JSON.parse(saved) : null;

        if (!order || order.orderId !== orderId || order.amount !== amount) {
          throw new Error("주문 정보 검증에 실패했습니다.");
        }

        const confirmResponse = await fetch("/api/payment/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount,
          }),
        });

        const confirmData = await confirmResponse.json();

        if (!confirmResponse.ok) {
          throw new Error(
            confirmData.error || "결제 승인에 실패했습니다."
          );
        }

        const premiumResponse = await fetch("/api/premium-saju", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            birthDate: order.birthDate,
            birthTime: order.birthTime,
            gender: order.gender,
            paymentKey,
            orderId,
          }),
        });

        const premiumData = await premiumResponse.json();

        if (!premiumResponse.ok) {
          throw new Error(
            premiumData.error || "상세 사주 분석 생성에 실패했습니다."
          );
        }

        setPremiumAnalysis(premiumData.result || "");
        setPaid(true);
        setStep("result");

        sessionStorage.removeItem("saju_payment_order");
        window.history.replaceState({}, "", window.location.pathname);
      } catch (error) {
        console.error(error);
        setPaymentError(
          error instanceof Error
            ? error.message
            : "결제 처리 중 오류가 발생했습니다."
        );
        setStep("checkout");
      } finally {
        setPremiumLoading(false);
        setPaymentLoading(false);
      }
    };

    void handlePaymentResult();
  }, []);

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
              <button onClick={() => setStep("service")} className="transition hover:text-[#e8cc8d]">서비스 소개</button>
              <button onClick={() => setStep("guide")} className="transition hover:text-[#e8cc8d]">이용안내</button>
              <button onClick={() => setStep("support")} className="transition hover:text-[#e8cc8d]">고객센터</button>
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

            <div className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[10px] text-white/30">
              <button onClick={() => { setLegalPage("terms"); setStep("legal"); }} className="hover:text-[#d8b46a]">이용약관</button>
              <button onClick={() => { setLegalPage("privacy"); setStep("legal"); }} className="hover:text-[#d8b46a]">개인정보처리방침</button>
              <button onClick={() => { setLegalPage("refund"); setStep("legal"); }} className="hover:text-[#d8b46a]">환불정책</button>
              <button onClick={() => { setLegalPage("business"); setStep("legal"); }} className="hover:text-[#d8b46a]">사업자 정보</button>
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
              "linear-gradient(rgba(4,7,14,0.88), rgba(4,7,14,0.94)), url('/ai-saju-hero-bg.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center justify-center">
            <div className="w-full rounded-[32px] border border-[#d8b46a]/40 bg-[#08101b]/85 p-6 shadow-[0_25px_100px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:p-9">
              <button
                onClick={() => setStep("home")}
                className="mb-9 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-sm text-white/55 transition hover:border-[#d8b46a]/40 hover:text-[#e7c982]"
              >
                ← 처음으로
              </button>

              <div className="mb-8">
                <p className="mb-3 text-xs font-semibold tracking-[0.22em] text-[#d8b46a]">
                  AI SAJU
                </p>
                <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  사주 정보 입력
                </h2>
                <p className="mt-3 text-sm leading-6 text-white/45 sm:text-base">
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
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-[17px] text-white outline-none transition focus:border-[#d8b46a]/80 focus:bg-white/[0.08] focus:ring-1 focus:ring-[#d8b46a]/25"
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
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-[17px] text-white outline-none transition focus:border-[#d8b46a]/80 focus:bg-white/[0.08] focus:ring-1 focus:ring-[#d8b46a]/25"
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
                          ? "border-[#d8b46a] bg-[#d8b46a] text-[#151109] shadow-[0_8px_25px_rgba(216,180,106,0.18)]"
                          : "border-white/10 bg-white/[0.055] text-white/60 hover:border-[#d8b46a]/40 hover:bg-white/[0.08]"
                      }`}
                    >
                      남성
                    </button>
                    <button
                      onClick={() => setGender("여성")}
                      className={`rounded-2xl border px-4 py-4 font-semibold transition ${
                        gender === "여성"
                          ? "border-[#d8b46a] bg-[#d8b46a] text-[#151109] shadow-[0_8px_25px_rgba(216,180,106,0.18)]"
                          : "border-white/10 bg-white/[0.055] text-white/60 hover:border-[#d8b46a]/40 hover:bg-white/[0.08]"
                      }`}
                    >
                      여성
                    </button>
                  </div>
                </div>

                <button
                  onClick={startAnalysis}
                  disabled={loading}
                  className="mt-2 w-full rounded-2xl border border-[#f1d58d]/70 bg-gradient-to-r from-[#c79b43] via-[#f0d18a] to-[#c79b43] px-6 py-[17px] text-lg font-bold tracking-wide text-[#171107] shadow-[0_12px_35px_rgba(199,155,67,0.22)] transition hover:brightness-105 hover:shadow-[0_15px_45px_rgba(199,155,67,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "🔮 사주를 분석하고 있습니다..." : "사주 분석하기  →"}
                </button>

                <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-white/30">
                  <span className="text-[#d8b46a]">✦</span>
                  입력 정보는 사주 분석을 위한 용도로 사용됩니다.
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ==================== RESULT ==================== */}
      {step === "result" && (
        <section className="min-h-screen bg-[#070b13] px-4 py-8 sm:px-6 sm:py-12">
          <div className="mx-auto max-w-4xl">
            <div className="mb-9 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#d8b46a]/45 bg-[#d8b46a]/[0.07] text-2xl text-[#e7c982] shadow-[0_0_30px_rgba(216,180,106,0.08)]">
                ✦
              </div>
              <p className="mb-2 text-xs font-semibold tracking-[0.22em] text-[#d8b46a]">
                AI SAJU ANALYSIS
              </p>
              <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                AI 사주 분석 결과
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/45">
                입력하신 생년월일과 태어난 시간을 바탕으로
                <br />
                전통 사주 해석을 참고하여 AI가 분석한 결과입니다.
              </p>
            </div>

            <div className="mb-5 rounded-[26px] border border-[#d8b46a]/20 bg-white/[0.035] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.18)] sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-[#e7c982]">📋 입력 정보</p>
                <span className="rounded-full border border-[#d8b46a]/20 bg-[#d8b46a]/[0.05] px-3 py-1 text-[10px] text-[#d8b46a]">
                  MY SAJU
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  ["생년월일", birthDate],
                  ["태어난 시간", birthTime],
                  ["성별", gender],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-white/[0.06] bg-white/[0.035] p-3 text-center sm:p-4"
                  >
                    <p className="text-[10px] text-white/35 sm:text-xs">{label}</p>
                    <p className="mt-1 text-xs font-semibold text-white sm:text-sm">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-5 rounded-[26px] border border-[#d8b46a]/20 bg-white/[0.035] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.18)] sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <p className="text-sm font-semibold text-[#e7c982]">🔮 사주 원국</p>
                <span className="text-[10px] tracking-[0.15em] text-white/30">
                  FOUR PILLARS
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["년주", fourPillars.year],
                  ["월주", fourPillars.month],
                  ["일주", fourPillars.day],
                  ["시주", fourPillars.time],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-[#d8b46a]/15 bg-[#0b111b] p-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                  >
                    <div className="text-xs text-white/35">{label}</div>
                    <div className="mt-2 text-xl font-bold text-[#f0d18a] sm:text-2xl">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-5 rounded-[26px] border border-[#d8b46a]/20 bg-white/[0.035] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.18)] sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <p className="text-sm font-semibold text-[#e7c982]">🌿 오행 분석</p>
                <span className="text-[10px] tracking-[0.15em] text-white/30">
                  FIVE ELEMENTS
                </span>
              </div>
              <div className="space-y-5">
                {elements.map((element) => (
                  <div key={element.name}>
                    <div className="mb-1.5 flex items-center justify-between">
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

            <div className="mb-5 rounded-[26px] border border-[#d8b46a]/20 bg-white/[0.035] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.18)] sm:p-6">
              <p className="mb-4 text-sm font-semibold text-[#e7c982]">🌿 오행 해석</p>
              <p className="mb-5 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 text-xs leading-6 text-white/35">
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
                  <p>🌱 목(木)이 부족한 편으로, 새로운 시작이나 유연한 사고를 의식적으로 보완해보는 것이 좋습니다.</p>
                )}
                {fiveElements.fire === 0 && (
                  <p>🔥 화(火)가 부족한 편으로, 활력과 표현력을 생활 속에서 조금씩 키워보는 것이 도움이 될 수 있습니다.</p>
                )}
                {fiveElements.earth === 0 && (
                  <p>🏔️ 토(土)가 부족한 편으로, 안정감과 꾸준함을 의식적으로 유지하는 것이 도움이 될 수 있습니다.</p>
                )}
                {fiveElements.metal === 0 && (
                  <p>⚔️ 금(金)이 부족한 편으로, 원칙과 판단력을 균형 있게 활용하는 것이 도움이 될 수 있습니다.</p>
                )}
                {fiveElements.water === 0 && (
                  <p>💧 수(水)가 부족한 편으로, 휴식과 유연한 사고를 생활 속에서 챙기는 것이 좋습니다.</p>
                )}
                {fiveElements.wood > 0 &&
                  fiveElements.fire > 0 &&
                  fiveElements.earth > 0 &&
                  fiveElements.metal > 0 &&
                  fiveElements.water > 0 && (
                    <p>🌈 다섯 오행이 모두 나타나 있어 특정 오행이 완전히 빠진 구조는 아닙니다. 각 요소의 비중을 참고해 균형을 살펴볼 수 있습니다.</p>
                  )}
              </div>
            </div>

            {/* Free result */}
            <div className="mb-5 rounded-[26px] border border-[#d8b46a]/20 bg-white/[0.035] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.18)] sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#e7c982]">🧠 AI 분석 내용</p>
                  <p className="mt-1 text-xs text-white/35">기본 분석 결과</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] text-white/45">
                  FREE
                </span>
              </div>

              <div className="space-y-4">
                {analysis
                  .split(/(?=#\s*\d+\.)/)
                  .filter((section) => section.trim())
                  .slice(0, 3)
                  .map((section, index) => {
                    const lines = section.trim().split("\n");
                    const title =
                      lines[0]?.replace(/^#\s*/, "") || `분석 ${index + 1}`;
                    const content = lines.slice(1).join("\n").trim();

                    return (
                      <div
                        key={index}
                        className="rounded-2xl border border-white/[0.06] bg-[#0a1019] p-5 sm:p-6"
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

              {!paid && (
                <div className="mt-5 rounded-2xl border border-[#d8b46a]/25 bg-gradient-to-b from-[#d8b46a]/[0.08] to-transparent p-5 sm:p-6">
                  <div className="mb-4 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#d8b46a]/30 bg-[#d8b46a]/10 text-lg">
                      ✦
                    </div>
                    <div>
                      <p className="font-semibold text-[#f0d18a]">
                        더 깊은 사주 분석을 확인해보세요
                      </p>
                      <p className="mt-1 text-xs leading-5 text-white/45">
                        재물운, 직업운, 연애운, 대인관계와 시기별 흐름까지
                        상세하게 확인할 수 있습니다.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-white/55 sm:grid-cols-3">
                    {["종합 사주", "재물운", "직업운", "연애운", "대인관계", "시기별 흐름"].map(
                      (item) => (
                        <div
                          key={item}
                          className="rounded-xl border border-white/[0.06] bg-black/10 px-3 py-3"
                        >
                          🔒 {item}
                        </div>
                      )
                    )}
                  </div>

                  <div className="mt-5 rounded-2xl border border-[#d8b46a]/20 bg-[#080e17]/80 p-4 text-center">
                    <p className="text-[10px] tracking-[0.2em] text-[#d8b46a]">
                      PREMIUM SAJU
                    </p>
                    <p className="mt-2 text-xl font-semibold text-white">
                      상세 사주 분석
                    </p>
                    <p className="mt-2 text-xs text-white/40">
                      토스 테스트 결제 환경입니다.
                    </p>
                    <button
                      onClick={() => setStep("checkout")}
                      className="mt-4 w-full rounded-2xl bg-gradient-to-r from-[#c79b43] via-[#f0d18a] to-[#c79b43] px-5 py-4 font-bold text-[#171107] shadow-[0_12px_35px_rgba(199,155,67,0.18)] transition hover:brightness-105"
                    >
                      상세 사주 결제하기
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Premium result */}
            {paid && (
              <div className="mb-5 rounded-[26px] border border-[#d8b46a]/35 bg-gradient-to-b from-[#d8b46a]/[0.09] to-white/[0.025] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.2)] sm:p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.2em] text-[#d8b46a]">
                      PREMIUM SAJU
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold text-white">
                      상세 사주 분석
                    </h3>
                  </div>
                  <span className="rounded-full border border-[#d8b46a]/30 bg-[#d8b46a]/10 px-3 py-1 text-[10px] font-semibold text-[#e7c982]">
                    UNLOCKED
                  </span>
                </div>

                {premiumLoading ? (
                  <div className="rounded-2xl border border-white/[0.06] bg-[#0a1019] p-6 text-center">
                    <p className="text-[#f0d18a]">
                      🔮 결제 확인 후 상세 AI 사주를 생성하고 있습니다...
                    </p>
                  </div>
                ) : premiumAnalysis ? (
                  <div className="space-y-3">
                    {premiumAnalysis
                      .split(/(?=#\s*\d+\.)/)
                      .filter((section) => section.trim())
                      .map((section, index) => {
                        const lines = section.trim().split("\n");
                        const title =
                          lines[0]?.replace(/^#\s*/, "") ||
                          `상세 분석 ${index + 1}`;
                        const content = lines.slice(1).join("\n").trim();

                        return (
                          <div
                            key={index}
                            className="rounded-2xl border border-white/[0.06] bg-[#0a1019] p-5"
                          >
                            <h4 className="text-base font-bold text-[#f0d18a]">
                              {title}
                            </h4>
                            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-white/60">
                              {content}
                            </p>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/[0.06] bg-[#0a1019] p-5">
                    <p className="text-sm leading-7 text-white/60">
                      결제는 완료되었지만 상세 분석 결과를 아직 불러오지 못했습니다.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="mb-5 rounded-2xl border border-white/[0.05] bg-white/[0.02] p-4 text-center text-[11px] leading-5 text-white/30">
              AI 사주는 전통 사주 해석을 참고한 콘텐츠로, 중요한 의사결정의 유일한 근거로 사용하지 마세요.
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={copyAnalysis}
                className="rounded-2xl border border-white/10 bg-white/[0.035] px-6 py-4 font-bold text-white/75 transition hover:border-[#d8b46a]/30 hover:bg-white/[0.06]"
              >
                📋 분석 결과 복사하기
              </button>

              <button
                onClick={resetInput}
                className="rounded-2xl border border-[#d8b46a]/40 bg-[#d8b46a]/10 px-6 py-4 font-bold text-[#e7c982] transition hover:bg-[#d8b46a]/15"
              >
                다시 입력하기
              </button>
            </div>
          </div>
        </section>
      )}

      {step === "service" && (
        <section className="min-h-screen bg-[#070b13] px-5 py-10 sm:px-6 sm:py-14">
          <div className="mx-auto max-w-4xl">
            <button onClick={() => setStep("home")} className="mb-8 text-sm text-white/45 hover:text-[#e7c982]">← 홈으로</button>
            <div className="mb-10 text-center">
              <p className="text-xs font-semibold tracking-[0.22em] text-[#d8b46a]">SERVICE</p>
              <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">AI 사주 서비스 소개</h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/45">
                생년월일과 태어난 시간을 바탕으로 사주 원국과 오행을 확인하고 AI가 이해하기 쉬운 형태로 내용을 정리합니다.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["01","사주 원국","년주·월주·일주·시주를 확인합니다."],
                ["02","오행 분석","목·화·토·금·수의 분포를 확인합니다."],
                ["03","상세 분석","재물운·직업운·관계·흐름 등을 확장합니다."]
              ].map(([n,t,d]) => (
                <div key={n} className="rounded-[24px] border border-[#d8b46a]/15 bg-white/[0.035] p-6">
                  <p className="text-xs tracking-[0.2em] text-[#d8b46a]">{n}</p>
                  <h3 className="mt-3 text-lg font-semibold text-white">{t}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/45">{d}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-[26px] border border-[#d8b46a]/20 bg-white/[0.035] p-6">
              <h3 className="text-lg font-semibold text-[#f0d18a]">이용 전 안내</h3>
              <p className="mt-3 text-sm leading-7 text-white/50">
                AI 사주 결과는 전통적인 사주 해석을 참고한 콘텐츠이며 미래를 확정적으로 예측하는 자료가 아닙니다.
              </p>
            </div>
          </div>
        </section>
      )}

      {step === "guide" && (
        <section className="min-h-screen bg-[#070b13] px-5 py-10 sm:px-6 sm:py-14">
          <div className="mx-auto max-w-3xl">
            <button onClick={() => setStep("home")} className="mb-8 text-sm text-white/45 hover:text-[#e7c982]">← 홈으로</button>
            <div className="mb-10 text-center">
              <p className="text-xs font-semibold tracking-[0.22em] text-[#d8b46a]">GUIDE</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">이용안내</h2>
            </div>
            <div className="space-y-3">
              {[
                ["1. 정보 입력","생년월일, 태어난 시간, 성별을 입력합니다."],
                ["2. 무료 분석","사주 원국과 오행, 기본 AI 분석을 확인합니다."],
                ["3. 상세 분석","프리미엄 상세 분석이 필요한 경우 결제 화면으로 이동합니다."],
                ["4. 결제","현재는 실제 결제 연동 전 단계의 화면입니다."],
                ["5. 상세 결과","결제 연동 후 개인별 상세 분석을 제공하도록 확장합니다."]
              ].map(([t,d]) => (
                <div key={t} className="rounded-2xl border border-white/[0.06] bg-white/[0.035] p-5">
                  <h3 className="font-semibold text-[#f0d18a]">{t}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/45">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {step === "support" && (
        <section className="min-h-screen bg-[#070b13] px-5 py-10 sm:px-6 sm:py-14">
          <div className="mx-auto max-w-2xl">
            <button onClick={() => setStep("home")} className="mb-8 text-sm text-white/45 hover:text-[#e7c982]">← 홈으로</button>
            <div className="rounded-[28px] border border-[#d8b46a]/20 bg-white/[0.035] p-6 sm:p-8">
              <p className="text-xs font-semibold tracking-[0.22em] text-[#d8b46a]">SUPPORT</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">고객센터</h2>
              <p className="mt-3 text-sm leading-6 text-white/45">서비스 이용 중 궁금한 점이나 결제·결과 관련 문의를 남길 수 있습니다.</p>
              <div className="mt-7 space-y-4">
                <input placeholder="문의 제목을 입력해주세요." className="w-full rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-4 text-white outline-none placeholder:text-white/25 focus:border-[#d8b46a]/70" />
                <textarea rows={6} placeholder="문의 내용을 입력해주세요." className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-4 text-white outline-none placeholder:text-white/25 focus:border-[#d8b46a]/70" />
                <button onClick={() => alert("문의 기능은 실제 운영 단계에서 이메일 또는 고객센터 API와 연결합니다.")} className="w-full rounded-2xl bg-gradient-to-r from-[#c79b43] via-[#f0d18a] to-[#c79b43] px-5 py-4 font-bold text-[#171107]">문의 접수하기</button>
              </div>
            </div>
          </div>
        </section>
      )}

      {step === "checkout" && (
        <section className="min-h-screen bg-[#070b13] px-5 py-10 sm:px-6 sm:py-14">
          <div className="mx-auto max-w-2xl">
            <button
              onClick={() => {
                setPaymentError("");
                setStep("result");
              }}
              className="mb-8 text-sm text-white/45 hover:text-[#e7c982]"
            >
              ← 결과로 돌아가기
            </button>

            <div className="mb-8 text-center">
              <p className="text-xs font-semibold tracking-[0.22em] text-[#d8b46a]">
                PREMIUM CHECKOUT
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-white">
                상세 사주 분석 결제
              </h2>
              <p className="mt-3 text-sm text-white/40">
                테스트 결제 환경입니다. 실제 금액이 청구되지 않습니다.
              </p>
            </div>

            <div className="rounded-[28px] border border-[#d8b46a]/25 bg-white/[0.035] p-6 sm:p-8">
              <div className="flex items-center justify-between border-b border-white/[0.07] pb-5">
                <div>
                  <p className="text-xs text-white/35">상품</p>
                  <h3 className="mt-1 text-xl font-semibold text-white">
                    프리미엄 사주 상세 분석
                  </h3>
                </div>
                <p className="text-xl font-bold text-[#f0d18a]">9,900원</p>
              </div>

              <div className="my-6 space-y-3">
                {[
                  "종합 사주",
                  "재물운",
                  "직업운",
                  "연애·대인관계",
                  "시기별 흐름",
                  "오행 상세 분석",
                ].map((item) => (
                  <div key={item} className="text-sm text-white/60">
                    <span className="mr-3 text-[#e7c982]">✓</span>
                    {item}
                  </div>
                ))}
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 text-xs leading-5 text-white/40">
                <input
                  id="payment-agreement"
                  type="checkbox"
                  className="mt-1 accent-[#d8b46a]"
                  defaultChecked
                />
                <span>상품 내용 및 이용 안내를 확인했습니다.</span>
              </label>

              {paymentError && (
                <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/[0.06] p-4 text-sm leading-6 text-red-200">
                  {paymentError}
                </div>
              )}

              <button
                disabled={paymentLoading}
                onClick={async () => {
                  const agreement = document.getElementById(
                    "payment-agreement"
                  ) as HTMLInputElement | null;

                  if (!agreement?.checked) {
                    setPaymentError("상품 내용 및 이용 안내를 확인해주세요.");
                    return;
                  }

                  setPaymentError("");
                  setPaymentLoading(true);

                  try {
                    const configResponse = await fetch("/api/payment/config");
                    const config = await configResponse.json();

                    if (!configResponse.ok || !config.clientKey) {
                      throw new Error(
                        config.error || "토스 결제 설정을 불러오지 못했습니다."
                      );
                    }

                    const tossPaymentsModule = await import(
                      "@tosspayments/tosspayments-sdk"
                    );

                    const tossPayments =
                      await tossPaymentsModule.loadTossPayments(
                        config.clientKey
                      );

                    const customerKey = `saju-${crypto.randomUUID()}`;

                    const payment = tossPayments.payment({
                      customerKey,
                    });

                    const orderId = `SAJU-${Date.now()}-${Math.random()
                      .toString(36)
                      .slice(2, 8)
                      .toUpperCase()}`;

                    sessionStorage.setItem(
                      "saju_payment_order",
                      JSON.stringify({
                        orderId,
                        amount: 9900,
                        birthDate,
                        birthTime,
                        gender,
                      })
                    );

                    await payment.requestPayment({
                      method: "CARD",
                      amount: {
                        currency: "KRW",
                        value: 9900,
                      },
                      orderId,
                      orderName: "프리미엄 사주 상세 분석",
                      successUrl: `${window.location.origin}/?payment=success`,
                      failUrl: `${window.location.origin}/?payment=fail`,
                    });
                  } catch (error) {
                    console.error(error);
                    setPaymentError(
                      error instanceof Error
                        ? error.message
                        : "결제 요청 중 오류가 발생했습니다."
                    );
                    setPaymentLoading(false);
                  }
                }}
                className="mt-5 w-full rounded-2xl bg-gradient-to-r from-[#c79b43] via-[#f0d18a] to-[#c79b43] px-5 py-4 text-lg font-bold text-[#171107] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {paymentLoading
                  ? "결제창을 준비하고 있습니다..."
                  : "토스 테스트 결제하기"}
              </button>

              <p className="mt-4 text-center text-[10px] leading-5 text-white/25">
                테스트 키를 사용한 결제입니다. 실제 청구가 발생하지 않습니다.
              </p>
            </div>
          </div>
        </section>
      )}

      {step === "legal" && (
        <section className="min-h-screen bg-[#070b13] px-5 py-10 sm:px-6 sm:py-14">
          <div className="mx-auto max-w-3xl">
            <button onClick={() => setStep("home")} className="mb-8 text-sm text-white/45 hover:text-[#e7c982]">← 홈으로</button>
            <div className="mb-6 flex flex-wrap gap-2">
              {[
                ["terms","이용약관"],["privacy","개인정보처리방침"],["refund","환불정책"],["business","사업자 정보"]
              ].map(([key,label]) => (
                <button key={key} onClick={() => setLegalPage(key as typeof legalPage)} className={`rounded-full border px-4 py-2 text-xs ${legalPage === key ? "border-[#d8b46a] bg-[#d8b46a]/10 text-[#f0d18a]" : "border-white/10 text-white/45"}`}>{label}</button>
              ))}
            </div>
            <div className="rounded-[28px] border border-[#d8b46a]/20 bg-white/[0.035] p-6 sm:p-8">
              {legalPage === "terms" && <div><h2 className="text-2xl font-semibold text-white">이용약관</h2><div className="mt-6 space-y-5 text-sm leading-7 text-white/50"><p><b className="text-[#e7c982]">제1조 목적</b><br/>본 약관은 AI 사주 서비스의 이용과 관련한 기본적인 사항을 정하는 것을 목적으로 합니다.</p><p><b className="text-[#e7c982]">제2조 서비스의 성격</b><br/>본 서비스는 사주 해석을 참고한 AI 콘텐츠를 제공합니다. 결과는 오락 및 참고 목적이며 특정 미래를 보장하지 않습니다.</p><p><b className="text-[#e7c982]">제3조 유료 서비스</b><br/>유료 서비스의 상품 내용과 결제 조건은 결제 화면에 표시하며 실제 운영 시 관련 법령과 결제대행사 정책을 반영합니다.</p></div></div>}
              {legalPage === "privacy" && <div><h2 className="text-2xl font-semibold text-white">개인정보처리방침</h2><div className="mt-6 space-y-5 text-sm leading-7 text-white/50"><p><b className="text-[#e7c982]">수집 항목</b><br/>서비스 제공에 필요한 입력 정보와 문의·결제 과정에서 필요한 정보를 구분하여 관리합니다.</p><p><b className="text-[#e7c982]">이용 목적</b><br/>사주 분석 제공, 서비스 운영, 문의 응대 및 결제 처리를 위한 목적으로 사용합니다.</p><p><b className="text-[#e7c982]">보관 및 파기</b><br/>실제 운영 시 항목별 보관 기간과 파기 절차를 법령 및 서비스 정책에 맞게 확정합니다.</p></div></div>}
              {legalPage === "refund" && <div><h2 className="text-2xl font-semibold text-white">환불정책</h2><div className="mt-6 space-y-5 text-sm leading-7 text-white/50"><p><b className="text-[#e7c982]">결제 전</b><br/>상품 내용과 가격을 확인한 후 결제를 진행할 수 있도록 안내합니다.</p><p><b className="text-[#e7c982]">결제 후</b><br/>디지털 콘텐츠의 제공 여부와 이용 상태를 기준으로 실제 운영 정책을 정하고 결제 화면에 명확히 표시합니다.</p></div></div>}
              {legalPage === "business" && <div><h2 className="text-2xl font-semibold text-white">사업자 정보</h2><div className="mt-6 rounded-2xl border border-white/[0.06] bg-[#0a1019] p-5 text-sm leading-8 text-white/45"><p>상호: <span className="text-white/70">실제 사업자 등록 후 입력</span></p><p>대표자: <span className="text-white/70">실제 사업자 등록 후 입력</span></p><p>사업자등록번호: <span className="text-white/70">실제 사업자 등록 후 입력</span></p><p>사업장 주소: <span className="text-white/70">실제 사업자 등록 후 입력</span></p><p>고객센터: <span className="text-white/70">실제 운영 연락처 연결</span></p></div></div>}
            </div>
          </div>
        </section>
      )}

    </main>
  );
}
