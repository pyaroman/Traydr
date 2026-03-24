import { useState } from "react";
import { useGexWebSocket } from "./hooks/useGexWebSocket";
import { useTheme } from "./hooks/useTheme";
import { GexPanel } from "./components/GexPanel";
import { PricePanel } from "./components/PricePanel";
import { StatusBar } from "./components/StatusBar";
import { ThemeToggle } from "./components/ThemeToggle";

const WS_URL = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws/gex`;
const SYMBOLS = ["SPY", "SPX", "QQQ", "NDX"] as const;

type Tab = "gex" | "price";

export default function App() {
  const { data, candles, connected } = useGexWebSocket(WS_URL);
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  const [activeTab, setActiveTab] = useState<Tab>("gex");

  const bg = isDark ? "bg-[#0a0c11]" : "bg-[#f8fafc]";
  const textPrimary = isDark ? "text-[#f1f5f9]" : "text-[#0f172a]";
  const borderSubtle = isDark ? "border-[#2a2d3a]" : "border-[#e2e8f0]";
  const tabActive = isDark
    ? "text-[#f1f5f9] border-b-2 border-[#f1f5f9]"
    : "text-[#0f172a] border-b-2 border-[#0f172a]";
  const tabInactive = isDark
    ? "text-[#6b7280] hover:text-[#9ca3af]"
    : "text-[#64748b] hover:text-[#475569]";

  return (
    <div className={`min-h-screen ${bg} ${textPrimary} flex flex-col`}>
      {/* Header */}
      <header className={`flex items-center justify-between px-6 py-3 border-b ${borderSubtle} shrink-0`}>
        <div className="flex items-center gap-8">
          <span className="text-base font-semibold tracking-tight">Traydr</span>

          {/* Tabs */}
          <nav className="flex items-center gap-5">
            <button
              onClick={() => setActiveTab("gex")}
              className={`text-sm font-medium pb-0.5 transition-colors ${
                activeTab === "gex" ? tabActive : tabInactive
              }`}
            >
              Gamma Exposure
            </button>
            <button
              onClick={() => setActiveTab("price")}
              className={`text-sm font-medium pb-0.5 transition-colors ${
                activeTab === "price" ? tabActive : tabInactive
              }`}
            >
              Price Chart
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <StatusBar connected={connected} isDark={isDark} />
          <ThemeToggle isDark={isDark} onToggle={toggle} />
        </div>
      </header>

      {/* Content */}
      {activeTab === "gex" ? (
        <main className="flex-1 grid grid-cols-2 grid-rows-2 gap-4 p-4 min-h-0">
          {SYMBOLS.map((sym) => (
            <GexPanel
              key={sym}
              symbol={sym}
              data={data?.[sym]}
              isDark={isDark}
            />
          ))}
        </main>
      ) : (
        <main className="flex-1 p-4 min-h-0">
          <PricePanel
            gexData={data}
            isDark={isDark}
          />
        </main>
      )}
    </div>
  );
}
