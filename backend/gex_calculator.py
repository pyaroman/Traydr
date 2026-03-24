from datetime import datetime, timezone


# Schwab API requires $ prefix for index option chains (SPX, NDX)
# Display names map the API symbol back to the label shown in the UI
SYMBOLS = ["SPY", "$SPX", "QQQ", "$NDX"]
DISPLAY_NAMES = {"$SPX": "SPX", "$NDX": "NDX"}


def _find_gamma_flip(bars: list[dict], spot: float) -> float | None:
    """Find the strike nearest to spot where net GEX crosses from negative to positive."""
    if len(bars) < 2:
        return None
    # Look for zero crossings — interpolate between adjacent bars
    best_strike = None
    best_dist = float("inf")
    for i in range(len(bars) - 1):
        a, b = bars[i], bars[i + 1]
        if (a["net_gex"] <= 0 < b["net_gex"]) or (a["net_gex"] >= 0 > b["net_gex"]):
            # Linear interpolation of the zero crossing
            denom = b["net_gex"] - a["net_gex"]
            if denom == 0:
                continue
            t = -a["net_gex"] / denom
            cross = a["strike"] + t * (b["strike"] - a["strike"])
            dist = abs(cross - spot)
            if dist < best_dist:
                best_dist = dist
                best_strike = round(cross, 2)
    return best_strike


def calculate_gex(options_data: dict) -> dict:
    """
    Calculate net GEX per strike from a Schwab options chain response.

    Formula: GEX = Gamma × OI × 100 × Spot² × 0.01
    Net GEX = Call GEX − Put GEX  (summed across all expirations)
    """
    spot = float(options_data["underlyingPrice"])
    raw_symbol = options_data["symbol"]
    symbol = DISPLAY_NAMES.get(raw_symbol, raw_symbol)

    strikes: dict[float, dict[str, float]] = {}

    def accumulate(exp_date_map: dict, side: str) -> None:
        for exp_data in exp_date_map.values():
            for strike_str, contracts in exp_data.items():
                strike = float(strike_str)
                c = contracts[0]
                gamma = c.get("gamma") or 0.0
                oi = c.get("openInterest") or 0
                gex = gamma * oi * 100 * (spot ** 2) * 0.01
                if strike not in strikes:
                    strikes[strike] = {"call_gex": 0.0, "put_gex": 0.0}
                strikes[strike][side] += gex

    accumulate(options_data.get("callExpDateMap", {}), "call_gex")
    accumulate(options_data.get("putExpDateMap", {}), "put_gex")

    bars = []
    for strike in sorted(strikes):
        d = strikes[strike]
        net = d["call_gex"] - d["put_gex"]
        bars.append({
            "strike": strike,
            "net_gex": round(net, 2),
            "call_gex": round(d["call_gex"], 2),
            "put_gex": round(d["put_gex"], 2),
        })

    total_net = sum(b["net_gex"] for b in bars)

    # --- Key levels ---
    # Call wall: strike with highest call GEX (resistance)
    call_wall = max(bars, key=lambda b: b["call_gex"])["strike"] if bars else None
    # Put wall: strike with highest put GEX (support)
    put_wall = max(bars, key=lambda b: b["put_gex"])["strike"] if bars else None
    # Gamma flip: strike nearest spot where net GEX crosses zero
    gamma_flip = _find_gamma_flip(bars, spot)

    return {
        "symbol": symbol,
        "spot": round(spot, 2),
        "bars": bars,
        "total_net_gex": round(total_net, 2),
        "call_wall": call_wall,
        "put_wall": put_wall,
        "gamma_flip": gamma_flip,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
