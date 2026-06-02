"use client";

const DOT_COLORS = [
  "#E53935",
  "#2196F3",
  "#4CAF50",
  "#FFEB3B",
  "#F97316",
] as const;

export interface ColoredDotsLoaderProps {
  subtitle?: string;
  className?: string;
  "aria-label"?: string;
}

export default function ColoredDotsLoader({
  subtitle = "Se generează ofertele...",
  className = "",
  "aria-label": ariaLabel,
}: ColoredDotsLoaderProps) {
  const statusLabel = ariaLabel ?? subtitle ?? "Se încarcă";

  return (
    <div
      className={`flex flex-col items-center gap-3 ${className}`.trim()}
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label={statusLabel}
    >
      <div className="flex items-end gap-2.5" aria-hidden="true">
        {DOT_COLORS.map((color, index) => (
          <span
            key={color}
            className="colored-dot-loader-dot h-3 w-3 rounded-full shadow-sm"
            style={{
              backgroundColor: color,
              animationDelay: `${index * 0.12}s`,
            }}
          />
        ))}
      </div>
      {subtitle ? (
        <p className="text-sm font-medium text-gray-500">{subtitle}</p>
      ) : null}
    </div>
  );
}
