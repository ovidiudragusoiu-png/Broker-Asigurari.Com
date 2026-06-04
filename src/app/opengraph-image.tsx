import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Sigur.Ai — Fii sigur. Fii asigurat.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 72,
          background: "linear-gradient(135deg, #0F172A 0%, #1E3A8A 55%, #2563EB 100%)",
          color: "#ffffff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ fontSize: 28, opacity: 0.9, marginBottom: 16 }}>
          Asigurări online în România
        </div>
        <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05 }}>
          Sigur<span style={{ color: "#F97316" }}>.Ai</span>
        </div>
        <div style={{ fontSize: 36, marginTop: 24, opacity: 0.95 }}>
          Fii sigur. Fii asigurat.
        </div>
      </div>
    ),
    { ...size }
  );
}
