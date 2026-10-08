"use client";

import { useState } from "react";
import {
  ADMIN_PRODUCTS,
  type AdminProductId,
} from "@/lib/admin-products";

type PersonData = {
  birthDate: string;
  birthTime: string;
  gender: string;
};

type SajuData = {
  fourPillars: unknown;
  fiveElements: unknown;
};

const EMPTY_PERSON: PersonData = {
  birthDate: "",
  birthTime: "",
  gender: "",
};

export default function AdminPage() {
  const [productId, setProductId] =
    useState<AdminProductId | null>(null);

  const [customer, setCustomer] =
    useState<PersonData>(EMPTY_PERSON);

  const [partner, setPartner] =
    useState<PersonData>(EMPTY_PERSON);

  const [customerSaju, setCustomerSaju] =
    useState<SajuData | null>(null);

  const [partnerSaju, setPartnerSaju] =
    useState<SajuData | null>(null);

  const [loadingCustomer, setLoadingCustomer] =
    useState(false);

  const [loadingPartner, setLoadingPartner] =
    useState(false);

  const [analyzing, setAnalyzing] =
    useState(false);

  const [pdfLoading, setPdfLoading] =
    useState(false);

  const [pdfBlob, setPdfBlob] =
    useState<Blob | null>(null);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const isCompatibility =
    productId === "compatibility";

  const selectedProduct =
    ADMIN_PRODUCTS.find(
      (product) => product.id === productId
    );

  function updateCustomer(
    field: keyof PersonData,
    value: string
  ) {
    setCustomer((prev) => ({
      ...prev,
      [field]: value,
    }));

    setCustomerSaju(null);
    setPdfBlob(null);
    setMessage("");
    setError("");
  }

  function updatePartner(
    field: keyof PersonData,
    value: string
  ) {
    setPartner((prev) => ({
      ...prev,
      [field]: value,
    }));

    setPartnerSaju(null);
    setPdfBlob(null);
    setMessage("");
    setError("");
  }

  function handleProductChange(
    id: AdminProductId
  ) {
    setProductId(id);

    setCustomer(EMPTY_PERSON);
    setPartner(EMPTY_PERSON);

    setCustomerSaju(null);
    setPartnerSaju(null);

    setPdfBlob(null);
    setMessage("");
    setError("");
  }

  function validatePerson(person: PersonData) {
    if (!person.birthDate) {
      return "생년월일을 입력해주세요.";
    }

    if (!person.birthTime) {
      return "출생시간을 입력해주세요.";
    }

    if (!person.gender) {
      return "성별을 선택해주세요.";
    }

    return "";
  }

  async function calculateSaju(
    person: PersonData,
    target: "customer" | "partner"
  ) {
    const validation = validatePerson(person);

    if (validation) {
      setError(validation);
      return null;
    }

    if (target === "customer") {
      setLoadingCustomer(true);
    } else {
      setLoadingPartner(true);
    }

    setError("");
    setMessage("");

    try {
      const response = await fetch(
        "/api/admin-saju",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(person),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "사주 계산 중 오류가 발생했습니다."
        );
      }

      const result: SajuData = {
        fourPillars: data.fourPillars,
        fiveElements: data.fiveElements,
      };

      if (target === "customer") {
        setCustomerSaju(result);
        setMessage(
          "고객 사주 원국 계산이 완료되었습니다."
        );
      } else {
        setPartnerSaju(result);
        setMessage(
          "상대방 사주 원국 계산이 완료되었습니다."
        );
      }

      return result;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "사주 계산 중 오류가 발생했습니다."
      );

      return null;
    } finally {
      if (target === "customer") {
        setLoadingCustomer(false);
      } else {
        setLoadingPartner(false);
      }
    }
  }

  async function handleAnalysis() {
    setError("");
    setMessage("");
    setPdfBlob(null);

    if (!productId || !selectedProduct) {
      setError("먼저 분석 상품을 선택해주세요.");
      return;
    }

    const customerValidation =
      validatePerson(customer);

    if (customerValidation) {
      setError(
        `고객 기본 정보: ${customerValidation}`
      );
      return;
    }

    if (!customerSaju) {
      setError(
        "먼저 고객 사주를 계산해주세요."
      );
      return;
    }

    if (isCompatibility) {
      const partnerValidation =
        validatePerson(partner);

      if (partnerValidation) {
        setError(
          `상대방 기본 정보: ${partnerValidation}`
        );
        return;
      }

      if (!partnerSaju) {
        setError(
          "먼저 상대방 사주를 계산해주세요."
        );
        return;
      }
    }

    setAnalyzing(true);

    try {
      const response = await fetch(
        "/api/test-analysis",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId,

            customer,

            partner: isCompatibility
              ? partner
              : undefined,

            fourPillars:
              customerSaju.fourPillars,

            fiveElements:
              customerSaju.fiveElements,

            partnerFourPillars:
              isCompatibility
                ? partnerSaju?.fourPillars
                : undefined,

            partnerFiveElements:
              isCompatibility
                ? partnerSaju?.fiveElements
                : undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "AI 분석 중 오류가 발생했습니다."
        );
      }

      if (!data.result) {
        throw new Error(
          "AI 분석 결과가 없습니다."
        );
      }

      setMessage(
        "AI 분석이 완료되었습니다. PDF를 생성하고 있습니다."
      );

      await createPdf(data.result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "AI 분석 중 오류가 발생했습니다."
      );
    } finally {
      setAnalyzing(false);
    }
  }

  async function createPdf(result: string) {
    setPdfLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/admin-pdf",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            result,
            productName:
              selectedProduct?.name || "",
            birthDate: customer.birthDate,
            birthTime: customer.birthTime,
            gender: customer.gender,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();

        throw new Error(
          data?.error ||
            "PDF 생성에 실패했습니다."
        );
      }

      const blob = await response.blob();

      if (!blob.size) {
        throw new Error(
          "생성된 PDF 파일이 비어 있습니다."
        );
      }

      setPdfBlob(blob);

      setMessage(
        "AI 분석과 PDF 생성이 모두 완료되었습니다."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "PDF 생성 중 오류가 발생했습니다."
      );
    } finally {
      setPdfLoading(false);
    }
  }

  function downloadPdf() {
    if (!pdfBlob) {
      setError(
        "먼저 AI 분석과 PDF 생성을 완료해주세요."
      );
      return;
    }

    const url =
      URL.createObjectURL(pdfBlob);

    const a =
      document.createElement("a");

    a.href = url;

    a.download = `${
      selectedProduct?.name || "사주분석"
    }_사주분석.pdf`;

    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);

    setMessage(
      "PDF 다운로드를 시작했습니다."
    );
  }

  async function sharePdf() {
    if (!pdfBlob) {
      setError(
        "먼저 AI 분석과 PDF 생성을 완료해주세요."
      );
      return;
    }

    try {
      const file = new File(
        [pdfBlob],
        `${
          selectedProduct?.name || "사주분석"
        }_사주분석.pdf`,
        {
          type: "application/pdf",
        }
      );

      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({
          files: [file],
        })
      ) {
        await navigator.share({
          title: "AI 사주 분석 결과",
          text: "AI 사주 분석 결과 PDF입니다.",
          files: [file],
        });

        setMessage(
          "PDF 공유가 완료되었습니다."
        );

        return;
      }

      downloadPdf();
    } catch (err) {
      if (
        err instanceof DOMException &&
        err.name === "AbortError"
      ) {
        return;
      }

      setError(
        "공유 기능을 사용할 수 없어 다운로드 방식으로 진행합니다."
      );

      downloadPdf();
    }
  }

  function resetAll() {
    setProductId(null);

    setCustomer(EMPTY_PERSON);
    setPartner(EMPTY_PERSON);

    setCustomerSaju(null);
    setPartnerSaju(null);

    setPdfBlob(null);

    setMessage("");
    setError("");
  }

  return (
    <main className="min-h-screen bg-[#f5f6fa] px-4 py-8 text-[#171b25]">
      <div className="mx-auto max-w-5xl">

        {/* 헤더 */}
        <div className="mb-7">
          <div className="mb-2 inline-flex rounded-full bg-[#111827] px-4 py-2 text-sm font-semibold text-white">
            AI SAJU ADMIN
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            사주 분석 관리자
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            분석할 상품을 먼저 선택해주세요.
          </p>
        </div>

        {/* 오류 */}
        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        {/* 완료 메시지 */}
        {message && !error && (
          <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-semibold text-green-700">
            {message}
          </div>
        )}

        {/* 1. 상품 선택 */}
        <section className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#111827] text-sm font-bold text-white">
              1
            </div>

            <div>
              <h2 className="text-xl font-bold">
                분석 상품 선택
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                원하는 상품을 클릭하면 고객 정보 입력란이 나타납니다.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {ADMIN_PRODUCTS.map((product) => {
              const selected =
                product.id === productId;

              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() =>
                    handleProductChange(
                      product.id
                    )
                  }
                  className={`rounded-2xl border p-5 text-left transition ${
                    selected
                      ? product.id ===
                        "compatibility"
                        ? "border-[#8b4c9d] bg-[#faf5fc] shadow-md"
                        : "border-[#111827] bg-[#f3f4f6] shadow-md"
                      : "border-gray-200 bg-white hover:border-gray-400 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-bold">
                        {product.name}
                      </div>

                      <div className="mt-1 text-lg font-bold">
                        {product.price.toLocaleString()}
                        원
                      </div>

                      <div className="mt-2 text-sm leading-6 text-gray-500">
                        {product.description}
                      </div>
                    </div>

                    {selected && (
                      <div
                        className={`rounded-full px-3 py-1 text-xs font-bold text-white ${
                          product.id ===
                          "compatibility"
                            ? "bg-[#8b4c9d]"
                            : "bg-[#111827]"
                        }`}
                      >
                        선택
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 상품 미선택 */}
        {!productId && (
          <section className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <div className="text-4xl">
              🔮
            </div>

            <div className="mt-3 text-lg font-bold">
              분석 상품을 선택해주세요
            </div>

            <p className="mt-2 text-sm text-gray-500">
              상품을 선택하면 필요한 고객 정보 입력 화면이 나타납니다.
            </p>
          </section>
        )}

        {/* 상품 선택 후 진행 */}
        {productId && (
          <>
            {/* 2. 기본 정보 */}
            <section className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#111827] text-sm font-bold text-white">
                  2
                </div>

                <div>
                  <h2 className="text-xl font-bold">
                    고객 기본 정보
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    {selectedProduct?.name}
                    {" "}
                    분석을 위한 정보를 입력해주세요.
                  </p>
                </div>
              </div>

              {/* 고객 카드 */}
              <PersonForm
                title="고객 기본 정보"
                person={customer}
                onChange={updateCustomer}
                accent="#111827"
              />

              <button
                type="button"
                onClick={() =>
                  calculateSaju(
                    customer,
                    "customer"
                  )
                }
                disabled={loadingCustomer}
                className="mt-5 w-full rounded-xl bg-[#111827] px-5 py-3.5 font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingCustomer
                  ? "고객 사주 계산 중..."
                  : "고객 사주 계산"}
              </button>

              {customerSaju && (
                <div className="mt-6 border-t border-gray-100 pt-6">
                  <div className="mb-4 flex items-center gap-2 text-sm font-bold text-green-700">
                    <span>✓</span>
                    고객 사주 계산 완료
                  </div>

                  <FourPillars
                    data={customerSaju.fourPillars}
                  />

                  <FiveElements
                    data={customerSaju.fiveElements}
                  />
                </div>
              )}
            </section>

            {/* 궁합 상대방 */}
            {isCompatibility && (
              <section className="mb-6 rounded-3xl border-2 border-[#e5d3eb] bg-white p-6 shadow-sm">

                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#8b4c9d] text-sm font-bold text-white">
                    3
                  </div>

                  <div>
                    <h2 className="text-xl font-bold">
                      상대방 기본 정보
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      궁합 분석을 위해 상대방의 정보도 입력해주세요.
                    </p>
                  </div>
                </div>

                <PersonForm
                  title="상대방 기본 정보"
                  person={partner}
                  onChange={updatePartner}
                  accent="#8b4c9d"
                />

                <button
                  type="button"
                  onClick={() =>
                    calculateSaju(
                      partner,
                      "partner"
                    )
                  }
                  disabled={loadingPartner}
                  className="mt-5 w-full rounded-xl bg-[#8b4c9d] px-5 py-3.5 font-bold text-white transition hover:bg-[#713c81] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingPartner
                    ? "상대방 사주 계산 중..."
                    : "상대방 사주 계산"}
                </button>

                {partnerSaju && (
                  <div className="mt-6 border-t border-[#eee2f2] pt-6">
                    <div className="mb-4 flex items-center gap-2 text-sm font-bold text-[#8b4c9d]">
                      <span>✓</span>
                      상대방 사주 계산 완료
                    </div>

                    <FourPillars
                      data={
                        partnerSaju.fourPillars
                      }
                    />

                    <FiveElements
                      data={
                        partnerSaju.fiveElements
                      }
                    />
                  </div>
                )}
              </section>
            )}

            {/* 분석 실행 */}
            <section className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#111827] text-sm font-bold text-white">
                  {isCompatibility
                    ? "4"
                    : "3"}
                </div>

                <h2 className="text-xl font-bold">
                  AI 분석 및 PDF
                </h2>
              </div>

              <div className="rounded-2xl bg-gradient-to-r from-[#111827] to-[#252b3a] p-6 text-white">

                <div className="text-sm font-semibold text-gray-300">
                  선택 상품
                </div>

                <div className="mt-1 text-2xl font-bold">
                  {selectedProduct?.name}
                </div>

                <div className="mt-1 text-sm text-gray-300">
                  {selectedProduct?.price.toLocaleString()}
                  원
                </div>

                {isCompatibility && (
                  <div className="mt-4 rounded-xl bg-white/10 px-4 py-3 text-sm">
                    <div>
                      고객 사주{" "}
                      {customerSaju
                        ? "✓"
                        : "○"}
                    </div>

                    <div className="mt-1">
                      상대방 사주{" "}
                      {partnerSaju
                        ? "✓"
                        : "○"}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAnalysis}
                  disabled={
                    analyzing ||
                    pdfLoading ||
                    !customerSaju ||
                    (isCompatibility &&
                      !partnerSaju)
                  }
                  className="mt-5 w-full rounded-xl bg-white px-5 py-4 font-bold text-[#111827] transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {analyzing
                    ? "AI 분석 중..."
                    : pdfLoading
                    ? "PDF 생성 중..."
                    : isCompatibility &&
                      !partnerSaju
                    ? "두 사람의 사주를 모두 계산해주세요"
                    : !customerSaju
                    ? "고객 사주를 먼저 계산해주세요"
                    : "AI 분석 시작"}
                </button>
              </div>
            </section>

            {/* PDF 완료 */}
            {pdfBlob && (
              <section className="mb-6 rounded-3xl border border-green-200 bg-white p-6 shadow-sm">
                <div className="rounded-2xl bg-green-50 p-5">
                  <div className="text-lg font-bold text-green-700">
                    ✓ 분석 및 PDF 생성 완료
                  </div>

                  <p className="mt-1 text-sm text-green-600">
                    PDF를 다운로드하거나 모바일에서 바로 공유할 수 있습니다.
                  </p>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={downloadPdf}
                    className="rounded-xl bg-[#111827] px-5 py-4 font-bold text-white"
                  >
                    PDF 다운로드
                  </button>

                  <button
                    type="button"
                    onClick={sharePdf}
                    className="rounded-xl bg-[#8b4c9d] px-5 py-4 font-bold text-white"
                  >
                    PDF 공유하기
                  </button>
                </div>
              </section>
            )}

            <button
              type="button"
              onClick={resetAll}
              className="mb-10 w-full rounded-xl border border-gray-200 bg-white px-5 py-3 font-semibold text-gray-600 hover:bg-gray-50"
            >
              처음부터 다시 작성
            </button>
          </>
        )}
      </div>
    </main>
  );
}

function PersonForm({
  title,
  person,
  onChange,
  accent,
}: {
  title: string;
  person: PersonData;
  onChange: (
    field: keyof PersonData,
    value: string
  ) => void;
  accent: string;
}) {
  return (
    <div className="rounded-2xl bg-[#fafafa] p-5">
      <div
        className="mb-4 text-base font-bold"
        style={{ color: accent }}
      >
        {title}
      </div>

      <div className="grid gap-4 md:grid-cols-3">

        <div>
          <label className="mb-2 block text-sm font-semibold">
            생년월일
          </label>

          <input
            type="date"
            value={person.birthDate}
            onChange={(e) =>
              onChange(
                "birthDate",
                e.target.value
              )
            }
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            출생시간
          </label>

          <input
            type="time"
            value={person.birthTime}
            onChange={(e) =>
              onChange(
                "birthTime",
                e.target.value
              )
            }
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            성별
          </label>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                onChange("gender", "남성")
              }
              className={`rounded-xl border px-4 py-3 font-semibold ${
                person.gender === "남성"
                  ? "text-white"
                  : "border-gray-200 bg-white"
              }`}
              style={
                person.gender === "남성"
                  ? {
                      backgroundColor:
                        accent,
                      borderColor:
                        accent,
                    }
                  : undefined
              }
            >
              남성
            </button>

            <button
              type="button"
              onClick={() =>
                onChange("gender", "여성")
              }
              className={`rounded-xl border px-4 py-3 font-semibold ${
                person.gender === "여성"
                  ? "text-white"
                  : "border-gray-200 bg-white"
              }`}
              style={
                person.gender === "여성"
                  ? {
                      backgroundColor:
                        accent,
                      borderColor:
                        accent,
                    }
                  : undefined
              }
            >
              여성
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FourPillars({
  data,
}: {
  data: unknown;
}) {
  const value =
    data as Record<string, unknown> | null;

  const items: Array<[string, string]> = [
    ["년주", String(value?.year ?? "-")],
    ["월주", String(value?.month ?? "-")],
    ["일주", String(value?.day ?? "-")],
    ["시주", String(value?.time ?? "-")],
  ];

  return (
    <div>
      <h3 className="mb-3 text-lg font-bold">
        계산된 사주 원국
      </h3>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {items.map(([label, item]) => (
          <div
            key={label}
            className="rounded-2xl border border-gray-200 bg-white p-5 text-center"
          >
            <div className="text-sm text-gray-500">
              {label}
            </div>

            <div className="mt-3 text-2xl font-bold">
              {item}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FiveElements({
  data,
}: {
  data: unknown;
}) {
  const value =
    data as Record<string, unknown> | null;

  const items: Array<[string, string]> = [
    ["木", String(value?.wood ?? "0")],
    ["火", String(value?.fire ?? "0")],
    ["土", String(value?.earth ?? "0")],
    ["金", String(value?.metal ?? "0")],
    ["水", String(value?.water ?? "0")],
  ];

  return (
    <div className="mt-6">
      <h3 className="mb-3 text-lg font-bold">
        오행
      </h3>

      <div className="grid grid-cols-5 gap-2">
        {items.map(([label, item]) => (
          <div
            key={label}
            className="rounded-2xl border border-gray-200 bg-white p-4 text-center"
          >
            <div className="text-sm text-gray-500">
              {label}
            </div>

            <div className="mt-2 text-xl font-bold">
              {item}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
