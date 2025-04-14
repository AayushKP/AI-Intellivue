"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import NextButton from "@/components/Next-Btn";
import { Button } from "@/components/ui/button";
import { EditorView } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { EditorState } from "@codemirror/state";

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

export default function Page({ params }: { params: { roomId: string } }) {
  const router = useRouter();

  const [roomId, setRoomId] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [questionsArr, setQuestionsArr] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Response[]>([]);
  const [editableTranscript, setEditableTranscript] = useState("");
  const [codeMirrorContent, setCodeMirrorContent] = useState("");
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_QUESTION_TIME);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isVoiceReady, setIsVoiceReady] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(true);
  const [fullscreenError, setFullscreenError] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef("");
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const isMountedRef = useRef(true);
  const isHandlingNext = useRef(false);

  // Set Room ID on mount
  useEffect(() => {
    setRoomId(params.roomId);
  }, [params]);

  const setupEditorExtensions = useCallback(() => {
    return [
      basicSetup,
      javascript(),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          setCodeMirrorContent(update.state.doc.toString());
        }
      }),
    ];
  }, []);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const resetTimer = () => {
    const isLastTwo = currentIndex >= questionsArr.length - 2;
    setTimeLeft(isLastTwo ? 600 : DEFAULT_QUESTION_TIME);
    setIsTimerRunning(true);
  };

  const enterFullScreen = async () => {
    try {
      const el = document.documentElement;
      if (!document.fullscreenElement) {
        const req = el.requestFullscreen || (el as any).webkitRequestFullscreen;
        if (req) {
          await req.call(el);
        }
      }
      setIsFullscreen(true);
    } catch (err) {
      setFullscreenError(true);
    }
  };

  const exitFullScreen = async () => {
    try {
      if (document.fullscreenElement) {
        const exit =
          document.exitFullscreen || (document as any).webkitExitFullscreen;
        if (exit) {
          await exit.call(document);
        }
      }
      setIsFullscreen(false);
    } catch (err) {
      console.error("Exit fullscreen error:", err);
    }
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
      setNeedsPermission(false);
    } catch (err) {
      setNeedsPermission(true);
    }
  };

  const stopMediaStream = () => {
    if (!mediaStream) return;
    mediaStream.getTracks().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setMediaStream(null);
  };

  const handleStartInterview = async () => {
    setIsLoading(true);
    await Promise.all([enterFullScreen(), startMediaStream()]);
    setIsLoading(false);
  };

  const stopRecognition = () => {
    recognitionRef.current?.stop();
    setIsRecognizing(false);
  };

  const startRecognition = () => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      alert("Speech recognition not supported");
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
    recognition.start();
  };

  const handleNext = async () => {
    if (isHandlingNext.current) return;
    isHandlingNext.current = true;

    stopRecognition();
    setIsTimerRunning(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    const currentQuestion = questionsArr[currentIndex];
    const isLastTwo = currentIndex >= questionsArr.length - 2;
    const finalAnswer = isLastTwo
      ? codeMirrorContent.trim()
      : editableTranscript.trim();

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
      setCodeMirrorContent("");
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

  // Setup interview logic
  useEffect(() => {
    setIsClient(true);

    const rawQuestions = localStorage.getItem("questions");
    if (rawQuestions) {
      try {
        const parsed = JSON.parse(rawQuestions);
        const cleaned = parsed.questions
          .replace(/\\n/g, " ")
          .replace(/\\"/g, '"')
          .replace(/^"|"$/g, "")
          .trim();

        const list = cleaned
          .split("|")
          .map((q: string) => q.trim())
          .filter(Boolean);
        setQuestionsArr(list);
      } catch (e) {
        console.error("Failed parsing questions", e);
      }
    }

    const loadVoices = () => {
      let voices = speechSynthesis.getVoices();
      if (voices.length) {
        const match = voices.find((v) => v.lang === LANGUAGE_CODE);
        setVoice(match ?? voices[0] ?? null);
        setIsVoiceReady(true);
      } else {
        setTimeout(loadVoices, 100);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      stopMediaStream();
      window.speechSynthesis.cancel();
      window.speechSynthesis.onvoiceschanged = null;
      isMountedRef.current = false;
    };
  }, []);

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
    if (
      questionsArr.length === 0 ||
      !isClient ||
      needsPermission ||
      !isVoiceReady
    )
      return;

    const question = questionsArr[currentIndex];
    const speak = new SpeechSynthesisUtterance(question);
    speak.voice = voice;
    speak.lang = LANGUAGE_CODE;
    speak.rate = 0.9;

    speak.onend = () => {
      if (currentIndex < questionsArr.length - 2) startRecognition();
      resetTimer();
    };

    window.speechSynthesis.speak(speak);

    return () => {
      window.speechSynthesis.cancel();
      stopRecognition();
    };
  }, [currentIndex, questionsArr, isClient, needsPermission, isVoiceReady]);

  useEffect(() => {
    if (
      currentIndex >= questionsArr.length - 2 &&
      editorRef.current &&
      !viewRef.current
    ) {
      const state = EditorState.create({
        doc: codeMirrorContent,
        extensions: setupEditorExtensions(),
      });
      viewRef.current = new EditorView({
        state,
        parent: editorRef.current,
      });
    }

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, [currentIndex, questionsArr.length, setupEditorExtensions]);

  // === RENDER ===

  if (!roomId || isLoading || !isClient || !isVoiceReady) {
    return (
      <div className="bg-gray-900 text-white h-screen flex items-center justify-center text-lg font-semibold">
        Loading Interview Environment...
      </div>
    );
  }

  if (needsPermission) {
    return (
      <div className="bg-gray-900 text-white h-screen flex flex-col items-center justify-center p-8 text-center">
        <h1 className="text-2xl font-bold mb-6">Interview Setup</h1>
        <p className="mb-8">
          Please allow camera and microphone access to begin your interview.
        </p>
        <Button
          onClick={handleStartInterview}
          className="px-8 py-4 text-lg bg-blue-600 hover:bg-blue-700"
        >
          Start Interview
        </Button>
        {fullscreenError && (
          <p className="mt-4 text-yellow-500">
            Fullscreen couldn't be activated automatically. Enable it manually.
          </p>
        )}
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
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-800 border-b border-gray-700">
        <div className="w-32 h-24 rounded-md overflow-hidden border-2 border-gray-600 bg-black">
          {mediaStream ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <span className="text-sm">Camera Off</span>
            </div>
          )}
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white">
            Interview Session
          </h2>
          {!isFullscreen && (
            <button
              onClick={enterFullScreen}
              className="text-sm text-blue-400 hover:text-blue-300 mt-1"
            >
              Enter Fullscreen
            </button>
          )}
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400">Time Left:</div>
          <div className="text-2xl font-bold text-cyan-400">
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Question Area */}
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

        {/* Answer Area */}
        <div className="w-1/2 flex flex-col p-6 overflow-y-auto">
          <label className="font-semibold text-lg mb-3 text-green-400">
            Your Answer:
          </label>
          {currentIndex >= questionsArr.length - 2 ? (
            <div
              ref={editorRef}
              className="flex-1 w-full bg-gray-800 text-gray-200 rounded-lg shadow-md text-base border border-gray-700 overflow-hidden"
            />
          ) : (
            <textarea
              value={editableTranscript}
              onChange={(e) => setEditableTranscript(e.target.value)}
              placeholder={isRecognizing ? "Listening..." : "Start speaking..."}
              className="flex-1 w-full bg-gray-800 text-gray-200 p-4 rounded-lg shadow-md resize-none text-base focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-700"
              aria-label="Your answer transcript"
            />
          )}
        </div>
      </div>
    </div>
  );
}
