"use client";

import { useEffect, useState } from "react";

export default function Page({ params }: { params: { slug?: string } }) {
  const [roomId, setRoomId] = useState<string | null>(null);

  useEffect(() => {
    const fromParams = params?.slug;
    if (fromParams) {
      setRoomId(fromParams);
    } else {
      // Fallback to localStorage
      const fromStorage = localStorage.getItem("roomId");
      setRoomId(fromStorage);
    }
  }, [params]);

  return (
    <div className="bg-black text-white min-h-screen flex items-center justify-center text-xl">
      Room ID: {roomId || "Not found"}
    </div>
  );
}
