interface Props {
  connected: boolean;
  isDark: boolean;
}

export function StatusBar({ connected, isDark }: Props) {
  const textMuted = isDark ? "text-[#6b7280]" : "text-[#64748b]";

  return (
    <div className={`flex items-center gap-1.5 text-xs ${textMuted}`}>
      <span
        className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-[#22c55e]" : "bg-[#ef4444]"}`}
        style={{ boxShadow: connected ? "0 0 4px #22c55e" : undefined }}
      />
      {connected ? "Live" : "Reconnecting…"}
    </div>
  );
}
