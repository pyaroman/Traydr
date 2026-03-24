import { useState, useEffect, useCallback } from "react";
import { PriceChart } from "./PriceChart";
import type { GexPayload, Candle, SessionLevels } from "../types/gex";

const SYMBOLS = ["SPY", "SPX", "QQQ", "NDX"] as const;
const TIMEFRAMES = [
  { label: "5m", value: "5" },
  { label: "15m", value: "15" },
  { label: "30m", value: "30" },
  { label: "D", value: "D" },
] as const;
const LAYOUT_OPTIONS = [1, 2, 3, 4] as const;

interface Props {
  gexData: GexPayload | null;
  isDark: boolean;
}

interface ChartState {
  symbol: string;
  timeframe: string;
  candles: Candle[];
  levels: SessionLevels | null;
  loading: boolean;
}

function SingleChart({
  index,
  state,
  gexData,
  isDark,
  showCallWall,
  showPutWall,
  showGammaFlip,
  showSessionLevels,
  onSymbolChange,
  onTimeframeChange,
}: {
  index: number;
  state: ChartState;
  gexData: GexPayload | null;
  isDark: boolean;
  showCallWall: boolean;
  showPutWall: boolean;
  showGammaFlip: boolean;
  showSessionLevels: boolean;
  onSymbolChange: (i: number, sym: string) => void;
  onTimeframeChange: (i: number, tf: string) => void;
}) {
  const textMuted = isDark ? "text-[#6b7280]" : "text-[#64748b]";
  const textPrimary = isDark ? "text-[#f1f5f9]" : "text-[#0f172a]";
  const btnActive = isDark ? "bg-[#2a2d3a] text-[#f1f5f9]" : "bg-[#e2e8f0] text-[#0f172a]";
  const btnInactive = isDark
    ? "text-[#6b7280] hover:text-[#f1f5f9] hover:bg-[#1a1d27]"
    : "text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9]";

  const gex = gexData?.[state.symbol];

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Per-chart controls */}
      <div className="flex items-center gap-3 mb-2 shrink-0">
        <div className="flex items-center gap-1">
          {SYMBOLS.map((sym) => (
            <button
              key={sym}
              onClick={() => onSymbolChange(index, sym)}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                state.symbol === sym ? btnActive : btnInactive
              }`}
            >
              {sym}
            </button>
          ))}
        </div>
        <div className={`flex items-center gap-0.5 p-0.5 rounded ${isDark ? "bg-[#1a1d27]" : "bg-[#f1f5f9]"}`}>
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              onClick={() => onTimeframeChange(index, tf.value)}
              className={`px-1.5 py-0.5 text-xs font-medium rounded transition-colors ${
                state.timeframe === tf.value ? btnActive : btnInactive
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
        {gex && (
          <span className={`text-xs ${textMuted} ml-auto`}>
            Spot: <span className={`font-medium ${textPrimary}`}>{gex.spot.toLocaleString()}</span>
          </span>
        )}
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        {state.loading ? (
          <div className={`h-full flex items-center justify-center ${textMuted} text-sm`}>
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin opacity-50" />
              Loading {state.symbol}…
            </div>
          </div>
        ) : state.candles.length > 0 ? (
          <PriceChart
            candles={state.candles}
            spot={gex?.spot ?? null}
            callWall={showCallWall ? (gex?.call_wall ?? null) : null}
            putWall={showPutWall ? (gex?.put_wall ?? null) : null}
            gammaFlip={showGammaFlip ? (gex?.gamma_flip ?? null) : null}
            levels={state.levels}
            showSessionLevels={showSessionLevels}
            isDark={isDark}
          />
        ) : (
          <div className={`h-full flex items-center justify-center ${textMuted} text-sm`}>
            No data for {state.symbol}
          </div>
        )}
      </div>
    </div>
  );
}

export function PricePanel({ gexData, isDark }: Props) {
  const [layout, setLayout] = useState<number>(1);
  const [charts, setCharts] = useState<ChartState[]>([
    { symbol: "SPY", timeframe: "D", candles: [], levels: null, loading: false },
    { symbol: "SPX", timeframe: "D", candles: [], levels: null, loading: false },
    { symbol: "QQQ", timeframe: "D", candles: [], levels: null, loading: false },
    { symbol: "NDX", timeframe: "D", candles: [], levels: null, loading: false },
  ]);
  const [showCallWall, setShowCallWall] = useState(true);
  const [showPutWall, setShowPutWall] = useState(true);
  const [showGammaFlip, setShowGammaFlip] = useState(true);
  const [showSessionLevels, setShowSessionLevels] = useState(true);

  const panelBg = isDark ? "bg-[#111318]" : "bg-white";
  const border = isDark ? "border-[#2a2d3a]" : "border-[#e2e8f0]";
  const textMuted = isDark ? "text-[#6b7280]" : "text-[#64748b]";
  const layoutActive = isDark ? "bg-[#2a2d3a] text-[#f1f5f9]" : "bg-[#e2e8f0] text-[#0f172a]";
  const layoutInactive = isDark
    ? "text-[#6b7280] hover:text-[#f1f5f9]"
    : "text-[#64748b] hover:text-[#0f172a]";

  const fetchCandles = useCallback(async (index: number, symbol: string, timeframe: string) => {
    setCharts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], loading: true };
      return next;
    });
    try {
      const resp = await fetch(`/api/candles/${symbol}?timeframe=${timeframe}`);
      const data = await resp.json();
      setCharts((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          candles: data.candles ?? [],
          levels: data.levels ?? null,
          loading: false,
        };
        return next;
      });
    } catch {
      setCharts((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], candles: [], levels: null, loading: false };
        return next;
      });
    }
  }, []);

  // Fetch on mount and when symbol/timeframe changes
  useEffect(() => {
    for (let i = 0; i < layout; i++) {
      fetchCandles(i, charts[i].symbol, charts[i].timeframe);
    }
    // Only refetch when layout changes (individual changes handled by callbacks)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  const handleSymbolChange = (index: number, sym: string) => {
    setCharts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], symbol: sym };
      return next;
    });
    fetchCandles(index, sym, charts[index].timeframe);
  };

  const handleTimeframeChange = (index: number, tf: string) => {
    setCharts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], timeframe: tf };
      return next;
    });
    fetchCandles(index, charts[index].symbol, tf);
  };

  const gridClass =
    layout === 1
      ? "grid-cols-1 grid-rows-1"
      : layout === 2
        ? "grid-cols-2 grid-rows-1"
        : layout === 3
          ? "grid-cols-2 grid-rows-2"
          : "grid-cols-2 grid-rows-2";

  return (
    <div className={`flex flex-col rounded-xl border ${panelBg} ${border} px-5 py-4 overflow-hidden h-full`}>
      {/* Global controls */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-4">
          {/* Layout selector */}
          <div className={`flex items-center gap-0.5 p-0.5 rounded ${isDark ? "bg-[#1a1d27]" : "bg-[#f1f5f9]"}`}>
            {LAYOUT_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => setLayout(n)}
                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                  layout === n ? layoutActive : layoutInactive
                }`}
              >
                {n === 1 ? "1" : n === 2 ? "1x2" : n === 3 ? "3" : "2x2"}
              </button>
            ))}
          </div>
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
          <span className={`mx-0.5 ${isDark ? "text-[#2a2d3a]" : "text-[#e2e8f0]"}`}>|</span>
          <button
            onClick={() => setShowSessionLevels((v) => !v)}
            className={`flex items-center gap-1.5 transition-opacity ${
              showSessionLevels ? "opacity-100" : "opacity-30"
            }`}
          >
            <span className={`inline-block w-2 h-2 rounded-full ${isDark ? "bg-white" : "bg-black"}`} />
            <span className={textMuted}>Prev Day / Overnight</span>
          </button>
        </div>
      </div>

      {/* Chart grid */}
      <div className={`flex-1 min-h-0 grid ${gridClass} gap-3`}>
        {Array.from({ length: layout }, (_, i) => (
          <div
            key={i}
            className={`min-h-0 overflow-hidden ${
              layout === 3 && i === 2 ? "col-span-2" : ""
            }`}
          >
            <SingleChart
              index={i}
              state={charts[i]}
              gexData={gexData}
              isDark={isDark}
              showCallWall={showCallWall}
              showPutWall={showPutWall}
              showGammaFlip={showGammaFlip}
              showSessionLevels={showSessionLevels}
              onSymbolChange={handleSymbolChange}
              onTimeframeChange={handleTimeframeChange}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
