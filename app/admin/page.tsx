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

const products = [
  {
    id: "detail",
    name: "상세 사주 분석",
    price: 9900,
    description: "사주 원국과 오행을 바탕으로 핵심 운세를 자세하게 분석합니다.",
  },
  {
    id: "comprehensive",
    name: "종합 사주 분석",
    price: 19900,
    description: "재물·직업·연애·대인관계·전체적인 흐름을 종합적으로 분석합니다.",
  },
  {
    id: "love",
    name: "연애운 분석",
    price: 7900,
    description: "연애 성향과 인연, 관계 흐름을 중심으로 분석합니다.",
  },
  {
    id: "money-job",
    name: "재물·직업운 분석",
    price: 7900,
    description: "재물운과 직업적 성향, 커리어 흐름을 중심으로 분석합니다.",
  },
  {
    id: "compatibility",
    name: "궁합 분석",
    price: 12900,
    description: "두 사람의 사주 정보를 비교하여 관계와 궁합을 분석합니다.",
  },
];

type ProductId =
  | "detail"
  | "comprehensive"
  | "love"
  | "money-job"
  | "compatibility";

type Gender = "남성" | "여성" | "";

export default function AdminPage() {
  const [step, setStep] = useState<"customer" | "product" | "result">(
    "customer"
  );

  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [gender, setGender] = useState<Gender>("");

  const [selectedProduct, setSelectedProduct] =
    useState<ProductId | null>(null);

  const [partnerBirthDate, setPartnerBirthDate] = useState("");
  const [partnerBirthTime, setPartnerBirthTime] = useState("");
  const [partnerGender, setPartnerGender] = useState<Gender>("");

  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedProductInfo = products.find(
    (product) => product.id === selectedProduct
  );

  const getBirthTimeStart = (range: string) => {
    return range.split("~")[0] || "";
  };

  const validateCustomer = () => {
    if (!email.trim()) {
      alert("고객 이메일을 입력해주세요.");
      return false;
    }

    if (!birthDate) {
      alert("생년월일을 입력해주세요.");
      return false;
    }

    if (!birthTime) {
      alert("태어난 시간대를 선택해주세요.");
      return false;
    }

    if (!gender) {
      alert("성별을 선택해주세요.");
      return false;
    }

    return true;
  };

  const goToProduct = () => {
    if (!validateCustomer()) return;

    setError("");
    setStep("product");
  };

  const startTestAnalysis = async () => {
    if (!selectedProduct) {
      alert("분석 상품을 선택해주세요.");
      return;
    }

    if (selectedProduct === "compatibility") {
      if (!partnerBirthDate) {
        alert("상대방 생년월일을 입력해주세요.");
        return;
      }

      if (!partnerBirthTime) {
        alert("상대방 태어난 시간대를 선택해주세요.");
        return;
      }

      if (!partnerGender) {
        alert("상대방 성별을 선택해주세요.");
        return;
      }
    }

    setLoading(true);
    setError("");
    setAnalysis("");

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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "사주 분석 요청에 실패했습니다."
        );
      }

      let resultText = "";

      if (selectedProduct === "detail") {
        resultText =
          "상세 사주 분석 테스트 결과\n\n" +
          (data.analysis || "기본 분석 결과가 없습니다.");
      }

      if (selectedProduct === "comprehensive") {
        resultText =
          "종합 사주 분석 테스트 결과\n\n" +
          "※ 현재 관리자 테스트 버전입니다.\n\n" +
          (data.analysis || "기본 분석 결과가 없습니다.");
      }

      if (selectedProduct === "love") {
        resultText =
          "연애운 분석 테스트 결과\n\n" +
          "※ 현재 관리자 테스트 버전입니다.\n\n" +
          (data.analysis || "기본 분석 결과가 없습니다.");
      }

      if (selectedProduct === "money-job") {
        resultText =
          "재물·직업운 분석 테스트 결과\n\n" +
          "※ 현재 관리자 테스트 버전입니다.\n\n" +
          (data.analysis || "기본 분석 결과가 없습니다.");
      }

      if (selectedProduct === "compatibility") {
        resultText =
          "궁합 분석 테스트 결과\n\n" +
          "※ 현재 관리자 테스트 버전에서는 본인 정보를 기준으로 기본 분석을 생성합니다.\n" +
          "상대방 정보 연동은 다음 단계에서 실제 궁합 분석 API로 연결합니다.\n\n" +
          (data.analysis || "기본 분석 결과가 없습니다.");
      }

      setAnalysis(resultText);
      setStep("result");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "분석 중 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  const resetAdmin = () => {
    setStep("customer");
    setEmail("");
    setBirthDate("");
    setBirthTime("");
    setGender("");
    setSelectedProduct(null);
    setPartnerBirthDate("");
    setPartnerBirthTime("");
    setPartnerGender("");
    setAnalysis("");
    setError("");
  };

  return (
    <main className="min-h-screen bg-[#070b13] px-4 py-8 text-white sm:px-6 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 text-center">
          <p className="text-xs font-semibold tracking-[0.28em] text-[#d8b46a]">
            DAON SAJU ADMIN
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            관리자 시스템
          </h1>

          <p className="mt-3 text-sm text-white/40">
            고객 정보 입력부터 테스트 분석까지 관리합니다.
          </p>
        </header>

        <div className="mb-6 flex items-center justify-center gap-2 text-xs">
          <span
            className={`rounded-full px-3 py-2 ${
              step === "customer"
                ? "bg-[#d8b46a] text-[#171107]"
                : "bg-white/10 text-white/40"
            }`}
          >
            1 고객정보
          </span>

          <span className="text-white/20">→</span>

          <span
            className={`rounded-full px-3 py-2 ${
              step === "product"
                ? "bg-[#d8b46a] text-[#171107]"
                : "bg-white/10 text-white/40"
            }`}
          >
            2 상품선택
          </span>

          <span className="text-white/20">→</span>

          <span
            className={`rounded-full px-3 py-2 ${
              step === "result"
                ? "bg-[#d8b46a] text-[#171107]"
                : "bg-white/10 text-white/40"
            }`}
          >
            3 결과
          </span>
        </div>

        {step === "customer" && (
          <section className="rounded-[28px] border border-[#d8b46a]/25 bg-white/[0.035] p-5 shadow-[0_25px_100px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-8">
            <h2 className="text-xl font-semibold text-[#f0d18a]">
              고객 정보
            </h2>

            <p className="mt-2 text-sm text-white/40">
              분석 결과를 생성할 고객 정보를 입력합니다.
            </p>

            <div className="mt-7 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#ead29a]">
                  고객 이메일
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="min-h-[54px] w-full rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-4 text-base text-white outline-none placeholder:text-white/20 focus:border-[#d8b46a]/70"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#ead29a]">
                  생년월일
                </label>

                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="min-h-[54px] w-full rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-4 text-base text-white outline-none focus:border-[#d8b46a]/70"
                  style={{ colorScheme: "dark" }}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#ead29a]">
                  태어난 시간
                </label>

                <select
                  value={birthTime}
                  onChange={(e) => setBirthTime(e.target.value)}
                  className="min-h-[54px] w-full rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-4 text-base text-white outline-none focus:border-[#d8b46a]/70"
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
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#ead29a]">
                  성별
                </label>

                <div className="grid grid-cols-2 gap-3">
                  {(["남성", "여성"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setGender(value)}
                      className={`min-h-[54px] rounded-2xl border font-semibold transition ${
                        gender === value
                          ? "border-[#d8b46a] bg-[#d8b46a] text-[#171107]"
                          : "border-white/10 bg-white/[0.055] text-white/55 hover:border-[#d8b46a]/40"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={goToProduct}
                className="mt-2 min-h-[58px] w-full rounded-2xl bg-gradient-to-r from-[#c79b43] via-[#f0d18a] to-[#c79b43] px-6 py-4 text-base font-bold text-[#171107] shadow-[0_12px_35px_rgba(199,155,67,0.2)] transition hover:brightness-105"
              >
                상품 선택 →
              </button>
            </div>
          </section>
        )}

        {step === "product" && (
          <section>
            <div className="mb-5 rounded-[24px] border border-white/10 bg-white/[0.035] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-white/35">고객</p>
                  <p className="mt-1 font-medium">{email}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setStep("customer")}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs text-white/50 hover:border-[#d8b46a]/40 hover:text-[#e7c982]"
                >
                  고객정보 수정
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {products.map((product) => {
                const selected = selectedProduct === product.id;

                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() =>
                      setSelectedProduct(product.id as ProductId)
                    }
                    className={`text-left rounded-[24px] border p-6 transition ${
                      selected
                        ? "border-[#d8b46a] bg-[#d8b46a]/10 shadow-[0_15px_50px_rgba(199,155,67,0.12)]"
                        : "border-white/10 bg-white/[0.035] hover:border-[#d8b46a]/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-white">
                          {product.name}
                        </p>

                        <p className="mt-2 text-sm leading-6 text-white/45">
                          {product.description}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                          selected
                            ? "bg-[#d8b46a] text-[#171107]"
                            : "bg-white/10 text-white/50"
                        }`}
                      >
                        {selected ? "선택" : "선택하기"}
                      </span>
                    </div>

                    <div className="mt-5 border-t border-white/10 pt-4">
                      <span className="text-2xl font-bold text-[#f0d18a]">
                        {product.price.toLocaleString()}원
                      </span>

                      <span className="ml-2 text-xs text-white/30">
                        테스트 분석
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedProduct === "compatibility" && (
              <div className="mt-5 rounded-[24px] border border-[#d8b46a]/25 bg-[#d8b46a]/[0.04] p-5 sm:p-7">
                <h3 className="text-lg font-semibold text-[#f0d18a]">
                  상대방 정보
                </h3>

                <p className="mt-2 text-sm text-white/40">
                  궁합 분석은 두 사람의 정보가 필요합니다.
                </p>

                <div className="mt-5 space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#ead29a]">
                      상대방 생년월일
                    </label>

                    <input
                      type="date"
                      value={partnerBirthDate}
                      onChange={(e) =>
                        setPartnerBirthDate(e.target.value)
                      }
                      className="min-h-[54px] w-full rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-4 text-base text-white outline-none focus:border-[#d8b46a]/70"
                      style={{ colorScheme: "dark" }}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#ead29a]">
                      상대방 태어난 시간
                    </label>

                    <select
                      value={partnerBirthTime}
                      onChange={(e) =>
                        setPartnerBirthTime(e.target.value)
                      }
                      className="min-h-[54px] w-full rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-4 text-base text-white outline-none focus:border-[#d8b46a]/70"
                    >
                      <option value="" className="bg-[#08101b]">
                        시간대를 선택해주세요
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
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#ead29a]">
                      상대방 성별
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      {(["남성", "여성"] as const).map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setPartnerGender(value)}
                          className={`min-h-[54px] rounded-2xl border font-semibold transition ${
                            partnerGender === value
                              ? "border-[#d8b46a] bg-[#d8b46a] text-[#171107]"
                              : "border-white/10 bg-white/[0.055] text-white/55 hover:border-[#d8b46a]/40"
                          }`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-5 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">
                {error}
              </div>
            )}

            <button
              type="button"
              disabled={loading || !selectedProduct}
              onClick={startTestAnalysis}
              className="mt-6 min-h-[60px] w-full rounded-2xl bg-gradient-to-r from-[#c79b43] via-[#f0d18a] to-[#c79b43] px-6 py-4 text-base font-bold text-[#171107] shadow-[0_12px_35px_rgba(199,155,67,0.2)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading
                ? "테스트 분석 생성 중..."
                : "테스트 분석 시작 →"}
            </button>

            <p className="mt-4 text-center text-xs leading-5 text-white/25">
              현재는 실제 결제가 발생하지 않습니다.
              <br />
              관리자 테스트용 분석입니다.
            </p>
          </section>
        )}

        {step === "result" && (
          <section>
            <div className="rounded-[28px] border border-[#d8b46a]/25 bg-white/[0.035] p-5 shadow-[0_25px_100px_rgba(0,0,0,0.35)] sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <p className="text-xs tracking-[0.2em] text-[#d8b46a]">
                    TEST RESULT
                  </p>

                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    {selectedProductInfo?.name}
                  </h2>

                  <p className="mt-2 text-sm text-white/40">
                    {email}
                  </p>
                </div>

                <span className="rounded-full border border-[#d8b46a]/30 bg-[#d8b46a]/10 px-3 py-2 text-xs text-[#e7c982]">
                  TEST MODE
                </span>
              </div>

              <div className="mt-6 whitespace-pre-wrap rounded-2xl border border-white/[0.06] bg-[#050912] p-5 text-sm leading-7 text-white/70">
                {analysis || "분석 결과가 없습니다."}
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setStep("product")}
                  className="min-h-[54px] rounded-2xl border border-white/10 bg-white/[0.04] font-semibold text-white/70 hover:border-[#d8b46a]/40"
                >
                  다른 상품 테스트
                </button>

                <button
                  type="button"
                  onClick={resetAdmin}
                  className="min-h-[54px] rounded-2xl bg-[#d8b46a] font-bold text-[#171107] hover:brightness-105"
                >
                  새로운 고객 입력
                </button>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-center text-xs leading-5 text-white/25">
              PDF 생성 · 이메일 발송 · 카카오톡 공유 기능은 다음 단계에서
              연결합니다.
            </div>
          </section>
        )}

        <p className="mt-6 text-center text-[11px] leading-5 text-white/20">
          관리자 테스트 시스템
          <br />
          실제 결제는 연결되어 있지 않습니다.
        </p>
      </div>
    </main>
  );
}
