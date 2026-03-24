import { useState } from "react";
import { GexChart } from "./GexChart";
import type { SymbolGex } from "../types/gex";

interface Props {
  symbol: string;
  data: SymbolGex | undefined;
  isDark: boolean;
}

const STRIKE_OPTIONS = [10, 25, 50] as const;

function formatTotal(value: number): string {
  const abs = Math.abs(value);
  const sign = value >= 0 ? "+" : "-";
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(0)}M`;
  return `${sign}${abs.toFixed(0)}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function IconVertical({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="4" width="3" height="9" rx="0.5" fill={color} />
      <rect x="5.5" y="1" width="3" height="12" rx="0.5" fill={color} />
      <rect x="10" y="6" width="3" height="7" rx="0.5" fill={color} />
    </svg>
  );
}

function IconHorizontal({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="9" height="3" rx="0.5" fill={color} />
      <rect x="1" y="5.5" width="12" height="3" rx="0.5" fill={color} />
      <rect x="1" y="10" width="7" height="3" rx="0.5" fill={color} />
    </svg>
  );
}

export function GexPanel({ symbol, data, isDark }: Props) {
  const [horizontal, setHorizontal] = useState(true);
  const [strikeCount, setStrikeCount] = useState<number>(25);
  const [showCallWall, setShowCallWall] = useState(true);
  const [showPutWall, setShowPutWall] = useState(true);
  const [showGammaFlip, setShowGammaFlip] = useState(true);

  const panelBg = isDark ? "bg-[#111318]" : "bg-white";
  const border = isDark ? "border-[#2a2d3a]" : "border-[#e2e8f0]";
  const textPrimary = isDark ? "text-[#f1f5f9]" : "text-[#0f172a]";
  const textMuted = isDark ? "text-[#6b7280]" : "text-[#64748b]";
  const totalColor =
    data && data.total_net_gex >= 0 ? "text-[#22c55e]" : "text-[#ef4444]";
  const btnBase = `w-6 h-6 flex items-center justify-center rounded transition-colors`;
  const btnActive = isDark ? "bg-[#2a2d3a]" : "bg-[#e2e8f0]";
  const btnInactive = "opacity-40 hover:opacity-70";
  const iconColor = isDark ? "#f1f5f9" : "#0f172a";
  const pillActive = isDark ? "bg-[#2a2d3a] text-[#f1f5f9]" : "bg-[#e2e8f0] text-[#0f172a]";
  const pillInactive = isDark
    ? "text-[#6b7280] hover:text-[#9ca3af]"
    : "text-[#64748b] hover:text-[#475569]";

  return (
    <div className={`flex flex-col rounded-xl border ${panelBg} ${border} px-5 py-4 overflow-hidden`}>
      {/* Header row 1: symbol, orientation, total */}
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex items-baseline gap-3">
          <span className={`text-base font-semibold tracking-tight ${textPrimary}`}>
            {symbol}
          </span>
          {data && (
            <span className={`text-xs ${textMuted}`}>
              Spot: <span className={textPrimary}>{data.spot.toLocaleString()}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Orientation toggle */}
          <div className={`flex items-center gap-0.5 p-0.5 rounded ${isDark ? "bg-[#1a1d27]" : "bg-[#f1f5f9]"}`}>
            <button
              onClick={() => setHorizontal(false)}
              className={`${btnBase} ${!horizontal ? btnActive : btnInactive}`}
              title="Vertical bars"
            >
              <IconVertical color={iconColor} />
            </button>
            <button
              onClick={() => setHorizontal(true)}
              className={`${btnBase} ${horizontal ? btnActive : btnInactive}`}
              title="Horizontal bars"
            >
              <IconHorizontal color={iconColor} />
            </button>
          </div>

          {data && (
            <div className="text-right">
              <span className={`text-sm font-medium ${totalColor}`}>
                {formatTotal(data.total_net_gex)}
              </span>
              <div className={`text-xs ${textMuted} mt-0.5`}>
                {formatTime(data.updated_at)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Header row 2: strike count + level toggles */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          {/* Strike count */}
          <div className={`flex items-center gap-0.5 p-0.5 rounded text-xs ${isDark ? "bg-[#1a1d27]" : "bg-[#f1f5f9]"}`}>
            {STRIKE_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => setStrikeCount(n)}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  strikeCount === n ? pillActive : pillInactive
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <span className={`text-xs ${textMuted}`}>strikes</span>
        </div>

        {/* Level toggles */}
        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={() => setShowCallWall((v) => !v)}
            className={`flex items-center gap-1.5 transition-opacity ${
              showCallWall ? "opacity-100" : "opacity-30"
            }`}
          >
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "#3b82f6" }} />
            <span className={textMuted}>Call Wall</span>
          </button>
          <button
            onClick={() => setShowPutWall((v) => !v)}
            className={`flex items-center gap-1.5 transition-opacity ${
              showPutWall ? "opacity-100" : "opacity-30"
            }`}
          >
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "#a855f7" }} />
            <span className={textMuted}>Put Wall</span>
          </button>
          <button
            onClick={() => setShowGammaFlip((v) => !v)}
            className={`flex items-center gap-1.5 transition-opacity ${
              showGammaFlip ? "opacity-100" : "opacity-30"
            }`}
          >
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "#f97316" }} />
            <span className={textMuted}>Gamma Flip</span>
          </button>
        </div>
      </div>

      {/* Chart area */}
      <div className="flex-1 min-h-0">
        {data ? (
          <GexChart
            bars={data.bars}
            spot={data.spot}
            isDark={isDark}
            horizontal={horizontal}
            callWall={data.call_wall}
            putWall={data.put_wall}
            gammaFlip={data.gamma_flip}
            strikeCount={strikeCount}
            showCallWall={showCallWall}
            showPutWall={showPutWall}
            showGammaFlip={showGammaFlip}
          />
        ) : (
          <div className={`h-full flex items-center justify-center ${textMuted} text-sm`}>
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin opacity-50" />
              Loading {symbol}…
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
