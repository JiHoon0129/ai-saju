"use client";

import { useState } from "react";

export default function Home() {
  const [step, setStep] = useState<"home" | "input" | "result">("home");

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
    setAnalysis("");

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
    {
      name: "목(木)",
      value: fiveElements.wood,
      icon: "🌱",
    },
    {
      name: "화(火)",
      value: fiveElements.fire,
      icon: "🔥",
    },
    {
      name: "토(土)",
      value: fiveElements.earth,
      icon: "🏔️",
    },
    {
      name: "금(金)",
      value: fiveElements.metal,
      icon: "⚔️",
    },
    {
      name: "수(水)",
      value: fiveElements.water,
      icon: "💧",
    },
  ];

  const mostElement = [...elements].sort(
    (a, b) => b.value - a.value
  )[0];

  const leastElement = [...elements].sort(
    (a, b) => a.value - b.value
  )[0];

  return (
    <main className="min-h-screen overflow-hidden bg-[#090711] text-white">

      {/* 배경 효과 */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-[-250px] h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-purple-600/10 blur-[120px]" />
        <div className="absolute bottom-[-200px] left-[-100px] h-[400px] w-[400px] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute right-[-150px] top-[35%] h-[350px] w-[350px] rounded-full bg-fuchsia-600/5 blur-[120px]" />
      </div>

      {/* =========================
          첫 화면
      ========================== */}
      {step === "home" && (
        <section className="relative flex min-h-screen items-center justify-center px-5 py-12">

          <div className="w-full max-w-lg text-center">

            {/* 상단 아이콘 */}
            <div className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-3xl border border-purple-300/20 bg-white/[0.06] shadow-2xl shadow-purple-900/20 backdrop-blur-xl">
              <span className="text-4xl">🔮</span>
            </div>

            <p className="mb-3 text-sm font-medium tracking-[0.3em] text-purple-300">
              AI SAJU
            </p>

            <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
              AI 사주
            </h1>

            <p className="mt-5 text-xl font-semibold text-white/90">
              당신의 사주를 AI와 함께 알아보세요
            </p>

            <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-gray-400">
              생년월일과 태어난 시간을 입력하면
              <br />
              사주 원국과 오행을 계산하고
              <br />
              AI가 이해하기 쉽게 분석해드립니다.
            </p>

            {/* 시작 카드 */}
            <div className="mt-10 rounded-[28px] border border-white/10 bg-white/[0.045] p-3 shadow-2xl shadow-black/30 backdrop-blur-xl">

              <button
  onClick={() => setStep("input")}
  className="group w-full rounded-2xl bg-purple-600 px-6 py-5 text-lg font-bold shadow-lg shadow-purple-900/30 transition hover:bg-purple-500"-lg shadow-purple-900/30 transition duration-300 hover:-translate-y-0
              
