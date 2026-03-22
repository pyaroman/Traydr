import { useGexWebSocket } from "./hooks/useGexWebSocket";
import { useTheme } from "./hooks/useTheme";
import { GexPanel } from "./components/GexPanel";
import { StatusBar } from "./components/StatusBar";
import { ThemeToggle } from "./components/ThemeToggle";

const WS_URL = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws/gex`;
const SYMBOLS = ["SPY", "SPX", "QQQ", "NDX"] as const;

export default function App() {
  const { data, connected } = useGexWebSocket(WS_URL);
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  const bg = isDark ? "bg-[#0a0c11]" : "bg-[#f8fafc]";
  const textPrimary = isDark ? "text-[#f1f5f9]" : "text-[#0f172a]";
  const borderSubtle = isDark ? "border-[#2a2d3a]" : "border-[#e2e8f0]";

  return (
    <div className={`min-h-screen ${bg} ${textPrimary} flex flex-col`}>
      {/* Header */}
      <header className={`flex items-center justify-between px-5 py-3 border-b ${borderSubtle} shrink-0`}>
        <div className="flex items-center gap-3">
          <span className="text-base font-semibold tracking-tight">Traydr</span>
          <span className={`text-xs ${isDark ? "text-[#6b7280]" : "text-[#64748b]"}`}>
            GEX
          </span>
        </div>
        <div className="flex items-center gap-3">
          <StatusBar connected={connected} isDark={isDark} />
          <ThemeToggle isDark={isDark} onToggle={toggle} />
        </div>
      </header>

      {/* Main 2×2 grid */}
      <main className="flex-1 grid grid-cols-2 grid-rows-2 gap-3 p-3 min-h-0">
        {SYMBOLS.map((sym) => (
          <GexPanel
            key={sym}
            symbol={sym}
            data={data?.[sym]}
            isDark={isDark}
          />
        ))}
      </main>
    </div>
  );
}
