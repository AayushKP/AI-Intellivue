"use client";

import { useEffect, useState } from "react";

export default function Page({ params }: { params: { slug?: string } }) {
  const [roomId, setRoomId] = useState<string | null>(null);
  const questions: string | null = localStorage.getItem("questions");

  if (questions) {
    //questions array
    const parsed = JSON.parse(questions);
    const questionsArr = parsed.questions
      .split("|")
      .map((q: string) => q.trim());
    console.log(questionsArr);
  }
  useEffect(() => {
    const fromParams = params?.slug;
    if (fromParams) {
      setRoomId(fromParams);
    } else {
      const fromStorage = localStorage.getItem("roomId");
      setRoomId(fromStorage);
    }
  }, [params]);

  return (
    <div className="bg-black text-white h-[100dvh] flex flex-row items-center justify-center text-xl">
      <div className="w-1/2 h-full bg-yellow-400">
        Room ID: {roomId || "Not found"}
      </div>
      <div className="w-1/2 h-full bg-red-400">
        Room ID: {roomId || "Not found"}
      </div>
    </div>
  );
}
