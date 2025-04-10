"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NextButton from "@/components/Next-Btn";

export default function Page({ params }: { params: { slug?: string } }) {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [questionsArr, setQuestionsArr] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userResponse, setUserResponse] = useState<string>("");
  const [responses, setResponses] = useState<
    { question: string; answer: string }[]
  >([]);

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

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech Recognition not supported in your browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        transcript += event.results[i][0].transcript;
      }
      setUserResponse(transcript);
    };

    recognition.onerror = (event: SpeechRecognitionEvent) => {
      console.error("Speech recognition error", event.error);
    };

    recognition.start();
  };

  useEffect(() => {
    if (questionsArr.length === 0) return;

    const utterance = new SpeechSynthesisUtterance(questionsArr[currentIndex]);
    utterance.lang = "en-US";

    utterance.onend = () => {
      startListening();
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [currentIndex, questionsArr]);

  const handleNext = async () => {
    const currentQuestion = questionsArr[currentIndex];

    if (currentQuestion) {
      const updated = [
        ...responses,
        { question: currentQuestion, answer: userResponse || "(No answer)" },
      ];
      setResponses(updated);

      setUserResponse("");

      if (currentIndex < questionsArr.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        localStorage.setItem("responses", JSON.stringify(updated));

        try {
          await fetch("/api/response", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              roomId,
              responses: updated,
            }),
          });
        } catch (err) {
          console.error("Error sending responses:", err);
        }

        router.push("/result");
      }
    }
  };

  return (
    <div className="bg-black text-white h-[100dvh] flex flex-row items-center justify-center text-xl relative">
      <div className="w-1/2 h-full bg-yellow-400 flex justify-center items-center">
        <div className="bg-white w-5/6 p-4 text-black rounded-xl shadow-xl">
          <p className="mb-6">{questionsArr[currentIndex] || "Loading..."}</p>
        </div>
      </div>
      <div className="w-1/2 h-full bg-red-400 flex flex-col items-center justify-center gap-6">
        <div>Room ID: {roomId || "Not found"}</div>
        <p className="bg-white text-black p-4 rounded-xl shadow-lg w-full max-w-md">
          {userResponse || "Listening..."}
        </p>
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
