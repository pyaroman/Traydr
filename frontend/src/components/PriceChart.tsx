import { useEffect, useRef } from "react";
import { createChart, ColorType, LineStyle, CandlestickSeries } from "lightweight-charts";
import type { IChartApi, ISeriesApi, CandlestickData, Time } from "lightweight-charts";
import type { Candle, SessionLevels } from "../types/gex";

interface Props {
  candles: Candle[];
  spot: number | null;
  callWall: number | null;
  putWall: number | null;
  gammaFlip: number | null;
  levels: SessionLevels | null;
  showSessionLevels: boolean;
  isDark: boolean;
}

const CALL_WALL_COLOR = "#3b82f6";
const PUT_WALL_COLOR = "#a855f7";
const GAMMA_FLIP_COLOR = "#f97316";
const SPOT_COLOR = "#ef4444"; // red

interface PendingLine {
  price: number;
  label: string;
  color: string;
  lineWidth: 1 | 2 | 3 | 4;
  lineStyle: LineStyle;
}

/**
 * Merge lines that are within `threshold` (fraction of price) of each other.
 * Merged lines use the average price, combined label with " / ", and the
 * thicker/more prominent style of the group.
 */
function mergeCloseLines(pending: PendingLine[], threshold: number): PendingLine[] {
  if (pending.length === 0) return [];

  const sorted = [...pending].sort((a, b) => a.price - b.price);
  const groups: PendingLine[][] = [[sorted[0]]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = groups[groups.length - 1];
    const avgPrice = prev.reduce((s, l) => s + l.price, 0) / prev.length;
    if (Math.abs(sorted[i].price - avgPrice) / avgPrice <= threshold) {
      prev.push(sorted[i]);
    } else {
      groups.push([sorted[i]]);
    }
  }

  return groups.map((group) => {
    if (group.length === 1) return group[0];
    // Merged line: average price, combined labels, pick thickest width & most visible color
    const avgPrice = group.reduce((s, l) => s + l.price, 0) / group.length;
    const label = group.map((l) => l.label).join("  /  ");
    // Pick the most prominent style: prefer colored lines over black, thicker over thinner
    const best = group.reduce((a, b) => (a.lineWidth >= b.lineWidth ? a : b));
    return {
      price: Math.round(avgPrice * 100) / 100,
      label,
      color: best.color,
      lineWidth: Math.max(...group.map((l) => l.lineWidth)) as 1 | 2 | 3 | 4,
      lineStyle: LineStyle.Dashed,
    };
  });
}

export function PriceChart({
  candles, spot, callWall, putWall, gammaFlip,
  levels, showSessionLevels, isDark,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const sessionLineColor = isDark ? "#ffffff" : "#000000";

  // Create chart
  useEffect(() => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();

    const chart = createChart(containerRef.current, {
      width: rect.width,
      height: rect.height,
      layout: {
        background: { type: ColorType.Solid, color: isDark ? "#111318" : "#ffffff" },
        textColor: isDark ? "#9ca3af" : "#64748b",
      },
      grid: {
        vertLines: { color: isDark ? "#1e2130" : "#f1f5f9" },
        horzLines: { color: isDark ? "#1e2130" : "#f1f5f9" },
      },
      crosshair: { mode: 0 },
      rightPriceScale: { borderColor: isDark ? "#2a2d3a" : "#e2e8f0" },
      timeScale: {
        borderColor: isDark ? "#2a2d3a" : "#e2e8f0",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [isDark]);

  // Update data
  useEffect(() => {
    if (!seriesRef.current || !candles.length) return;

    const data: CandlestickData<Time>[] = candles.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    seriesRef.current.setData(data);
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  // Update all price lines with merging
  useEffect(() => {
    if (!seriesRef.current) return;

    const series = seriesRef.current;
    const createdLines: ReturnType<typeof series.createPriceLine>[] = [];

    const pending: PendingLine[] = [];

    // Current price — red dashed
    if (spot != null) {
      pending.push({
        price: spot,
        label: `Spot ${spot}`,
        color: SPOT_COLOR,
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
      });
    }

    // GEX levels
    if (callWall != null) {
      pending.push({
        price: callWall,
        label: `Call Wall ${callWall}`,
        color: CALL_WALL_COLOR,
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
      });
    }
    if (putWall != null) {
      pending.push({
        price: putWall,
        label: `Put Wall ${putWall}`,
        color: PUT_WALL_COLOR,
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
      });
    }
    if (gammaFlip != null) {
      pending.push({
        price: gammaFlip,
        label: `Gamma Flip ${gammaFlip}`,
        color: GAMMA_FLIP_COLOR,
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
      });
    }

    // Session levels — black (or white in dark mode)
    if (showSessionLevels && levels) {
      if (levels.prev_day_high != null) {
        pending.push({
          price: levels.prev_day_high,
          label: `Prev Day High ${levels.prev_day_high}`,
          color: sessionLineColor,
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
        });
      }
      if (levels.prev_day_low != null) {
        pending.push({
          price: levels.prev_day_low,
          label: `Prev Day Low ${levels.prev_day_low}`,
          color: sessionLineColor,
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
        });
      }
      if (levels.overnight_high != null) {
        pending.push({
          price: levels.overnight_high,
          label: `Overnight High ${levels.overnight_high}`,
          color: sessionLineColor,
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
        });
      }
      if (levels.overnight_low != null) {
        pending.push({
          price: levels.overnight_low,
          label: `Overnight Low ${levels.overnight_low}`,
          color: sessionLineColor,
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
        });
      }
    }

    // Merge lines within 0.15% of each other
    const merged = mergeCloseLines(pending, 0.0015);

    for (const line of merged) {
      createdLines.push(
        series.createPriceLine({
          price: line.price,
          color: line.color,
          lineWidth: line.lineWidth,
          lineStyle: line.lineStyle,
          axisLabelVisible: true,
          title: line.label,
        }),
      );
    }

    return () => {
      createdLines.forEach((line) => {
        try {
          series.removePriceLine(line);
        } catch {
          // series may have been removed
        }
      });
    };
  }, [spot, callWall, putWall, gammaFlip, levels, showSessionLevels, sessionLineColor]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", minHeight: 400 }}
    />
  );
}
