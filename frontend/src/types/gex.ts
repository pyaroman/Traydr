export interface GexBar {
  strike: number;
  net_gex: number;
}

export interface SymbolGex {
  symbol: string;
  spot: number;
  bars: GexBar[];
  total_net_gex: number;
  updated_at: string;
}

export type GexPayload = Record<string, SymbolGex>;
