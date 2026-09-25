"use client";

import { useEffect, useState } from "react";

export default function PaymentSuccessPage() {
  const [message, setMessage] = useState("결제를 확인하고 있습니다...");

  useEffect(() => {
    const processPayment = async () => {
      try {
        const params = new URLSearchParams(window.location.search);

        const paymentKey = params.get("paymentKey");
        const orderId = params.get("orderId");
        const amount = Number(params.get("amount"));

        if (!paymentKey || !orderId || !amount) {
          throw new Error("결제 결과 정보가 올바르지 않습니다.");
        }

        // 결제 진행 당시 저장해 둔 주문 정보
        const saved = sessionStorage.getItem("saju_payment_order");
        const order = saved ? JSON.parse(saved) : null;

        if (
          !order ||
          order.orderId !== orderId ||
          order.amount !== amount
        ) {
          throw new Error("주문 정보 검증에 실패했습니다.");
        }

        // 이미 이 주문을 처리했다면 다시 승인하지 않음
        const completedKey = `saju_payment_completed_${orderId}`;
        const savedResult = sessionStorage.getItem(completedKey);

        if (savedResult) {
          window.location.replace("/");
          return;
        }

        setMessage("결제 승인을 확인하고 있습니다...");

        // 토스 결제 승인
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

        setMessage("결제가 확인되었습니다. 상세 사주를 생성하고 있습니다...");

        // 유료 사주 생성
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
            premiumData.error ||
              "상세 사주 분석 생성에 실패했습니다."
          );
        }

        // 유료 결과 저장
        sessionStorage.setItem(
          completedKey,
          JSON.stringify({
            paymentKey,
            orderId,
            amount,
            result: premiumData.result || "",
            birthDate: order.birthDate,
            birthTime: order.birthTime,
            gender: order.gender,
          })
        );

        // 기존 주문 정보는 삭제
        sessionStorage.removeItem("saju_payment_order");

        // 메인 화면으로 이동
        window.location.replace("/");

      } catch (error) {
        console.error("Payment success processing error:", error);

        setMessage(
          error instanceof Error
            ? error.message
            : "결제 처리 중 오류가 발생했습니다."
        );
      }
    };

    void processPayment();
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        textAlign: "center",
      }}
    >
      <div>
        <h1 style={{ marginBottom: "16px" }}>
          결제 처리 중
        </h1>

        <p>{message}</p>
      </div>
    </main>
  );
}
