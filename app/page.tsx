
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

                    const pendingOrder = {
                      orderId,
                      amount: 9900,
                      birthDate,
                      birthTime,
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
                    setStep("checkout");
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
