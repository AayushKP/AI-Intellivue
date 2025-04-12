"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import NextButton from "@/components/Next-Btn";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface Response {
  question: string;
  answer: string;
}

const LANGUAGE_CODE = "en-US";
const DEFAULT_QUESTION_TIME = 120;

export default function Page(promiseParams: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(promiseParams.params);
  const router = useRouter();

  const [isClient, setIsClient] = useState(false);
  const [questionsArr, setQuestionsArr] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Response[]>([]);
  const [editableTranscript, setEditableTranscript] = useState("");
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_QUESTION_TIME);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef("");
  const recognitionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const initializedRef = useRef(false);
  const isMountedRef = useRef(true);
  const isHandlingNext = useRef(false);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const enterFullScreen = async () => {
    const el = document.documentElement;
    if (document.fullscreenElement || !isMountedRef.current) return;
    const req = el.requestFullscreen || (el as any).webkitRequestFullscreen;
    if (req) {
      await req.call(el);
      setIsFullscreen(true);
    }
  };

  const exitFullScreen = async () => {
    if (!document.fullscreenElement || !isMountedRef.current) return;
    const exit =
      document.exitFullscreen || (document as any).webkitExitFullscreen;
    if (exit) {
      await exit.call(document);
      setIsFullscreen(false);
    }
  };

  const stopMediaStream = () => {
    if (!mediaStream || !isMountedRef.current) return;
    mediaStream.getTracks().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setMediaStream(null);
  };

  const startMediaStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      if (!isMountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      setMediaStream(stream);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Media error:", err);
    }
  };

  const stopRecognition = () => {
    recognitionRef.current?.stop();
    setIsRecognizing(false);
    if (recognitionTimerRef.current) {
      clearTimeout(recognitionTimerRef.current);
      recognitionTimerRef.current = null;
    }
  };

  const startRecognition = () => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      alert("Speech recognition not supported in this browser");
      return;
    }

    stopRecognition();

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = LANGUAGE_CODE;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => setIsRecognizing(true);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = finalTranscriptRef.current;

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += ` ${transcript}`;
        else interim += transcript;
      }

      finalTranscriptRef.current = final.trim();
      setEditableTranscript(`${final} ${interim}`.trim());
    };

    recognition.onerror = () => setIsRecognizing(false);
    recognition.onend = () => setIsRecognizing(false);

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      console.error("Recognition start error:", err);
    }
  };

  const resetTimer = () => {
    setTimeLeft(DEFAULT_QUESTION_TIME);
    setIsTimerRunning(true);
  };

  const handleNext = async () => {
    if (isHandlingNext.current) return;
    isHandlingNext.current = true;

    stopRecognition();
    setIsTimerRunning(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    const currentQuestion = questionsArr[currentIndex];
    const finalAnswer = editableTranscript.trim();

    const updatedResponses = [
      ...responses,
      {
        question: currentQuestion,
        answer: finalAnswer || "(No answer)",
      },
    ];

    setResponses(updatedResponses);

    if (currentIndex < questionsArr.length - 1) {
      setCurrentIndex((i) => i + 1);
      finalTranscriptRef.current = "";
      setEditableTranscript("");
    } else {
      localStorage.setItem("responses", JSON.stringify(updatedResponses));
      await stopMediaStream();
      await exitFullScreen();

      try {
        await fetch("/api/response", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, responses: updatedResponses }),
        });
      } catch (e) {
        console.error("API error", e);
      }

      router.push("/result");
    }

    isHandlingNext.current = false;
  };

  useEffect(() => {
    if (!isTimerRunning) return;

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current!);
          setIsTimerRunning(false);
          handleNext();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerIntervalRef.current!);
  }, [isTimerRunning]);

  useEffect(() => {
    isMountedRef.current = true;
    if (initializedRef.current) return;
    initializedRef.current = true;

    setIsClient(true);
    enterFullScreen();

    try {
      const rawQuestions = localStorage.getItem("questions");
      const parsed = JSON.parse(rawQuestions || "{}");

      if (parsed?.questions) {
        const cleaned = parsed.questions
          .replace(/\\n/g, " ")
          .replace(/\\"/g, '"')
          .replace(/^"|"$/g, "")
          .trim();

        const questions = cleaned
          .split("|")
          .map((q: string) => q.trim())
          .filter(Boolean);

        setQuestionsArr(questions);
      }
    } catch (e) {
      console.error("Error parsing questions", e);
    }

    const initializeVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find((v) => v.lang === LANGUAGE_CODE);
      setVoice(preferred ?? voices[0] ?? null);
    };

    window.speechSynthesis.onvoiceschanged = initializeVoices;
    initializeVoices();
    startMediaStream().finally(() => setIsLoading(false));

    return () => {
      isMountedRef.current = false;
      stopMediaStream();
      exitFullScreen().catch(() => {});
      window.speechSynthesis.onvoiceschanged = null;
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (!questionsArr.length || !voice || !isClient) return;

    finalTranscriptRef.current = "";
    setEditableTranscript("");
    setIsLoading(false);
    stopRecognition();
    window.speechSynthesis.cancel();

    const question = questionsArr[currentIndex];
    const utterance = new SpeechSynthesisUtterance(question);
    utterance.voice = voice;
    utterance.lang = LANGUAGE_CODE;
    utterance.rate = 0.9;

    const startAfterUtterance = () => {
      recognitionTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          startRecognition();
          resetTimer(); // 👈 Start timer AFTER question is spoken
        }
      }, 300);
    };

    utterance.onend = startAfterUtterance;
    utterance.onerror = startAfterUtterance;

    window.speechSynthesis.speak(utterance);

    return () => {
      window.speechSynthesis.cancel();
      stopRecognition();
      if (recognitionTimerRef.current)
        clearTimeout(recognitionTimerRef.current);
    };
  }, [currentIndex, questionsArr, voice, isClient]);

  if (!isClient || isLoading) {
    return (
      <div className="bg-gray-900 text-white h-screen flex items-center justify-center text-lg font-semibold">
        Loading Interview Environment...
      </div>
    );
  }

  if (questionsArr.length === 0) {
    return (
      <div className="bg-gray-900 text-white h-screen flex flex-col items-center justify-center p-8 text-center">
        <p className="text-xl text-red-500 mb-4">
          Error: Could not load interview questions.
        </p>
        <Button
          onClick={() => router.push("/")}
          variant="outline"
          className="mt-6 bg-gray-700 border-gray-600 hover:bg-gray-600"
        >
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-200">
      <div className="flex items-center justify-between px-6 py-4 bg-gray-800 border-b border-gray-700">
        <div className="w-32 h-24 rounded-md overflow-hidden border-2 border-gray-600 bg-black">
          <video
            ref={videoRef}
            autoPlay
            muted
            className="w-full h-full object-cover"
          />
        </div>

        <div className="text-center">
          <h2 className="text-xl font-semibold text-white">
            Interview Session
          </h2>
        </div>

        <div className="text-right">
          <div className="text-sm text-gray-400">Time Left:</div>
          <div className="text-2xl font-bold text-cyan-400">
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/2 flex flex-col p-6 border-r border-gray-700 overflow-y-auto">
          <p className="font-semibold text-lg mb-3 text-cyan-400">
            Question {currentIndex + 1} of {questionsArr.length}
          </p>
          <div className="flex-1 bg-gray-800 rounded-lg p-6 shadow-md mb-4">
            <p className="text-lg leading-relaxed whitespace-pre-wrap">
              {questionsArr[currentIndex]}
            </p>
          </div>
          <div className="mt-auto pt-4">
            <NextButton
              onClick={handleNext}
              isLast={currentIndex === questionsArr.length - 1}
              //@ts-ignore
              disabled={false}
            />
          </div>
        </div>

        <div className="w-1/2 flex flex-col p-6 overflow-y-auto">
          <label
            htmlFor="transcriptArea"
            className="font-semibold text-lg mb-3 text-green-400"
          >
            Your Answer:
          </label>
          <textarea
            id="transcriptArea"
            value={editableTranscript}
            onChange={(e) => setEditableTranscript(e.target.value)}
            placeholder={isRecognizing ? "Listening..." : "Start speaking..."}
            className="flex-1 w-full bg-gray-800 text-gray-200 p-4 rounded-lg shadow-md resize-none text-base focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-700"
            aria-label="Your answer transcript"
          />
        </div>
      </div>
    </div>
  );
}
