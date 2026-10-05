"use client";

import { useEffect, useRef, useState } from "react";

const PREMIUM_RESULT_STORAGE_KEY = "ai_saju_premium_result_v1";
const PENDING_PAYMENT_STORAGE_KEY = "ai_saju_pending_payment_v1";
const INITIALIZING_MESSAGE = "AI 사주 결과를 준비하고 있습니다...";

async function readJsonResponse(response: Response): Promise<Record<string, any>> {
  const raw = await response.text();
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw) as Record<string, any>;
  } catch {
    throw new Error(response.ok ? "서버 응답을 처리하지 못했습니다." : `서버 오류가 발생했습니다. (${response.status})`);
  }
}

function getPaymentErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  const normalized = message.toLowerCase();
  if (normalized.includes("user_cancel") || normalized.includes("user cancel") || normalized.includes("취소")) return "결제가 취소되었습니다. 결제하지 않고 이전 화면으로 돌아왔습니다.";
  if (normalized.includes("timeout") || normalized.includes("network") || normalized.includes("failed to fetch")) return "네트워크 문제로 결제 상태를 확인하지 못했습니다. 결제 내역을 다시 확인해주세요.";
  return message || "결제 처리 중 오류가 발생했습니다.";
}

export default function Home() {
  const [step, setStep] = useState<"home" | "input" | "result" | "service" | "guide" | "support" | "checkout" | "payment-processing" | "legal">("home");

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
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [hasPendingPaymentKey, setHasPendingPaymentKey] = useState(false);
  const [legalPage, setLegalPage] = useState<"terms" | "privacy" | "refund" | "business">("terms");

  const [birthDate, setBirthDate] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);
  const [birthTime, setBirthTime] = useState("");
  const [gender, setGender] = useState<"남성" | "여성" | "">("");

  const birthDateInputRef = useRef<HTMLInputElement>(null);
  const birthTimeInputRef = useRef<HTMLInputElement>(null);
  const paymentInstanceRef = useRef<any>(null);
  const paymentActiveRef = useRef(false);
  const paymentFlowRef = useRef(false);

  const openBirthDatePicker = () => {
    const input = birthDateInputRef.current as
      | (HTMLInputElement & { showPicker?: () => void })
      | null;
    input?.showPicker?.();
  };

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

  const getBirthTimeStart = (range: string) => range.split("~")[0] || "";


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
          birthTime: getBirthTimeStart(birthTime),
          gender,
        }),
      });

      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.error || "AI 분석에 실패했습니다.");
      }

      if (typeof data.result !== "string" || !data.result.trim()) {
        throw new Error("AI 사주 분석 결과가 비어 있습니다.");
      }

      if (!data.fourPillars || !data.fiveElements) {
        throw new Error("사주 분석 데이터가 올바르지 않습니다.");
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

  const savePremiumResult = (result: {
    birthDate: string;
    birthTime: string;
    gender: "남성" | "여성" | "";
    analysis: string;
    fourPillars: typeof fourPillars;
    fiveElements: typeof fiveElements;
    premiumAnalysis: string;
    paid: boolean;
  }) => {
    try {
      localStorage.setItem(
        PREMIUM_RESULT_STORAGE_KEY,
        JSON.stringify({
          ...result,
          savedAt: Date.now(),
        })
      );
    } catch (error) {
      console.error("premium result save error", error);
    }
  };

  const savePendingPayment = (order: {
    orderId: string;
    amount: number;
    birthDate: string;
    birthTime: string;
    gender: "남성" | "여성" | "";
    analysis: string;
    fourPillars: typeof fourPillars;
    fiveElements: typeof fiveElements;
    paymentVerified?: boolean;
    paymentKey?: string;
  }) => {
    try {
      localStorage.setItem(
        PENDING_PAYMENT_STORAGE_KEY,
        JSON.stringify({
          ...order,
          savedAt: Date.now(),
        })
      );
    } catch (error) {
      console.error("pending payment save error", error);
    }
  };

  const markPaymentVerified = (order: {
    orderId: string;
    amount: number;
    birthDate: string;
    birthTime: string;
    gender: "남성" | "여성" | "";
    analysis: string;
    fourPillars: typeof fourPillars;
    fiveElements: typeof fiveElements;
    paymentKey: string;
  }) => {
    const verifiedOrder = {
      ...order,
      paymentVerified: true,
    };

    try {
      sessionStorage.setItem(
        "saju_payment_order",
        JSON.stringify(verifiedOrder)
      );
    } catch (error) {
      console.error("verified payment session save error", error);
    }

    savePendingPayment(verifiedOrder);
    setPaymentVerified(true);
    setHasPendingPaymentKey(true);
  };

  const clearPendingPayment = () => {
    try {
      localStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY);
    } catch (error) {
      console.error("pending payment clear error", error);
    }
    setHasPendingPaymentKey(false);
  };

  const clearPremiumResult = () => {
    try {
      localStorage.removeItem(PREMIUM_RESULT_STORAGE_KEY);
    } catch (error) {
      console.error("premium result clear error", error);
    }
  };

  const resetInput = () => {
    clearPremiumResult();
    clearPendingPayment();
    setStep("input");
    setPaid(false);
    setAnalysis("");
    setPremiumAnalysis("");
    setPaymentError("");
    setPaymentVerified(false);
    setHasPendingPaymentKey(false);
    paymentActiveRef.current = false;
    paymentFlowRef.current = false;
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

  const hasElementData = elements.some((element) => element.value > 0);
  const mostElement = [...elements].sort((a, b) => b.value - a.value)[0];
  const leastElement = [...elements].sort((a, b) => a.value - b.value)[0];

  const retryPremiumAnalysis = async () => {
    setPaymentError("");
    setPremiumLoading(true);
    setStep("payment-processing");

    try {
      const sessionSaved = sessionStorage.getItem("saju_payment_order");
      const localSaved = localStorage.getItem(PENDING_PAYMENT_STORAGE_KEY);
      const saved = sessionSaved || localSaved;
      const order = saved ? JSON.parse(saved) : null;

      if (
        !order ||
        order.paymentVerified !== true ||
        !order.paymentKey ||
        !order.orderId ||
        Number(order.amount) !== 9900
      ) {
        throw new Error("결제 확인 정보가 없어 분석을 다시 생성할 수 없습니다.");
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
          paymentKey: order.paymentKey,
          orderId: order.orderId,
        }),
      });

      const premiumData = await readJsonResponse(premiumResponse);

      if (!premiumResponse.ok) {
        throw new Error(
          premiumData.error || "상세 사주 분석 생성에 실패했습니다."
        );
      }

      const finalPremiumAnalysis = premiumData.result || "";

      if (!finalPremiumAnalysis.trim()) {
        throw new Error("상세 사주 분석 결과가 비어 있습니다. 다시 시도해주세요.");
      }

      setBirthDate(order.birthDate || "");
      setBirthTime(order.birthTime || "");
      setGender(order.gender || "");
      setAnalysis(order.analysis || "");
      setFourPillars(order.fourPillars || { year: "", month: "", day: "", time: "" });
      setFiveElements(order.fiveElements || { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 });
      setPremiumAnalysis(finalPremiumAnalysis);
      setPaid(true);
      setStep("result");
      setPaymentVerified(true);

      savePremiumResult({
        birthDate: order.birthDate,
        birthTime: order.birthTime,
        gender: order.gender || "",
        analysis: order.analysis || "",
        fourPillars: order.fourPillars || { year: "", month: "", day: "", time: "" },
        fiveElements: order.fiveElements || { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
        premiumAnalysis: finalPremiumAnalysis,
        paid: true,
      });

      sessionStorage.removeItem("saju_payment_order");
      clearPendingPayment();
      window.history.replaceState({}, "", window.location.pathname);
    } catch (error) {
      console.error("premium retry error", error);
      setPaymentError(
        error instanceof Error
          ? error.message
          : "상세 사주 분석 재생성 중 오류가 발생했습니다."
      );
      setStep("checkout");
    } finally {
      setPremiumLoading(false);
    }
  };

  const retryPaymentConfirmation = async () => {
    setPaymentError("");
    setPaymentLoading(true);
    setStep("payment-processing");

    try {
      const sessionSaved = sessionStorage.getItem("saju_payment_order");
      const localSaved = localStorage.getItem(PENDING_PAYMENT_STORAGE_KEY);
      const saved = sessionSaved || localSaved;
      const order = saved ? JSON.parse(saved) : null;
      const paymentKey = typeof order?.paymentKey === "string" ? order.paymentKey.trim() : "";

      if (!order || !paymentKey || !order.orderId || Number(order.amount) !== 9900) {
        throw new Error("확인할 결제 정보가 없습니다. 결제를 다시 진행해주세요.");
      }

      const confirmResponse = await fetch("/api/payment/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentKey, orderId: order.orderId, amount: 9900 }),
      });
      const confirmData = await readJsonResponse(confirmResponse);

      if (!confirmResponse.ok) throw new Error(confirmData.error || "결제 승인 확인에 실패했습니다.");

      markPaymentVerified({ ...order, amount: 9900, paymentKey });
      await retryPremiumAnalysis();
    } catch (error) {
      console.error("payment confirmation retry error", error);
      setPaymentError(getPaymentErrorMessage(error));
      setStep("checkout");
    } finally {
      setPaymentLoading(false);
    }
  };

  const destroyActivePayment = async () => {
    paymentActiveRef.current = false;
    paymentFlowRef.current = false;
    try {
      await paymentInstanceRef.current?.destroy?.();
    } catch (error) {
      console.error("payment destroy error", error);
    }
    paymentInstanceRef.current = null;
  };

  useEffect(() => {
    let restoredPremium = false;

    try {
      const savedPremium = localStorage.getItem(PREMIUM_RESULT_STORAGE_KEY);

      if (savedPremium) {
        const saved = JSON.parse(savedPremium);

        if (
          saved?.paid === true &&
          typeof saved?.premiumAnalysis === "string" &&
          saved.premiumAnalysis.trim()
        ) {
          setBirthDate(saved.birthDate || "");
          setBirthTime(saved.birthTime || "");
          setGender(saved.gender || "");
          setAnalysis(saved.analysis || "");
          setFourPillars(saved.fourPillars || { year: "", month: "", day: "", time: "" });
          setFiveElements(saved.fiveElements || { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 });
          setPremiumAnalysis(saved.premiumAnalysis);
          setPaid(true);
          setPaymentVerified(true);
          setStep("result");
          restoredPremium = true;
        }
      }
    } catch (error) {
      console.error("premium result restore error", error);
      try {
        localStorage.removeItem(PREMIUM_RESULT_STORAGE_KEY);
      } catch {
        // ignore storage cleanup errors
      }
    }

    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get("payment");

    // 결제 리다이렉트 직후 홈 화면이 잠깐 보이는 문제를 막고,
    // 새로고침으로 React state가 초기화되어도 진행 중인 주문 정보를 복구합니다.
    if (!restoredPremium) {
      try {
        const pendingSaved =
          sessionStorage.getItem("saju_payment_order") ||
          localStorage.getItem(PENDING_PAYMENT_STORAGE_KEY);
        const pending = pendingSaved ? JSON.parse(pendingSaved) : null;

        if (pending) {
          setBirthDate(pending.birthDate || "");
          const restoredPaymentKey = typeof pending.paymentKey === "string" && pending.paymentKey.trim().length > 0;
          setPaymentVerified(pending.paymentVerified === true && restoredPaymentKey);
          setHasPendingPaymentKey(restoredPaymentKey);
          setBirthTime(pending.birthTime || "");
          setGender(pending.gender || "");
          setAnalysis(pending.analysis || "");
          setFourPillars(
            pending.fourPillars || { year: "", month: "", day: "", time: "" }
          );
          setFiveElements(
            pending.fiveElements || {
              wood: 0,
              fire: 0,
              earth: 0,
              metal: 0,
              water: 0,
            }
          );
        }
      } catch (error) {
        console.error("pending payment restore error", error);
      }
    }

    if (paymentStatus !== "success" && paymentStatus !== "fail") {
      setIsInitializing(false);
      return;
    }

    // PC iframe 결제에서는 결제창 내부에서 처리되므로 브라우저 주소에
    // payment=success가 남는 정상적인 흐름이 없습니다.
    // 이전 결제 시도의 stale query가 남아 있으면 결제 결과 오류로 오인하지 않고
    // 주소만 정리한 뒤 현재 저장된 주문 상태를 유지합니다.
    if (paymentStatus === "success" && !params.get("paymentKey")) {
      window.history.replaceState({}, "", window.location.pathname);
      setIsInitializing(false);
      return;
    }

    if (restoredPremium) {
      if (paymentStatus === "success" || paymentStatus === "fail") {
        clearPendingPayment();
        window.history.replaceState({}, "", window.location.pathname);
      }
      setIsInitializing(false);
      return;
    }

    const handlePaymentResult = async () => {
      if (paymentStatus === "fail") {
        setPaymentError(
          params.get("message") || "결제가 취소되었거나 실패했습니다."
        );
        setStep("checkout");
        window.history.replaceState({}, "", window.location.pathname);
        setIsInitializing(false);
        return;
      }

      const paymentKey = params.get("paymentKey");
      const orderId = params.get("orderId");
      const amount = Number(params.get("amount"));

      // Redirect 결과가 불완전한 경우에만 오류로 처리합니다.
      // 특히 amount가 누락된 URL은 PC iframe 결제의 정상 결과가 아니므로
      // 잘못된 결제 정보 오류를 보여주지 않고 현재 화면을 유지합니다.
      if (!paymentKey || !orderId || !Number.isFinite(amount) || amount <= 0) {
        window.history.replaceState({}, "", window.location.pathname);
        setIsInitializing(false);
        return;
      }

      try {
        setPremiumLoading(true);

        setStep("payment-processing");

        const sessionSaved = sessionStorage.getItem("saju_payment_order");
        const localSaved = localStorage.getItem(PENDING_PAYMENT_STORAGE_KEY);
        const saved = sessionSaved || localSaved;
        const order = saved ? JSON.parse(saved) : null;

        if (
          !order ||
          String(order.orderId) !== String(orderId) ||
          Number(order.amount) !== Number(amount)
        ) {
          throw new Error("주문 정보 검증에 실패했습니다. 결제 정보가 만료되었을 수 있습니다.");
        }

        setBirthDate(order.birthDate || "");
        setBirthTime(order.birthTime || "");
        setGender(order.gender || "");
        setAnalysis(order.analysis || "");
        setFourPillars(
          order.fourPillars || { year: "", month: "", day: "", time: "" }
        );
        setFiveElements(
          order.fiveElements || {
            wood: 0,
            fire: 0,
            earth: 0,
            metal: 0,
            water: 0,
          }
        );

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

        const confirmData = await readJsonResponse(confirmResponse);

        if (!confirmResponse.ok) {
          throw new Error(
            confirmData.error || "결제 승인에 실패했습니다."
          );
        }

        markPaymentVerified({
          ...order,
          paymentKey,
        });

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

        const premiumData = await readJsonResponse(premiumResponse);

        if (!premiumResponse.ok) {
          throw new Error(
            premiumData.error || "상세 사주 분석 생성에 실패했습니다."
          );
        }

        const finalPremiumAnalysis = premiumData.result || "";

        setPremiumAnalysis(finalPremiumAnalysis);
        setPaid(true);
        setStep("result");

        savePremiumResult({
          birthDate: order.birthDate,
          birthTime: order.birthTime,
          gender: order.gender,
          analysis: order.analysis || "",
          fourPillars: order.fourPillars || { year: "", month: "", day: "", time: "" },
          fiveElements: order.fiveElements || { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
          premiumAnalysis: finalPremiumAnalysis,
          paid: true,
        });

        sessionStorage.removeItem("saju_payment_order");
        clearPendingPayment();
        window.history.replaceState({}, "", window.location.pathname);
      } catch (error) {
        console.error(error);
        setPaymentError(getPaymentErrorMessage(error));
        setStep("checkout");
      } finally {
        setPremiumLoading(false);
        setPaymentLoading(false);
        setIsInitializing(false);
      }
    };

    void handlePaymentResult();
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      if (paymentActiveRef.current) {
        void destroyActivePayment();
        setPaymentLoading(false);
        setPremiumLoading(false);
        setPaymentError("결제창이 닫혔습니다. 결제를 다시 진행해주세요.");
        setStep("checkout");
        window.history.replaceState({}, "", window.location.pathname);
        return;
      }

      if (step === "payment-processing") {
        paymentFlowRef.current = false;
        setPaymentLoading(false);
        setPremiumLoading(false);
        setStep("checkout");
        return;
      }

      if (paid && premiumAnalysis.trim()) {
        paymentFlowRef.current = false;
        setStep("home");
      }
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!paymentActiveRef.current) return;
      event.preventDefault();
      event.returnValue = "결제가 진행 중입니다. 새로고침하면 결제창이 종료될 수 있습니다.";
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [step, paid, premiumAnalysis]);

  if (isInitializing) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070b13] px-5 text-white">
        <div className="w-full max-w-md rounded-[30px] border border-[#d8b46a]/20 bg-white/[0.035] p-8 text-center shadow-[0_25px_100px_rgba(0,0,0,0.45)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#d8b46a]/35 bg-[#d8b46a]/[0.06]">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-[#f0d18a]" />
          </div>
          <p className="mt-5 text-xs font-semibold tracking-[0.2em] text-[#d8b46a]">AI SAJU</p>
          <p className="mt-2 text-sm text-white/55">{INITIALIZING_MESSAGE}</p>
        </div>
      </main>
    );
  }

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

            {/* Start CTA */}
            <div className="mt-10 w-full max-w-2xl sm:mt-12">
              <button
                onClick={() => setStep("input")}
                className="group w-full rounded-[28px] border border-[#d8b46a]/55 bg-[#08101b]/78 px-7 py-7 text-center shadow-[0_24px_90px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition hover:border-[#e7c982]/80 hover:bg-[#0b1420]/90 hover:shadow-[0_28px_100px_rgba(0,0,0,0.5)]"
              >
                <span className="block text-xs font-semibold tracking-[0.22em] text-[#d8b46a]">
                  AI SAJU
                </span>
                <span className="mt-2 block text-xl font-semibold text-white sm:text-2xl">
                  나의 사주 분석 시작하기
                </span>
                <span className="mt-2 block text-sm text-white/45">
                  생년월일과 태어난 시간을 입력해 나만의 사주를 확인해보세요.
                </span>
                <span className="mt-5 inline-flex rounded-2xl bg-gradient-to-r from-[#c79b43] via-[#f0d18a] to-[#c79b43] px-10 py-4 text-base font-bold text-[#171107] shadow-[0_12px_35px_rgba(199,155,67,0.22)] transition group-hover:brightness-105 sm:text-lg">
                  사주 시작하기  →
                </span>
              </button>

              <p className="mt-4 text-center text-[11px] leading-5 text-white/30">
                시작 버튼을 누른 후 생년월일 · 태어난 시간 · 성별을 입력합니다.
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
                    ref={birthDateInputRef}
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    onClick={openBirthDatePicker}
                    aria-label="생년월일 선택"
                    className="w-full cursor-pointer rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-[17px] text-white outline-none transition focus:border-[#d8b46a]/80 focus:bg-white/[0.08] focus:ring-1 focus:ring-[#d8b46a]/25"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#ead29a]">
                    태어난 시간
                  </label>
                  <select
                    value={birthTime}
                    onChange={(e) => setBirthTime(e.target.value)}
                    aria-label="태어난 시간대 선택"
                    className="w-full cursor-pointer appearance-none rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-[17px] text-white outline-none transition focus:border-[#d8b46a]/80 focus:bg-white/[0.08] focus:ring-1 focus:ring-[#d8b46a]/25"
                  >
                    <option value="" className="bg-[#08101b]">태어난 시간대를 선택해주세요</option>
                    {birthTimeRanges.map((range) => (
                      <option key={range} value={range} className="bg-[#08101b]">
                        {range}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs leading-5 text-white/35">
                    정확한 출생시간을 모르는 경우 해당 시간대를 선택해주세요.
                  </p>
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

              {paid && (
                <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full border border-[#d8b46a]/35 bg-[#d8b46a]/[0.08] px-4 py-2 text-xs font-semibold text-[#f0d18a]">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#d8b46a]/15">
                    ✓
                  </span>
                  프리미엄 결제 완료
                </div>
              )}

              {paid && (
                <div className="mx-auto mt-3 max-w-xl rounded-2xl border border-[#d8b46a]/15 bg-[#d8b46a]/[0.04] px-4 py-3 text-xs text-white/45">
                  결제가 정상적으로 완료되었습니다. 아래에서 입력 정보와 프리미엄 상세 분석을 확인할 수 있습니다.
                </div>
              )}
            </div>

            <div className="mb-5 rounded-[26px] border border-[#d8b46a]/20 bg-white/[0.035] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.18)] sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-[#e7c982]">📋 입력 정보</p>
                <span className="rounded-full border border-[#d8b46a]/20 bg-[#d8b46a]/[0.05] px-3 py-1 text-[10px] text-[#d8b46a]">
                  {paid ? "PREMIUM SAJU" : "MY SAJU"}
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
                    {hasElementData ? mostElement.name : "분석 데이터 없음"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
                  <p className="text-xs text-white/40">가장 적은 오행</p>
                  <p className="mt-1 text-lg font-bold text-white/75">
                    {hasElementData ? leastElement.name : "분석 데이터 없음"}
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm leading-7 text-white/65">
                {!hasElementData && (
                  <p className="rounded-xl border border-amber-400/10 bg-amber-400/[0.04] p-3 text-amber-100/70">
                    오행 데이터가 아직 표시되지 않았습니다. 이전 단계의 분석 결과를 확인한 후 다시 시도해주세요.
                  </p>
                )}
                {hasElementData && fiveElements.wood === 0 && (
                  <p>🌱 목(木)이 부족한 편으로, 새로운 시작이나 유연한 사고를 의식적으로 보완해보는 것이 좋습니다.</p>
                )}
                {hasElementData && fiveElements.fire === 0 && (
                  <p>🔥 화(火)가 부족한 편으로, 활력과 표현력을 생활 속에서 조금씩 키워보는 것이 도움이 될 수 있습니다.</p>
                )}
                {hasElementData && fiveElements.earth === 0 && (
                  <p>🏔️ 토(土)가 부족한 편으로, 안정감과 꾸준함을 의식적으로 유지하는 것이 도움이 될 수 있습니다.</p>
                )}
                {hasElementData && fiveElements.metal === 0 && (
                  <p>⚔️ 금(金)이 부족한 편으로, 원칙과 판단력을 균형 있게 활용하는 것이 도움이 될 수 있습니다.</p>
                )}
                {hasElementData && fiveElements.water === 0 && (
                  <p>💧 수(水)가 부족한 편으로, 휴식과 유연한 사고를 생활 속에서 챙기는 것이 좋습니다.</p>
                )}
                {hasElementData && fiveElements.wood > 0 &&
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

      {step === "payment-processing" && (
        <section className="flex min-h-screen items-center justify-center bg-[#070b13] px-5 py-10">
          <div className="w-full max-w-md rounded-[30px] border border-[#d8b46a]/25 bg-white/[0.035] p-8 text-center shadow-[0_25px_100px_rgba(0,0,0,0.45)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#d8b46a]/40 bg-[#d8b46a]/[0.08]">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/10 border-t-[#f0d18a]" />
            </div>
            <p className="mt-6 text-xs font-semibold tracking-[0.22em] text-[#d8b46a]">
              PREMIUM SAJU
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-white">
              결제를 확인하고 있습니다
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/45">
              결제 승인 확인 후
              <br />
              상세 사주 분석을 준비하고 있습니다.
            </p>
            <div className="mt-6 rounded-2xl border border-white/[0.06] bg-[#0a1019] p-4">
              <p className="text-xs text-white/35">잠시만 기다려주세요</p>
              <p className="mt-2 text-sm font-semibold text-[#f0d18a]">
                결제 결과를 안전하게 처리하는 중입니다.
              </p>
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
                setStep(paid ? "result" : "input");
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

              {paymentVerified ? (
                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4 text-sm leading-6 text-emerald-100/80">
                    결제는 정상적으로 완료되었습니다. 상세 분석 생성 과정에서 문제가 발생한 경우 추가 결제 없이 다시 생성할 수 있습니다.
                  </div>
                  <button
                    onClick={retryPremiumAnalysis}
                    disabled={premiumLoading}
                    className="w-full rounded-2xl bg-gradient-to-r from-[#c79b43] via-[#f0d18a] to-[#c79b43] px-5 py-4 text-lg font-bold text-[#171107] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {premiumLoading ? "상세 분석을 다시 생성하고 있습니다..." : "상세 사주 분석 다시 생성하기"}
                  </button>
                </div>
              ) : hasPendingPaymentKey ? (
                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-sm leading-6 text-amber-100/80">
                    결제는 진행되었지만 승인 확인이 완료되지 않았습니다. 추가 결제 없이 기존 결제 승인을 다시 확인합니다.
                  </div>
                  <button
                    disabled={paymentLoading}
                    onClick={retryPaymentConfirmation}
                    className="w-full rounded-2xl bg-gradient-to-r from-[#c79b43] via-[#f0d18a] to-[#c79b43] px-5 py-4 text-lg font-bold text-[#171107] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {paymentLoading ? "결제 승인 확인 중..." : "기존 결제 승인 다시 확인하기"}
                  </button>
                </div>
              ) : (
              <button
                disabled={paymentLoading}
                onClick={async () => {
                  if (paymentFlowRef.current || paymentLoading) {
                    return;
                  }

                  paymentFlowRef.current = true;

                  const agreement = document.getElementById(
                    "payment-agreement"
                  ) as HTMLInputElement | null;

                  if (!agreement?.checked) {
                    paymentFlowRef.current = false;
                    setPaymentError("상품 내용 및 이용 안내를 확인해주세요.");
                    return;
                  }

                  setPaymentError("");
                  setPaymentLoading(true);

                  try {
                    const configResponse = await fetch("/api/payment/config");
                    const config = await readJsonResponse(configResponse);

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
                    paymentInstanceRef.current = payment;

                    const orderId = `SAJU-${Date.now()}-${Math.random()
                      .toString(36)
                      .slice(2, 8)
                      .toUpperCase()}`;

                    const pendingOrder = {
                      orderId,
                      amount: 9900,
                      birthDate,
                      birthTime: getBirthTimeStart(birthTime),
                      birthTimeRange: birthTime,
                      gender,
                      analysis,
                      fourPillars,
                      fiveElements,
                    };

                    sessionStorage.setItem(
                      "saju_payment_order",
                      JSON.stringify(pendingOrder)
                    );
                    savePendingPayment(pendingOrder);
                    setStep("payment-processing");
                    paymentActiveRef.current = true;
                    window.history.pushState({ paymentSession: true }, "", window.location.href);

                    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

                    if (isMobile) {
                      // 모바일은 Redirect 방식이므로 브라우저 이동 직전에는
                      // 결제 진행 보호 상태를 해제합니다.
                      paymentActiveRef.current = false;
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
                        windowTarget: "self",
                      });
                    } else {
                      const paymentResult = (await payment.requestPayment({
                        method: "CARD",
                        amount: {
                          currency: "KRW",
                          value: 9900,
                        },
                        orderId,
                        orderName: "프리미엄 사주 상세 분석",
                        windowTarget: "iframe",
                      })) as unknown as {
                        paymentKey?: unknown;
                        orderId?: unknown;
                        amount?: unknown;
                      };

                      // PC iframe Promise 방식에서는 paymentKey가 핵심 승인 정보입니다.
                      // orderId/amount는 최초 결제 요청값을 기준으로 서버에 전달하고,
                      // 서버에서 Toss 승인 결과의 orderId/amount를 최종 검증합니다.
                      const paymentKey =
                        typeof paymentResult?.paymentKey === "string"
                          ? paymentResult.paymentKey.trim()
                          : "";
                      const resultOrderId =
                        typeof paymentResult?.orderId === "string"
                          ? paymentResult.orderId.trim()
                          : orderId;
                      const rawAmount = paymentResult?.amount;
                      const resultAmount =
                        rawAmount &&
                        typeof rawAmount === "object" &&
                        "value" in (rawAmount as Record<string, unknown>)
                          ? Number((rawAmount as Record<string, unknown>).value)
                          : rawAmount === undefined ||
                              rawAmount === null ||
                              rawAmount === ""
                            ? 9900
                            : Number(rawAmount);

                      console.log("Toss payment result", {
                        paymentKey: paymentKey ? "received" : "missing",
                        orderId: resultOrderId,
                        amount: resultAmount,
                      });

                      if (!paymentKey) {
                        throw new Error(
                          "토스 결제 결과에서 paymentKey를 받지 못했습니다. 결제가 완료되지 않았거나 결제창이 종료되었을 수 있습니다."
                        );
                      }

                      if (resultOrderId !== orderId) {
                        throw new Error("결제 주문번호가 일치하지 않습니다.");
                      }

                      if (!Number.isFinite(resultAmount)) {
                        throw new Error("토스 결제 결과의 금액 정보를 확인할 수 없습니다.");
                      }

                      if (resultAmount !== 9900) {
                        throw new Error(
                          `결제 금액이 일치하지 않습니다. (요청 금액: 9,900원 / 토스 결과: ${resultAmount.toLocaleString()}원)`
                        );
                      }

                      paymentActiveRef.current = false;

                      const verifiedPendingOrder = {
                        ...pendingOrder,
                        paymentKey,
                        paymentVerified: false,
                      };
                      sessionStorage.setItem("saju_payment_order", JSON.stringify(verifiedPendingOrder));
                      savePendingPayment(verifiedPendingOrder);
                      setHasPendingPaymentKey(true);

                      const confirmResponse = await fetch("/api/payment/confirm", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          paymentKey,
                          orderId,
                          amount: resultAmount,
                        }),
                      });

                      const confirmData = await readJsonResponse(confirmResponse);

                      if (!confirmResponse.ok) {
                        throw new Error(confirmData.error || "결제 승인에 실패했습니다.");
                      }

                      markPaymentVerified({
                        ...pendingOrder,
                        paymentKey,
                      });

                      const premiumResponse = await fetch("/api/premium-saju", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          birthDate: pendingOrder.birthDate,
                          birthTime: pendingOrder.birthTime,
                          gender: pendingOrder.gender,
                          paymentKey,
                          orderId,
                        }),
                      });

                      const premiumData = await readJsonResponse(premiumResponse);

                      if (!premiumResponse.ok) {
                        throw new Error(
                          premiumData.error || "상세 사주 분석 생성에 실패했습니다."
                        );
                      }

                      const finalPremiumAnalysis = premiumData.result || "";

                      if (!finalPremiumAnalysis.trim()) {
                        throw new Error(
                          "상세 사주 분석 결과가 비어 있습니다. 다시 시도해주세요."
                        );
                      }

                      setPremiumAnalysis(finalPremiumAnalysis);
                      setPaid(true);
                      setPaymentVerified(true);
                      setStep("result");

                      savePremiumResult({
                        birthDate: pendingOrder.birthDate,
                        birthTime: pendingOrder.birthTime,
                        gender: pendingOrder.gender,
                        analysis: pendingOrder.analysis || "",
                        fourPillars: pendingOrder.fourPillars || { year: "", month: "", day: "", time: "" },
                        fiveElements: pendingOrder.fiveElements || { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
                        premiumAnalysis: finalPremiumAnalysis,
                        paid: true,
                      });

                      paymentActiveRef.current = false;
                      paymentInstanceRef.current = null;
                      sessionStorage.removeItem("saju_payment_order");
                      clearPendingPayment();
                      setPaymentLoading(false);
                      window.history.replaceState({}, "", window.location.pathname);
                    }

                    paymentFlowRef.current = false;
                  } catch (error) {
                    paymentFlowRef.current = false;
                    console.error(error);
                    void destroyActivePayment();
                    setPaymentError(getPaymentErrorMessage(error));
                    setPaymentLoading(false);
                    setStep("checkout");
                  }
                }}
                className="mt-5 w-full rounded-2xl bg-gradient-to-r from-[#c79b43] via-[#f0d18a] to-[#c79b43] px-5 py-4 text-lg font-bold text-[#171107] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {paymentLoading
                  ? "결제창을 준비하고 있습니다..."
                  : "토스 테스트 결제하기"}
              </button>
              )}

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
