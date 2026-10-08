"use client";

import { useState } from "react";
import type { AdminProduct } from "../../lib/admin-products";
import { ADMIN_PRODUCTS } from "../../lib/admin-products";

type FourPillars = {
  year: string;
  month: string;
  day: string;
  time: string;
};

type FiveElements = {
  wood: number;
  fire: number;
  earth: number;
  metal: number;
  water: number;
};

type PersonData = {
  email: string;
  birthDate: string;
  birthTime: string;
  gender: "남성" | "여성";
};

const TIME_RANGES = [
  "00:00~01:30",
  "01:30~03:30",
  "03:30~05:30",
  "05:30~07:30",
  "07:30~09:30",
  "09:30~11:30",
  "11:30~13:30",
  "13:30~15:30",
  "15:30~17:30",
  "17:30~19:30",
  "19:30~21:30",
  "21:30~22:30",
  "22:30~00:00",
];

const formatPrice = (price: number) =>
  price === 0 ? "무료" : `${price.toLocaleString("ko-KR")}원`;

export default function AdminPage() {
  const [customer, setCustomer] = useState<PersonData>({
    email: "",
    birthDate: "",
    birthTime: "",
    gender: "남성",
  });

  const [selectedProduct, setSelectedProduct] =
    useState<AdminProduct | null>(null);

  const [partner, setPartner] = useState<PersonData>({
    email: "",
    birthDate: "",
    birthTime: "",
    gender: "여성",
  });

  const [result, setResult] = useState("");
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfFileName, setPdfFileName] = useState("ai-saju-result.pdf");

  const [pdfStatus, setPdfStatus] = useState("");

  const [pillars, setPillars] = useState<FourPillars | null>(null);
  const [elements, setElements] = useState<FiveElements | null>(null);

  const [partnerPillars, setPartnerPillars] =
    useState<FourPillars | null>(null);

  const [partnerElements, setPartnerElements] =
    useState<FiveElements | null>(null);

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState("");

  async function calculatePerson(person: PersonData) {
    const response = await fetch("/api/admin-saju", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        birthDate: person.birthDate,
        birthTime: person.birthTime,
        gender: person.gender,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "만세력 계산에 실패했습니다."
      );
    }

    return data as {
      fourPillars: FourPillars;
      fiveElements: FiveElements;
    };
  }

  async function handleCustomerCalculate() {
    setError("");
    setResult("");
    setPdfBlob(null);
    setPdfStatus("");

    if (
      !customer.birthDate ||
      !customer.birthTime
    ) {
      setError(
        "생년월일과 태어난 시간을 모두 입력해주세요."
      );
      return;
    }

    setLoading(true);

    try {
      const data = await calculatePerson(customer);

      setPillars(data.fourPillars);
      setElements(data.fiveElements);

      setStep(2);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "계산 중 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleProductSelect(product: AdminProduct) {
    setError("");
    setResult("");
    setPdfBlob(null);
    setPdfStatus("");
    setSelectedProduct(product);
    setStep(3);
  }

  async function generateResult() {
    if (
      !selectedProduct ||
      !pillars ||
      !elements
    ) {
      setError(
        "상품과 기본 사주 정보가 필요합니다."
      );
      return;
    }

    setError("");
    setResult("");
    setPdfBlob(null);
    setPdfStatus("");
    setLoading(true);

    try {
      let currentPartnerPillars =
        partnerPillars;

      let currentPartnerElements =
        partnerElements;

      if (
        selectedProduct.id ===
        "compatibility"
      ) {
        if (
          !partner.birthDate ||
          !partner.birthTime
        ) {
          throw new Error(
            "궁합 분석은 상대방 생년월일과 태어난 시간을 입력해주세요."
          );
        }

        const partnerData =
          await calculatePerson(partner);

        currentPartnerPillars =
          partnerData.fourPillars;

        currentPartnerElements =
          partnerData.fiveElements;

        setPartnerPillars(
          currentPartnerPillars
        );

        setPartnerElements(
          currentPartnerElements
        );
      }

      setPdfStatus(
        "AI 분석 생성 중..."
      );

      const response = await fetch(
        "/api/test-analysis",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            productId:
              selectedProduct.id,
            customer: {
              birthDate:
                customer.birthDate,
              birthTime:
                customer.birthTime,
              gender:
                customer.gender,
            },
            fourPillars: pillars,
            fiveElements: elements,
            partnerFourPillars:
              currentPartnerPillars,
            partnerFiveElements:
              currentPartnerElements,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "AI 분석 생성에 실패했습니다."
        );
      }

      setResult(data.result);

      setPdfStatus(
        "AI 분석 완료 · PDF 생성 중..."
      );

      const pdfResponse =
        await fetch(
          "/api/admin-pdf",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              result: data.result,
              productName:
                selectedProduct.name,
              birthDate:
                customer.birthDate,
              birthTime:
                customer.birthTime,
              gender:
                customer.gender,
            }),
          }
        );

      if (!pdfResponse.ok) {
        let pdfError =
          "PDF 생성에 실패했습니다.";

        try {
          const pdfData =
            await pdfResponse.json();

          pdfError =
            pdfData.error ||
            pdfError;
        } catch {
          // 기본 오류 메시지 사용
        }

        throw new Error(pdfError);
      }

      const contentType =
        pdfResponse.headers.get(
          "content-type"
        ) || "";

      if (
        !contentType.includes(
          "application/pdf"
        )
      ) {
        throw new Error(
          "PDF 파일 응답을 확인하지 못했습니다."
        );
      }

      const blob =
        await pdfResponse.blob();

      const safeProductName =
        selectedProduct.name
          .replace(/[\\/:*?"<>|]/g, "")
          .trim();

      const fileName =
        `${safeProductName || "ai-saju"}-result.pdf`;

      setPdfBlob(blob);
      setPdfFileName(fileName);

      setPdfStatus(
        "AI 분석 완료 · PDF 생성 완료"
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "분석 생성 중 오류가 발생했습니다."
      );

      setPdfStatus("");
    } finally {
      setLoading(false);
    }
  }

  function downloadPdf() {
    if (!pdfBlob) {
      setError(
        "먼저 PDF를 생성해주세요."
      );
      return;
    }

    const url =
      URL.createObjectURL(pdfBlob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download = pdfFileName;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);

    setPdfStatus(
      "PDF 파일 저장을 시작했습니다."
    );
  }

  async function sharePdf() {
    if (!pdfBlob) {
      setError(
        "먼저 PDF를 생성해주세요."
      );
      return;
    }

    try {
      const file =
        new File(
          [pdfBlob],
          pdfFileName,
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
          title:
            "AI 사주 분석 결과",
          text:
            "AI 사주 분석 결과 PDF입니다.",
          files: [file],
        });

        setPdfStatus(
          "PDF 공유를 완료했습니다."
        );

        return;
      }

      downloadPdf();

      setPdfStatus(
        "이 기기에서는 파일 공유를 지원하지 않아 PDF를 저장했습니다."
      );
    } catch (e) {
      if (
        e instanceof DOMException &&
        e.name === "AbortError"
      ) {
        return;
      }

      setError(
        "PDF 공유에 실패했습니다. PDF 저장 버튼을 이용해주세요."
      );
    }
  }

  function resetAll() {
    setCustomer({
      email: "",
      birthDate: "",
      birthTime: "",
      gender: "남성",
    });

    setSelectedProduct(null);

    setPartner({
      email: "",
      birthDate: "",
      birthTime: "",
      gender: "여성",
    });

    setPillars(null);
    setElements(null);
    setPartnerPillars(null);
    setPartnerElements(null);

    setResult("");
    setPdfBlob(null);
    setPdfFileName(
      "ai-saju-result.pdf"
    );

    setPdfStatus("");
    setError("");
    setStep(1);
  }

  return (
    <>
      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        button,
        input,
        select {
          font: inherit;
        }

        button {
          -webkit-tap-highlight-color: transparent;
        }

        .admin-page {
          min-height: 100vh;
          background: #f6f7fb;
          padding: 32px 16px 80px;
          color: #171717;
        }

        .admin-container {
          width: 100%;
          max-width: 980px;
          margin: 0 auto;
        }

        .header {
          background: #111827;
          color: #fff;
          border-radius: 20px;
          padding: 28px;
          margin-bottom: 20px;
        }

        .header-title {
          margin: 8px 0;
          font-size: 30px;
        }

        .header-description {
          margin: 0;
          opacity: 0.8;
          line-height: 1.6;
        }

        .card {
          background: #fff;
          border-radius: 18px;
          padding: 24px;
          box-shadow:
            0 5px 20px rgba(0, 0, 0, 0.05);
          margin-bottom: 20px;
        }

        .grid {
          display: grid;
          grid-template-columns:
            repeat(
              auto-fit,
              minmax(220px, 1fr)
            );
          gap: 14px;
          margin-bottom: 20px;
        }

        .input {
          width: 100%;
          padding: 13px;
          margin-top: 7px;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          background: #fff;
          font-size: 16px;
          min-height: 48px;
        }

        .button-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .primary-button,
        .secondary-button,
        .share-button {
          border-radius: 11px;
          padding: 14px 18px;
          font-weight: 900;
          cursor: pointer;
          min-height: 48px;
        }

        .primary-button {
          border: 0;
          background: #111827;
          color: #fff;
        }

        .secondary-button {
          border: 1px solid #d1d5db;
          background: #fff;
          color: #111827;
        }

        .share-button {
          border: 0;
          background: #2563eb;
          color: #fff;
        }

        .primary-button:disabled,
        .secondary-button:disabled,
        .share-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pillar-grid {
          display: grid;
          grid-template-columns:
            repeat(4, 1fr);
          gap: 12px;
        }

        .element-grid {
          display: grid;
          grid-template-columns:
            repeat(5, 1fr);
          gap: 12px;
        }

        .product-grid {
          display: grid;
          grid-template-columns:
            repeat(
              auto-fit,
              minmax(240px, 1fr)
            );
          gap: 12px;
        }

        .product-button {
          text-align: left;
          background: #fff;
          border-radius: 14px;
          padding: 18px;
          cursor: pointer;
          border: 1px solid #e5e7eb;
        }

        .status-box {
          margin-top: 20px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #166534;
          border-radius: 14px;
          padding: 18px;
          font-weight: 800;
          line-height: 1.7;
        }

        .pdf-box {
          margin-top: 16px;
          padding: 18px;
          border-radius: 14px;
          border: 1px solid #dbeafe;
          background: #eff6ff;
        }

        .error {
          background: #fff1f2;
          border: 1px solid #fecdd3;
          color: #be123c;
          padding: 14px;
          border-radius: 12px;
          margin-bottom: 16px;
          font-weight: 700;
        }

        @media (max-width: 700px) {
          .admin-page {
            padding:
              12px
              10px
              40px;
          }

          .header {
            padding: 20px 16px;
            border-radius: 16px;
          }

          .header-title {
            font-size: 23px;
          }

          .header-description {
            font-size: 14px;
          }

          .card {
            padding: 17px 14px;
            border-radius: 15px;
          }

          .pillar-grid {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .element-grid {
            grid-template-columns:
              repeat(5, 1fr);
            gap: 5px;
          }

          .element-grid > div {
            padding: 9px 4px !important;
          }

          .element-grid > div > div:last-child {
            font-size: 17px !important;
          }

          .product-grid {
            grid-template-columns: 1fr;
          }

          .button-row {
            flex-direction: column;
          }

          .primary-button,
          .secondary-button,
          .share-button {
            width: 100%;
          }

          .input {
            min-height: 50px;
            font-size: 16px;
          }

          h2 {
            font-size: 20px !important;
          }
        }
      `}</style>

      <main className="admin-page">
        <div className="admin-container">
          <header className="header">
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: 1,
              }}
            >
              ADMIN
            </div>

            <h1 className="header-title">
              사주 관리자 분석실
            </h1>

            <p className="header-description">
              고객 정보를 입력하고 상품을 선택한 뒤
              분석 결과 PDF를 생성합니다.
            </p>

            <div
              style={{
                marginTop: 16,
                display: "inline-block",
                padding: "7px 12px",
                borderRadius: 999,
                background: "#fff",
                color: "#111827",
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              관리자 전용 · PDF 직접 저장/공유
            </div>
          </header>

          {error && (
            <div className="error">
              {error}
            </div>
          )}

          {step === 1 && (
            <section className="card">
              <StepTitle
                number="1"
                title="고객 기본 정보"
              />

              <div className="grid">
                <label>
                  고객 이메일
                  <span
                    style={{
                      display: "block",
                      color: "#9ca3af",
                      fontSize: 12,
                      marginTop: 4,
                    }}
                  >
                    선택 입력 · PDF 발송은 직접 진행
                  </span>

                  <input
                    className="input"
                    type="email"
                    value={customer.email}
                    onChange={(e) =>
                      setCustomer({
                        ...customer,
                        email: e.target.value,
                      })
                    }
                    placeholder="customer@example.com"
                  />
                </label>

                <label>
                  생년월일

                  <input
                    className="input"
                    type="date"
                    value={customer.birthDate}
                    onChange={(e) =>
                      setCustomer({
                        ...customer,
                        birthDate: e.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  태어난 시간

                  <select
                    className="input"
                    value={customer.birthTime}
                    onChange={(e) =>
                      setCustomer({
                        ...customer,
                        birthTime: e.target.value,
                      })
                    }
                  >
                    <option value="">
                      시간 선택
                    </option>

                    {TIME_RANGES.map(
                      (time) => (
                        <option
                          key={time}
                          value={time}
                        >
                          {time}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label>
                  성별

                  <select
                    className="input"
                    value={customer.gender}
                    onChange={(e) =>
                      setCustomer({
                        ...customer,
                        gender:
                          e.target.value as
                            | "남성"
                            | "여성",
                      })
                    }
                  >
                    <option value="남성">
                      남성
                    </option>
                    <option value="여성">
                      여성
                    </option>
                  </select>
                </label>
              </div>

              <button
                className="primary-button"
                onClick={
                  handleCustomerCalculate
                }
                disabled={loading}
              >
                {loading
                  ? "만세력 계산 중..."
                  : "다음 → 만세력 계산"}
              </button>
            </section>
          )}

          {step >= 2 &&
            pillars &&
            elements && (
              <section className="card">
                <StepTitle
                  number="2"
                  title="계산된 사주 원국"
                />

                <div className="pillar-grid">
                  <InfoBox
                    title="년주"
                    value={pillars.year}
                  />
                  <InfoBox
                    title="월주"
                    value={pillars.month}
                  />
                  <InfoBox
                    title="일주"
                    value={pillars.day}
                  />
                  <InfoBox
                    title="시주"
                    value={pillars.time}
                  />
                </div>

                <div
                  style={{
                    marginTop: 18,
                  }}
                >
                  <strong>오행</strong>

                  <div
                    className="element-grid"
                    style={{
                      marginTop: 10,
                    }}
                  >
                    <InfoBox
                      title="木"
                      value={`${elements.wood}`}
                    />
                    <InfoBox
                      title="火"
                      value={`${elements.fire}`}
                    />
                    <InfoBox
                      title="土"
                      value={`${elements.earth}`}
                    />
                    <InfoBox
                      title="金"
                      value={`${elements.metal}`}
                    />
                    <InfoBox
                      title="水"
                      value={`${elements.water}`}
                    />
                  </div>
                </div>

                {step === 2 && (
                  <div
                    style={{
                      marginTop: 22,
                    }}
                  >
                    <h2
                      style={{
                        fontSize: 20,
                        marginBottom: 12,
                      }}
                    >
                      3. 분석 상품 선택
                    </h2>

                    <div className="product-grid">
                      {ADMIN_PRODUCTS.map(
                        (product) => (
                          <button
                            key={
                              product.id
                            }
                            onClick={() =>
                              handleProductSelect(
                                product
                              )
                            }
                            className="product-button"
                            style={{
                              border:
                                selectedProduct?.id ===
                                product.id
                                  ? "2px solid #111827"
                                  : "1px solid #e5e7eb",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 18,
                                fontWeight: 900,
                              }}
                            >
                              {
                                product.name
                              }
                            </div>

                            <div
                              style={{
                                fontSize: 22,
                                fontWeight: 900,
                                margin:
                                  "8px 0",
                              }}
                            >
                              {formatPrice(
                                product.price
                              )}
                            </div>

                            <div
                              style={{
                                fontSize: 13,
                                color:
                                  "#6b7280",
                                lineHeight:
                                  1.5,
                              }}
                            >
                              {
                                product.description
                              }
                            </div>
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}
              </section>
            )}

          {step === 3 &&
            selectedProduct && (
              <section className="card">
                <StepTitle
                  number="3"
                  title="선택 상품 분석"
                />

                <div
                  style={{
                    padding: 18,
                    borderRadius: 14,
                    background: "#f3f4f6",
                    marginBottom: 18,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 900,
                      fontSize: 20,
                    }}
                  >
                    {
                      selectedProduct.name
                    }
                  </div>

                  <div
                    style={{
                      fontWeight: 800,
                      marginTop: 4,
                    }}
                  >
                    {formatPrice(
                      selectedProduct.price
                    )}
                  </div>

                  <div
                    style={{
                      color: "#6b7280",
                      marginTop: 6,
                    }}
                  >
                    {
                      selectedProduct.description
                    }
                  </div>
                </div>

                {selectedProduct.id ===
                  "compatibility" && (
                  <div
                    style={{
                      padding: 18,
                      border:
                        "1px solid #e5e7eb",
                      borderRadius: 14,
                      marginBottom: 18,
                    }}
                  >
                    <h3
                      style={{
                        marginTop: 0,
                      }}
                    >
                      상대방 정보
                    </h3>

                    <div className="grid">
                      <label>
                        상대방 이메일
                        <span
                          style={{
                            display:
                              "block",
                            color:
                              "#9ca3af",
                            fontSize: 12,
                            marginTop: 4,
                          }}
                        >
                          선택 입력
                        </span>

                        <input
                          className="input"
                          type="email"
                          value={
                            partner.email
                          }
                          onChange={(e) =>
                            setPartner({
                              ...partner,
                              email:
                                e.target
                                  .value,
                            })
                          }
                        />
                      </label>

                      <label>
                        상대방 생년월일

                        <input
                          className="input"
                          type="date"
                          value={
                            partner.birthDate
                          }
                          onChange={(e) =>
                            setPartner({
                              ...partner,
                              birthDate:
                                e.target
                                  .value,
                            })
                          }
                        />
                      </label>

                      <label>
                        상대방 태어난 시간

                        <select
                          className="input"
                          value={
                            partner.birthTime
                          }
                          onChange={(e) =>
                            setPartner({
                              ...partner,
                              birthTime:
                                e.target
                                  .value,
                            })
                          }
                        >
                          <option value="">
                            시간 선택
                          </option>

                          {TIME_RANGES.map(
                            (time) => (
                              <option
                                key={time}
                                value={
                                  time
                                }
                              >
                                {time}
                              </option>
                            )
                          )}
                        </select>
                      </label>

                      <label>
                        상대방 성별

                        <select
                          className="input"
                          value={
                            partner.gender
                          }
                          onChange={(e) =>
                            setPartner({
                              ...partner,
                              gender:
                                e.target
                                  .value as
                                  | "남성"
                                  | "여성",
                            })
                          }
                        >
                          <option value="남성">
                            남성
                          </option>
                          <option value="여성">
                            여성
                          </option>
                        </select>
                      </label>
                    </div>
                  </div>
                )}

                <div className="button-row">
                  <button
                    className="secondary-button"
                    onClick={() => {
                      setStep(2);
                      setResult("");
                      setPdfBlob(null);
                      setPdfStatus("");
                      setError("");
                    }}
                  >
                    상품 다시 선택
                  </button>

                  <button
                    className="primary-button"
                    onClick={generateResult}
                    disabled={loading}
                  >
                    {loading
                      ? "분석 생성 중..."
                      : "AI 분석 + PDF 생성"}
                  </button>

                  <button
                    className="secondary-button"
                    onClick={resetAll}
                  >
                    처음부터
                  </button>
                </div>

                {result && (
                  <div
                    style={{
                      marginTop: 24,
                      borderTop:
                        "1px solid #e5e7eb",
                      paddingTop: 24,
                    }}
                  >
                    <h2
                      style={{
                        fontSize: 22,
                      }}
                    >
                      처리 상태
                    </h2>

                    <div className="status-box">
                      {pdfStatus ||
                        "AI 분석이 완료되었습니다."}
                    </div>

                    {pdfBlob && (
                      <div className="pdf-box">
                        <div
                          style={{
                            fontWeight: 900,
                            fontSize: 17,
                          }}
                        >
                          PDF 준비 완료
                        </div>

                        <div
                          style={{
                            marginTop: 6,
                            color:
                              "#6b7280",
                            fontSize: 13,
                            wordBreak:
                              "break-all",
                          }}
                        >
                          {
                            pdfFileName
                          }
                        </div>

                        <div
                          className="button-row"
                          style={{
                            marginTop: 14,
                          }}
                        >
                          <button
                            className="primary-button"
                            onClick={
                              downloadPdf
                            }
                          >
                            📥 PDF 저장
                          </button>

                          <button
                            className="share-button"
                            onClick={
                              sharePdf
                            }
                          >
                            📤 PDF 공유
                          </button>
                        </div>

                        <p
                          style={{
                            margin:
                              "12px 0 0",
                            color:
                              "#6b7280",
                            fontSize: 13,
                            lineHeight:
                              1.6,
                          }}
                        >
                          모바일에서는
                          <strong>
                            PDF 공유
                          </strong>
                          를 누르면 휴대폰의
                          공유 화면에서
                          카카오톡, 메일,
                          파일 저장 등을
                          선택할 수 있습니다.
                        </p>
                      </div>
                    )}

                    <p
                      style={{
                        margin:
                          "12px 0 0",
                        color:
                          "#6b7280",
                        fontSize: 13,
                      }}
                    >
                      분석 전문은 관리자
                      화면에 표시하지 않고
                      PDF 파일로 처리합니다.
                    </p>
                  </div>
                )}
              </section>
            )}
        </div>
      </main>
    </>
  );
}

function StepTitle({
  number,
  title,
}: {
  number: string;
  title: string;
}) {
  return (
    <h2
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginTop: 0,
      }}
    >
      <span
        style={{
          width: 32,
          height: 32,
          flexShrink: 0,
          borderRadius: "50%",
          background: "#111827",
          color: "#fff",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
        }}
      >
        {number}
      </span>

      {title}
    </h2>
  );
}

function InfoBox({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div
      style={{
        background: "#f9fafb",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 14,
        textAlign: "center",
      }}
    >
      <div
        style={{
          color: "#6b7280",
          fontSize: 12,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 20,
          fontWeight: 900,
          marginTop: 4,
        }}
      >
        {value}
      </div>
    </div>
  );
}
