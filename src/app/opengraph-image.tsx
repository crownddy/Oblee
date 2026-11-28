import { ImageResponse } from "next/og";

export const alt = "Oblee — find the party you love";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Social card built from the existing brand colours and tagline. Event covers
 * live in a private bucket behind signed URLs that expire, so they cannot be
 * reused here.
 */
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
          padding: "80px",
          background: "linear-gradient(150deg, #3b1d9e 0%, #6a47f5 55%, #b026c9 100%)",
          color: "#ffffff",
        }}
      >
        <div style={{ fontSize: 132, fontWeight: 800, letterSpacing: "-0.04em" }}>Oblee</div>
        <div style={{ fontSize: 52, fontWeight: 600, marginTop: 12, opacity: 0.92 }}>
          Find the party you love
        </div>
        <div style={{ fontSize: 30, marginTop: 28, opacity: 0.78 }}>
          African event and party discovery
        </div>
      </div>
    ),
    size,
  );
}
