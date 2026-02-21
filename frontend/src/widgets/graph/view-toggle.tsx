import { Grid3X3, Box } from "lucide-react";

type ViewMode = "2d" | "3d";

type ViewToggleProps = {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
};

export const ViewToggle = ({ mode, onModeChange }: ViewToggleProps) => (
  <div className="absolute top-4 left-4 z-10 flex rounded-lg bg-[#1e293b]/90 backdrop-blur-sm border border-white/10 overflow-hidden">
    <button
      onClick={() => onModeChange("2d")}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
        mode === "2d"
          ? "bg-indigo-600 text-white"
          : "text-white/40 hover:text-white/70"
      }`}
    >
      <Grid3X3 size={12} />
      2D
    </button>
    <button
      onClick={() => onModeChange("3d")}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
        mode === "3d"
          ? "bg-indigo-600 text-white"
          : "text-white/40 hover:text-white/70"
      }`}
    >
      <Box size={12} />
      3D
    </button>
  </div>
);
