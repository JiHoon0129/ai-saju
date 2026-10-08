"use client";

import { useMemo, useState } from "react";
import { PRODUCTS, type ProductId } from "../../lib/products";

type Gender = "남성" | "여성" | "";
type Pillars = {
  year: string;
  month: string;
  day: string;
  time: string;
};
type Elements = {
  wood: number;
  fire: number;
  earth: number;
  metal: number;
  water: number;
};

const TIME_RANGES = [
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

async function readJson(response: Response) {
  const raw = await response.text();
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`서버 응답을 읽을 수 없습니다. (${response.status})`);
  }
}

const emptyPillars: Pillars = {
  year: "",
  month: "",
  day: "",
  time: "",
};

const emptyElements: Elements = {
  wood: 0,
  fire: 0,
  earth: 0,
  metal: 0,
  water: 0,
};

export default function AdminPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [gender, setGender] = useState<Gender>("");

  const [partnerBirthDate, setPartnerBirthDate] = useState("");
  const [partnerBirthTime, setPartnerBirthTime] = useState("");
  const [partnerGender, setPartnerGender] = useState<Gender>("");

  const [selectedProduct, setSelectedProduct] = useState<ProductId>("detail");

  const [fourPillars, setFourPillars] = useState<Pillars>(emptyPillars);
  const [fiveElements, setFiveElements] = useState<Elements>(emptyElements);
  const [partnerFourPillars, setPartnerFourPillars] =
    useState<Pillars>(emptyPillars);
  const [partnerFiveElements, setPartnerFiveElements] =
    useState<Elements>(emptyElements);

  const [basicAnalysis, setBasicAnalysis] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const product = useMemo(
    () => PRODUCTS.find((item) => item.id === selectedProduct)!,
    [selectedProduct]
  );

  const resetAll = () => {
    setStep(1);
    setEmail("");
    setBirthDate("");
    setBirthTime("");
    setGender("");
    setPartnerBirthDate("");
    setPartnerBirthTime("");
    setPartnerGender("");
    setSelectedProduct("detail");
    setFourPillars(emptyPillars);
    setFiveElements(emptyElements);
    setPartnerFourPillars(emptyPillars);
    setPartnerFiveElements(emptyElements);
    setBasicAnalysis("");
    setResult("");
    setError("");
  };

  const calculatePillars = async () => {
    setError("");

    if (!email.trim()) return setError("고객 이메일을 입력해주세요.");
    if (!birthDate) return setError("생년월일을 입력해주세요.");
    if (!birthTime) return setError("출생 시간대를 선택해주세요.");
    if (!gender) return setError("성별을 선택해주세요.");

    setLoading(true);

    try {
      const response = await fetch("/api/saju", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birthDate,
          birthTime: birthTime.split("~")[0],
          gender,
        }),
      });

      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(data.error || "만세력 계산에 실패했습니다.");
      }

      if (!data.fourPillars || !data.fiveElements) {
        throw new Error("만세력 결과가 올바르지 않습니다.");
      }

      setFourPillars(data.fourPillars);
      setFiveElements(data.fiveElements);
      setBasicAnalysis(data.result || "");

      if (selectedProduct === "compatibility") {
        if (!partnerBirthDate || !partnerBirthTime || !partnerGender) {
          throw new Error("궁합 분석은 상대방 정보를 모두 입력해주세요.");
        }

        const partnerResponse = await fetch("/api/saju", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            birthDate: partnerBirthDate,
            birthTime: partnerBirthTime.split("~")[0],
            gender: partnerGender,
          }),
        });

        const partnerData = await readJson(partnerResponse);

        if (!partnerResponse.ok) {
          throw new Error(
            partnerData.error || "상대방 만세력 계산에 실패했습니다."
          );
        }

        if (!partnerData.fourPillars || !partnerData.fiveElements) {
          throw new Error("상대방 만세력 결과가 올바르지 않습니다.");
        }

        setPartnerFourPillars(partnerData.fourPillars);
        setPartnerFiveElements(partnerData.fiveElements);
      }

      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "만세력 계산 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const generateResult = async () => {
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/test-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct,
          email,
          birthDate,
          birthTime,
          gender,
          fourPillars,
          fiveElements,
          partnerBirthDate,
          partnerBirthTime,
          partnerGender,
          partnerFourPillars,
          partnerFiveElements,
        }),
      });

      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(data.error || "분석 생성에 실패했습니다.");
      }

      if (!data.result?.trim()) {
        throw new Error("분석 결과가 비어 있습니다.");
      }

      setResult(data.result);
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "분석 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(result);
      alert("결과를 복사했습니다.");
    } catch {
      alert("복사에 실패했습니다.");
    }
  };

  const elementItems = [
    ["목(木)", fiveElements.wood],
    ["화(火)", fiveElements.fire],
    ["토(土)", fiveElements.earth],
    ["금(金)", fiveElements.metal],
    ["수(水)", fiveElements.water],
  ];

  return (
    <main className="min-h-screen bg-[#070b13] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-[#d8b46a]">
              AI SAJU ADMIN
            </p>
            <h1 className="mt-2 text-3xl font-semibold">사주 분석 관리자</h1>
          </div>
          <span className="rounded-full border border-amber-300/20 bg-amber-300/5 px-3 py-2 text-xs text-amber-100/70">
            TEST MODE
          </span>
        </header>

        <div className="mb-6 grid grid-cols-4 gap-2">
          {["고객정보", "만세력", "상품선택", "분석결과"].map((label, index) => (
            <div
              key={label}
              className={`rounded-xl border p-3 text-center text-xs ${
                step === index + 1
                  ? "border-[#d8b46a]/60 bg-[#d8b46a]/10 text-[#f0d18a]"
                  : "border-white/10 bg-white/[0.025] text-white/35"
              }`}
            >
              <span className="block text-[10px] opacity-60">0{index + 1}</span>
              {label}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-400/[0.06] p-4 text-sm text-red-100">
            {error}
          </div>
        )}

        {step === 1 && (
          <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-6 sm:p-8">
            <h2 className="text-xl font-semibold">고객 정보 입력</h2>
            <p className="mt-2 text-sm text-white/40">
              고객 정보를 입력하고 기존 사주 계산 API로 만세력을 확인합니다.
            </p>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <Field label="고객 이메일">
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="customer@example.com" className={inputClass} />
              </Field>

              <Field label="생년월일">
                <input value={birthDate} onChange={(e) => setBirthDate(e.target.value)} type="date" className={inputClass} style={{ colorScheme: "dark" }} />
              </Field>

              <Field label="출생 시간대">
                <select value={birthTime} onChange={(e) => setBirthTime(e.target.value)} className={inputClass}>
                  <option value="">시간대를 선택해주세요</option>
                  {TIME_RANGES.map((time) => <option key={time} value={time}>{time}</option>)}
                </select>
              </Field>

              <Field label="성별">
                <div className="grid grid-cols-2 gap-2">
                  {(["남성", "여성"] as const).map((item) => (
                    <button key={item} onClick={() => setGender(item)} className={gender === item ? selectedButtonClass : buttonClass}>
                      {item}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            <button onClick={calculatePillars} disabled={loading} className={primaryButton}>
              {loading ? "만세력을 계산하고 있습니다..." : "만세력 확인하기 →"}
            </button>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-5">
            <section className="rounded-[28px] border border-[#d8b46a]/25 bg-white/[0.035] p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs tracking-[0.2em] text-[#d8b46a]">FOUR PILLARS</p>
                  <h2 className="mt-2 text-xl font-semibold">만세력 확인</h2>
                </div>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1 text-xs text-emerald-200">계산 완료</span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["년주", fourPillars.year],
                  ["월주", fourPillars.month],
                  ["일주", fourPillars.day],
                  ["시주", fourPillars.time],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-[#0a1019] p-5 text-center">
                    <p className="text-xs text-white/35">{label}</p>
                    <p className="mt-3 text-lg font-bold text-[#f0d18a]">{value || "-"}</p>
                  </div>
                ))}
              </div>

              <h3 className="mt-7 text-sm font-semibold text-[#ead29a]">오행 분포</h3>
              <div className="mt-3 grid grid-cols-5 gap-2">
                {elementItems.map(([label, value]) => (
                  <div key={String(label)} className="rounded-2xl border border-white/10 bg-[#0a1019] p-4 text-center">
                    <p className="text-xs text-white/40">{label}</p>
                    <p className="mt-2 text-xl font-bold text-white">{String(value)}</p>
                  </div>
                ))}
              </div>

              {basicAnalysis && (
                <details className="mt-6 rounded-2xl border border-white/10 bg-[#0a1019] p-4">
                  <summary className="cursor-pointer text-sm text-white/60">기본 AI 분석 원문 보기</summary>
                  <p className="mt-4 whitespace-pre-line text-sm leading-7 text-white/50">{basicAnalysis}</p>
                </details>
              )}

              <div className="mt-7 flex gap-3">
                <button onClick={() => setStep(1)} className={buttonClass}>← 정보 수정</button>
                <button onClick={() => setStep(3)} className={`${primaryButton} mt-0`}>상품 선택으로 →</button>
              </div>
            </section>
          </section>
        )}

        {step === 3 && (
          <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs tracking-[0.2em] text-[#d8b46a]">PRODUCT</p>
                <h2 className="mt-2 text-xl font-semibold">분석 상품 선택</h2>
              </div>
              <span className="text-xs text-white/35">TEST · 결제 없음</span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {PRODUCTS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedProduct(item.id)}
                  className={`rounded-2xl border p-5 text-left transition ${
                    selectedProduct === item.id
                      ? "border-[#d8b46a]/70 bg-[#d8b46a]/10"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="mt-2 text-xs leading-5 text-white/40">{item.description}</p>
                    </div>
                    <strong className="shrink-0 text-[#f0d18a]">{item.price.toLocaleString()}원</strong>
                  </div>
                </button>
              ))}
            </div>

            {selectedProduct === "compatibility" && (
              <div className="mt-6 rounded-2xl border border-[#d8b46a]/20 bg-[#d8b46a]/[0.04] p-5">
                <h3 className="font-semibold text-[#f0d18a]">상대방 정보</h3>
                <p className="mt-2 text-xs text-white/40">두 번째 사람의 만세력도 자동 계산하여 비교합니다.</p>

                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <input value={partnerBirthDate} onChange={(e) => setPartnerBirthDate(e.target.value)} type="date" className={inputClass} style={{ colorScheme: "dark" }} />
                  <select value={partnerBirthTime} onChange={(e) => setPartnerBirthTime(e.target.value)} className={inputClass}>
                    <option value="">시간대</option>
                    {TIME_RANGES.map((time) => <option key={time} value={time}>{time}</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    {(["남성", "여성"] as const).map((item) => (
                      <button key={item} onClick={() => setPartnerGender(item)} className={partnerGender === item ? selectedButtonClass : buttonClass}>{item}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-7 flex gap-3">
              <button onClick={() => setStep(2)} className={buttonClass}>← 만세력</button>
              <button onClick={generateResult} disabled={loading} className={`${primaryButton} mt-0`}>
                {loading ? "AI 분석 생성 중..." : `${product.name} 생성하기 →`}
              </button>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="rounded-[28px] border border-[#d8b46a]/30 bg-white/[0.035] p-6 sm:p-8">
            <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs tracking-[0.2em] text-[#d8b46a]">TEST RESULT</p>
                <h2 className="mt-2 text-2xl font-semibold">{product.name}</h2>
                <p className="mt-2 text-xs text-white/35">{email} · {birthDate} · {gender}</p>
              </div>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-xs text-emerald-200">TEST 생성 완료</span>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-[#0a1019] p-5">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ["년주", fourPillars.year],
                  ["월주", fourPillars.month],
                  ["일주", fourPillars.day],
                  ["시주", fourPillars.time],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-white/[0.025] p-3 text-center">
                    <p className="text-[10px] text-white/30">{label}</p>
                    <p className="mt-1 font-semibold text-[#f0d18a]">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 whitespace-pre-line rounded-2xl border border-white/10 bg-[#0a1019] p-5 text-sm leading-8 text-white/70">
              {result}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={copyResult} className={buttonClass}>결과 복사</button>
              <button onClick={() => setStep(3)} className={buttonClass}>다른 상품 생성</button>
              <button onClick={resetAll} className={primaryButton}>새 고객 분석</button>
            </div>

            <p className="mt-5 text-xs leading-5 text-white/25">
              현재는 테스트 생성 단계입니다. 실제 결제·이메일·PDF 발송은 별도 연결 단계에서 붙입니다.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}

const inputClass =
  "w-full min-h-[52px] rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 text-sm text-white outline-none focus:border-[#d8b46a]/70";

const buttonClass =
  "min-h-[52px] rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white/65 hover:border-[#d8b46a]/40 hover:text-white";

const selectedButtonClass =
  "min-h-[52px] rounded-2xl border border-[#d8b46a] bg-[#d8b46a]/15 px-5 py-3 text-sm font-semibold text-[#f0d18a]";

const primaryButton =
  "mt-7 min-h-[54px] flex-1 rounded-2xl bg-gradient-to-r from-[#c79b43] via-[#f0d18a] to-[#c79b43] px-6 py-4 font-bold text-[#171107] disabled:cursor-not-allowed disabled:opacity-50";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#ead29a]">{label}</span>
      {children}
    </label>
  );
}
