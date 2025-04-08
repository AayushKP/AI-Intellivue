"use client";

type NextButtonProps = {
  onClick: () => void;
  isLast: boolean;
};

export default function NextButton({ onClick, isLast }: NextButtonProps) {
  return (
    <button
      onClick={onClick}
      className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-800 transition"
    >
      {isLast ? "Finish" : "Next"}
    </button>
  );
}
