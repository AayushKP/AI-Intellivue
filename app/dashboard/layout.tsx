import { ReactNode } from "react";
import Sidebar from "../../components/Sidebar";

export default function Dashboardlayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="flex h-[100dvh]">
      <Sidebar />
      <div className="flex-1">{children}</div>
    </div>
  );
}
