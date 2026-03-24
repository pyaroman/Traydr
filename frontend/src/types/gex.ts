export interface GexBar {
  strike: number;
  net_gex: number;
  call_gex: number;
  put_gex: number;
}

export interface SymbolGex {
  symbol: string;
  spot: number;
  bars: GexBar[];
  total_net_gex: number;
  call_wall: number | null;
  put_wall: number | null;
  gamma_flip: number | null;
  updated_at: string;
}

export type GexPayload = Record<string, SymbolGex>;

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SymbolCandles {
  symbol: string;
  candles: Candle[];
  updated_at: string;
}

export type CandlePayload = Record<string, SymbolCandles>;

export interface SessionLevels {
  prev_day_high: number | null;
  prev_day_low: number | null;
  overnight_high: number | null;
  overnight_low: number | null;
}

export interface FullPayload {
  gex: GexPayload;
  candles: CandlePayload;
}
