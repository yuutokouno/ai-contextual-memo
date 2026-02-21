import { useState } from "react";
import { FileText, Share2 } from "lucide-react";
import { MemoPage } from "@/pages/memo";
import { GraphPage } from "@/pages/graph";

type Tab = "memos" | "graph";

type NavButtonProps = {
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
};

const NavButton = ({ isActive, onClick, icon, label }: NavButtonProps) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
      isActive
        ? "bg-indigo-600 text-white"
        : "text-white/40 hover:text-white/70 hover:bg-white/5"
    }`}
  >
    {icon}
    {label}
  </button>
);

export const App = () => {
  const [activeTab, setActiveTab] = useState<Tab>("memos");

  return (
    <div
      className="flex flex-col h-screen"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <nav className="flex items-center gap-1 px-5 py-3 border-b border-white/5">
        <NavButton
          isActive={activeTab === "memos"}
          onClick={() => setActiveTab("memos")}
          icon={<FileText size={14} />}
          label="Memos"
        />
        <NavButton
          isActive={activeTab === "graph"}
          onClick={() => setActiveTab("graph")}
          icon={<Share2 size={14} />}
          label="Graph"
        />
      </nav>

      <main className="flex-1 overflow-auto">
        {activeTab === "memos" ? <MemoPage /> : <GraphPage />}
      </main>
    </div>
  );
};
