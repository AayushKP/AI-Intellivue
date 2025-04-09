"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NextButton from "@/components/Next-Btn";

export default function Page({ params }: { params: { slug?: string } }) {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [questionsArr, setQuestionsArr] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const router = useRouter();

  useEffect(() => {
    const fromParams = params?.slug;
    if (fromParams) {
      setRoomId(fromParams);
    } else {
      const fromStorage = localStorage.getItem("roomId");
      setRoomId(fromStorage);
    }

    const raw = localStorage.getItem("questions");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const cleaned = parsed.questions.replace(/\\n|\\\"}/g, "").trim();
        const arr = cleaned.split("|").map((q: string) => q.trim());
        setQuestionsArr(arr);
      } catch (error) {
        console.error("Error parsing questions:", error);
      }
    }
  }, [params]);

  useEffect(() => {
    if (questionsArr.length === 0) return;

    const utterance = new SpeechSynthesisUtterance(questionsArr[currentIndex]);
    utterance.lang = "en-US"; // or your desired language
    window.speechSynthesis.cancel(); // Stop previous speech
    window.speechSynthesis.speak(utterance);
  }, [currentIndex, questionsArr]);

  const handleNext = () => {
    if (currentIndex < questionsArr.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      router.push("/result");
    }
  };

  return (
    <div className="bg-black text-white h-[100dvh] flex flex-row items-center justify-center text-xl relative">
      <div className="w-1/2 h-full bg-yellow-400 flex justify-center items-center">
        <div className="bg-white w-5/6 p-4 text-black rounded-xl shadow-xl">
          <p className="mb-6">{questionsArr[currentIndex] || "Loading..."}</p>
        </div>
      </div>
      <div className="w-1/2 h-full bg-red-400 flex items-center justify-center">
        Room ID: {roomId || "Not found"}
      </div>
      <div className="absolute bottom-20">
        <NextButton
          onClick={handleNext}
          isLast={currentIndex === questionsArr.length - 1}
        />
      </div>
    </div>
  );
}
