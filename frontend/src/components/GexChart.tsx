import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { GexBar } from "../types/gex";

interface Props {
  bars: GexBar[];
  spot: number;
  isDark: boolean;
  horizontal?: boolean;
}

const GEX_POS = "#22c55e";
const GEX_NEG = "#ef4444";
const SPOT_COLOR = "#f59e0b";

function formatGex(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(0)}M`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toFixed(0);
}

const CustomTooltip = ({
  active,
  payload,
  isDark,
}: {
  active?: boolean;
  payload?: { payload: GexBar }[];
  isDark: boolean;
}) => {
  if (!active || !payload?.length) return null;
  const bar = payload[0].payload;
  return (
    <div
      style={{
        background: isDark ? "#1a1d27" : "#ffffff",
        border: `1px solid ${isDark ? "#2a2d3a" : "#e2e8f0"}`,
        borderRadius: 6,
        padding: "8px 12px",
        fontSize: 12,
        color: isDark ? "#f1f5f9" : "#0f172a",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Strike {bar.strike}</div>
      <div style={{ color: bar.net_gex >= 0 ? GEX_POS : GEX_NEG }}>
        Net GEX: {formatGex(bar.net_gex)}
      </div>
    </div>
  );
};

export function GexChart({ bars, spot, isDark, horizontal = false }: Props) {
  // Filter to ±15% of spot for readability
  const filtered = bars.filter(
    (b) => b.strike >= spot * 0.85 && b.strike <= spot * 1.15
  );

  const gridColor = isDark ? "#2a2d3a" : "#e2e8f0";
  const axisColor = isDark ? "#6b7280" : "#64748b";
  const cursor = { fill: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" };

  if (horizontal) {
    // Horizontal: strikes on Y-axis, GEX values on X-axis
    // Reverse so highest strike is at top
    const reversed = [...filtered].reverse();
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={reversed}
          layout="vertical"
          margin={{ top: 8, right: 24, left: 48, bottom: 8 }}
          barCategoryGap="20%"
        >
          <CartesianGrid horizontal={false} stroke={gridColor} strokeDasharray="3 3" />
          <XAxis
            type="number"
            tickFormatter={formatGex}
            tick={{ fill: axisColor, fontSize: 10 }}
          />
          <YAxis
            type="category"
            dataKey="strike"
            tick={{ fill: axisColor, fontSize: 10 }}
            width={44}
            interval={Math.max(0, Math.floor(filtered.length / 10) - 1)}
          />
          <Tooltip content={<CustomTooltip isDark={isDark} />} cursor={cursor} />
          <ReferenceLine
            x={0}
            stroke={gridColor}
            strokeWidth={1}
          />
          <Bar dataKey="net_gex" maxBarSize={20}>
            {reversed.map((bar, i) => (
              <Cell
                key={i}
                fill={bar.net_gex >= 0 ? GEX_POS : GEX_NEG}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // Vertical (default): strikes on X-axis, GEX values on Y-axis
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={filtered}
        margin={{ top: 8, right: 16, left: 8, bottom: 40 }}
        barCategoryGap="20%"
      >
        <CartesianGrid vertical={false} stroke={gridColor} strokeDasharray="3 3" />
        <XAxis
          dataKey="strike"
          tick={{ fill: axisColor, fontSize: 10 }}
          angle={-45}
          textAnchor="end"
          height={60}
          interval={Math.max(0, Math.floor(filtered.length / 12) - 1)}
        />
        <YAxis
          tickFormatter={formatGex}
          tick={{ fill: axisColor, fontSize: 10 }}
          width={48}
        />
        <Tooltip content={<CustomTooltip isDark={isDark} />} cursor={cursor} />
        <ReferenceLine
          x={spot}
          stroke={SPOT_COLOR}
          strokeWidth={2}
          strokeDasharray="4 2"
          label={{
            value: `${spot}`,
            fill: SPOT_COLOR,
            fontSize: 10,
            position: "top",
          }}
        />
        <Bar dataKey="net_gex" maxBarSize={24}>
          {filtered.map((bar, i) => (
            <Cell
              key={i}
              fill={bar.net_gex >= 0 ? GEX_POS : GEX_NEG}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
