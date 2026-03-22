import { useEffect, useRef, useState } from "react";
import type { GexPayload } from "../types/gex";

export function useGexWebSocket(url: string) {
  const [data, setData] = useState<GexPayload | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let destroyed = false;

    function connect() {
      if (destroyed) return;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!destroyed) setConnected(true);
      };

      ws.onmessage = (e: MessageEvent) => {
        if (!destroyed) {
          try {
            setData(JSON.parse(e.data) as GexPayload);
          } catch {
            // ignore malformed messages
          }
        }
      };

      ws.onclose = () => {
        if (!destroyed) {
          setConnected(false);
          reconnectTimer.current = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      destroyed = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [url]);

  return { data, connected };
}
