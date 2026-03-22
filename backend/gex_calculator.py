from datetime import datetime, timezone


# Schwab API requires $ prefix for index option chains (SPX, NDX)
# Display names map the API symbol back to the label shown in the UI
SYMBOLS = ["SPY", "$SPX", "QQQ", "$NDX"]
DISPLAY_NAMES = {"$SPX": "SPX", "$NDX": "NDX"}


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
        })

    total_net = sum(b["net_gex"] for b in bars)

    return {
        "symbol": symbol,
        "spot": round(spot, 2),
        "bars": bars,
        "total_net_gex": round(total_net, 2),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
