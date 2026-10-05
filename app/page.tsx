"use client";

import { useEffect, useRef, useState } from "react";

const PREMIUM_RESULT_STORAGE_KEY = "ai_saju_premium_result_v1";
const PENDING_PAYMENT_STORAGE_KEY = "ai_saju_pending_payment_v1";
const INITIALIZING_MESSAGE = "AI 사주 결과를 준비하고 있습니다...";

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
  const [legalPage, setLegalPage] = useState<"terms" | "privacy" | "refund" | "business">("terms");

  const [birthDate, setBirthDate] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);
  const [birthTime, setBirthTime] = useState("");
  const [gender, setGender] = useState<"남성" | "여성" | "">("");

  const birthDateInputRef = useRef<HTMLInputElement>(null);
  const birthTimeInputRef = useRef<HTMLInputElement>(null);

  const openBirthDatePicker = () => {
    const input = birthDateInputRef.current as
      | (HTMLInputElement & { showPicker?: () => void })
      | null;
    input?.showPicker?.();
  };

  const openBirthTimePicker = () => {
    const input = birthTimeInputRef.current as
      | (HTMLInputElement & { showPicker?: () => void })
      | null;
    input?.showPicker?.();
  };

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
