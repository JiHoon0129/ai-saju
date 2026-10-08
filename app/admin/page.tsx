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

type DeliveryMethod = "email" | "kakao" | "both";

type PersonData = {
  email: string;
  birthDate: string;
  birthTime: string;
  gender: "남성" | "여성";
  fourPillars?: FourPillars;
  fiveElements?: FiveElements;
};

const TIME_RANGES = [
  "00:00~01:30", "01:30~03:30", "03:30~05:30", "05:30~07:30",
  "07:30~09:30", "09:30~11:30", "11:30~13:30", "13:30~15:30",
  "15:30~17:30", "17:30~19:30", "19:30~21:30", "21:30~22:30",
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

  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("email");
  const [kakaoContact, setKakaoContact] = useState("");
  const [partner, setPartner] = useState<PersonData>({
    email: "",
    birthDate: "",
    birthTime: "",
    gender: "여성",
  });

  const [result, setResult] = useState("");
  const [pillars, setPillars] = useState<FourPillars | null>(null);
  const [elements, setElements] = useState<FiveElements | null>(null);
  const [partnerPillars, setPartnerPillars] = useState<FourPillars | null>(null);
  const [partnerElements, setPartnerElements] = useState<FiveElements | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState("");

  async function calculatePerson(person: PersonData) {
    const response = await fetch("/api/admin-saju", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        birthDate: person.birthDate,
        birthTime: person.birthTime,
        gender: person.gender,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "만세력 계산에 실패했습니다.");
    }

    return data as {
      fourPillars: FourPillars;
      fiveElements: FiveElements;
    };
  }

  async function handleCustomerCalculate() {
    setError("");
    setResult("");

    if (!customer.birthDate || !customer.birthTime) {
      setError("생년월일과 태어난 시간을 모두 입력해주세요.");
      return;
    }

    if ((deliveryMethod === "email" || deliveryMethod === "both") && !customer.email) {
      setError("이메일 주소를 입력해주세요.");
      return;
    }

    if ((deliveryMethod === "kakao" || deliveryMethod === "both") && !kakaoContact) {
      setError("카카오톡 수신 정보를 입력해주세요.");
      return;
    }

    setLoading(true);

    try {
      const data = await calculatePerson(customer);
      setPillars(data.fourPillars);
      setElements(data.fiveElements);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "계산 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleProductSelect(product: AdminProduct) {
    setError("");
    setResult("");
    setSelectedProduct(product);

    if (product.id !== "compatibility") {
      setStep(3);
      return;
    }

    setStep(3);
  }

  async function generateResult() {
    if (!selectedProduct || !pillars || !elements) {
      setError("상품과 기본 사주 정보가 필요합니다.");
      return;
    }

    setError("");
    setResult("");
    setLoading(true);

    try {
      let currentPartnerPillars = partnerPillars;
      let currentPartnerElements = partnerElements;

      if (selectedProduct.id === "compatibility") {
        if (!partner.birthDate || !partner.birthTime) {
          throw new Error("궁합 분석은 상대방 생년월일과 태어난 시간을 입력해주세요.");
        }

        const partnerData = await calculatePerson(partner);
        currentPartnerPillars = partnerData.fourPillars;
        currentPartnerElements = partnerData.fiveElements;
        setPartnerPillars(currentPartnerPillars);
        setPartnerElements(currentPartnerElements);
      }

      const response = await fetch("/api/test-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct.id,
          customer: {
            birthDate: customer.birthDate,
            birthTime: customer.birthTime,
            gender: customer.gender,
          },
          fourPillars: pillars,
          fiveElements: elements,
          partnerFourPillars: currentPartnerPillars,
          partnerFiveElements: currentPartnerElements,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "AI 분석 생성에 실패했습니다.");
      }

      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "분석 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
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
    setDeliveryMethod("email");
    setKakaoContact("");
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
    setError("");
    setStep(1);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f6f7fb",
        padding: "32px 16px 80px",
        color: "#171717",
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <header
          style={{
            background: "#111827",
            color: "#fff",
            borderRadius: 20,
            padding: 28,
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1 }}>
            ADMIN TEST MODE
          </div>
          <h1 style={{ margin: "8px 0", fontSize: 30 }}>사주 관리자 분석실</h1>
          <p style={{ margin: 0, opacity: 0.8 }}>
            고객 정보를 입력하고 상품을 선택한 뒤 해당 상품의 테스트 결과만 생성합니다.
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
            토스 결제 없음 · 관리자 테스트 전용
          </div>
        </header>

        {error && (
          <div
            style={{
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              color: "#be123c",
              padding: 14,
              borderRadius: 12,
              marginBottom: 16,
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        )}

        {step === 1 && (
          <section style={cardStyle}>
            <StepTitle number="1" title="고객 기본 정보 및 결과 수신 방법" />
            <div style={gridStyle}>
              <label style={{ gridColumn: "1 / -1" }}>
                결과 받을 방법
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginTop: 7 }}>
                  {([
                    ["email", "📧 이메일"],
                    ["kakao", "💬 카카오톡"],
                    ["both", "📧 + 💬 둘 다"],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDeliveryMethod(value)}
                      style={{
                        ...secondaryButton,
                        border: deliveryMethod === value ? "2px solid #111827" : "1px solid #d1d5db",
                        background: deliveryMethod === value ? "#f3f4f6" : "#fff",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </label>

              {(deliveryMethod === "email" || deliveryMethod === "both") && (
                <label>
                  결과 받을 이메일
                  <input
                    style={inputStyle}
                    type="email"
                    value={customer.email}
                    onChange={(e) =>
                      setCustomer({ ...customer, email: e.target.value })
                    }
                    placeholder="customer@example.com"
                  />
                </label>
              )}

              {(deliveryMethod === "kakao" || deliveryMethod === "both") && (
                <label>
                  카카오톡 수신 정보
                  <input
                    style={inputStyle}
                    type="text"
                    value={kakaoContact}
                    onChange={(e) => setKakaoContact(e.target.value)}
                    placeholder="카카오톡 수신 정보"
                  />
                </label>
              )}

              <label>
                생년월일
                <input
                  style={inputStyle}
                  type="date"
                  value={customer.birthDate}
                  onChange={(e) =>
                    setCustomer({ ...customer, birthDate: e.target.value })
                  }
                />
              </label>

              <label>
                태어난 시간
                <select
                  style={inputStyle}
                  value={customer.birthTime}
                  onChange={(e) =>
                    setCustomer({ ...customer, birthTime: e.target.value })
                  }
                >
                  <option value="">시간 선택</option>
                  {TIME_RANGES.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                성별
                <select
                  style={inputStyle}
                  value={customer.gender}
                  onChange={(e) =>
                    setCustomer({
                      ...customer,
                      gender: e.target.value as "남성" | "여성",
                    })
                  }
                >
                  <option value="남성">남성</option>
                  <option value="여성">여성</option>
                </select>
              </label>
            </div>

            <button style={primaryButton} onClick={handleCustomerCalculate} disabled={loading}>
              {loading ? "만세력 계산 중..." : "다음 → 만세력 계산"}
            </button>
          </section>
        )}

        {step >= 2 && pillars && elements && (
          <section style={cardStyle}>
            <StepTitle number="2" title="계산된 사주 원국" />
            <div style={pillarGrid}>
              <InfoBox title="년주" value={pillars.year} />
              <InfoBox title="월주" value={pillars.month} />
              <InfoBox title="일주" value={pillars.day} />
              <InfoBox title="시주" value={pillars.time} />
            </div>

            <div style={{ marginTop: 16 }}>
              <strong>오행</strong>
              <div style={elementGrid}>
                <InfoBox title="木" value={`${elements.wood}`} />
                <InfoBox title="火" value={`${elements.fire}`} />
                <InfoBox title="土" value={`${elements.earth}`} />
                <InfoBox title="金" value={`${elements.metal}`} />
                <InfoBox title="水" value={`${elements.water}`} />
              </div>
            </div>

            {step === 2 && (
              <div style={{ marginTop: 20 }}>
                <h2 style={{ fontSize: 20, marginBottom: 12 }}>
                  3. 분석 상품 선택
                </h2>

                <div style={productGrid}>
                  {ADMIN_PRODUCTS.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleProductSelect(product)}
                      style={{
                        ...productButton,
                        border:
                          selectedProduct?.id === product.id
                            ? "2px solid #111827"
                            : "1px solid #e5e7eb",
                      }}
                    >
                      <div style={{ fontSize: 18, fontWeight: 900 }}>
                        {product.name}
                      </div>
                      <div
                        style={{
                          fontSize: 22,
                          fontWeight: 900,
                          margin: "8px 0",
                        }}
                      >
                        {formatPrice(product.price)}
                      </div>
                      <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>
                        {product.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {step === 3 && selectedProduct && (
          <section style={cardStyle}>
            <StepTitle number="3" title="선택 상품 테스트 분석" />

            <div
              style={{
                padding: 18,
                borderRadius: 14,
                background: "#f3f4f6",
                marginBottom: 18,
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 20 }}>
                {selectedProduct.name}
              </div>
              <div style={{ fontWeight: 800, marginTop: 4 }}>
                {formatPrice(selectedProduct.price)}
              </div>
              <div style={{ color: "#6b7280", marginTop: 6 }}>
                {selectedProduct.description}
              </div>
            </div>

            {selectedProduct.id === "compatibility" && (
              <div
                style={{
                  padding: 18,
                  border: "1px solid #e5e7eb",
                  borderRadius: 14,
                  marginBottom: 18,
                }}
              >
                <h3 style={{ marginTop: 0 }}>상대방 정보</h3>
                <div style={gridStyle}>
                  <label>
                    상대방 이메일(선택)
                    <input
                      style={inputStyle}
                      type="email"
                      value={partner.email}
                      onChange={(e) =>
                        setPartner({ ...partner, email: e.target.value })
                      }
                    />
                  </label>

                  <label>
                    상대방 생년월일
                    <input
                      style={inputStyle}
                      type="date"
                      value={partner.birthDate}
                      onChange={(e) =>
                        setPartner({ ...partner, birthDate: e.target.value })
                      }
                    />
                  </label>

                  <label>
                    상대방 태어난 시간
                    <select
                      style={inputStyle}
                      value={partner.birthTime}
                      onChange={(e) =>
                        setPartner({ ...partner, birthTime: e.target.value })
                      }
                    >
                      <option value="">시간 선택</option>
                      {TIME_RANGES.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    상대방 성별
                    <select
                      style={inputStyle}
                      value={partner.gender}
                      onChange={(e) =>
                        setPartner({
                          ...partner,
                          gender: e.target.value as "남성" | "여성",
                        })
                      }
                    >
                      <option value="남성">남성</option>
                      <option value="여성">여성</option>
                    </select>
                  </label>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                style={secondaryButton}
                onClick={() => {
                  setStep(2);
                  setResult("");
                  setError("");
                }}
              >
                상품 다시 선택
              </button>

              <button style={primaryButton} onClick={generateResult} disabled={loading}>
                {loading ? "선택 상품 분석 생성 중..." : "선택 상품 테스트 분석 생성"}
              </button>

              <button style={secondaryButton} onClick={resetAll}>
                처음부터
              </button>
            </div>

            {result && (
              <div
                style={{
                  marginTop: 24,
                  borderTop: "1px solid #e5e7eb",
                  paddingTop: 24,
                }}
              >
                <h2 style={{ fontSize: 22 }}>분석 결과</h2>
                <div
                  style={{
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.8,
                    background: "#fafafa",
                    border: "1px solid #e5e7eb",
                    borderRadius: 14,
                    padding: 20,
                  }}
                >
                  {result}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function StepTitle({ number, title }: { number: string; title: string }) {
  return (
    <h2 style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 0 }}>
      <span
        style={{
          width: 32,
          height: 32,
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

function InfoBox({ title, value }: { title: string; value: string }) {
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
      <div style={{ color: "#6b7280", fontSize: 12 }}>{title}</div>
      <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>{value}</div>
    </div>
  );
}

const pillarGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 12,
};

const elementGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(5, 1fr)",
  gap: 12,
};

const cardStyle = {
  background: "#fff",
  borderRadius: 18,
  padding: 24,
  boxShadow: "0 5px 20px rgba(0,0,0,0.05)",
  marginBottom: 20,
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
  marginBottom: 20,
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "12px 13px",
  marginTop: 7,
  border: "1px solid #d1d5db",
  borderRadius: 10,
  fontSize: 15,
  background: "#fff",
};

const primaryButton = {
  border: 0,
  borderRadius: 10,
  background: "#111827",
  color: "#fff",
  padding: "13px 18px",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryButton = {
  border: "1px solid #d1d5db",
  borderRadius: 10,
  background: "#fff",
  color: "#111827",
  padding: "13px 18px",
  fontWeight: 800,
  cursor: "pointer",
};

const productGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 12,
};

const productButton = {
  textAlign: "left" as const,
  background: "#fff",
  borderRadius: 14,
  padding: 18,
  cursor: "pointer",
};
