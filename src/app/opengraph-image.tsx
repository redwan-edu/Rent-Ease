import { ImageResponse } from "next/og";

// The preview card shown when the site is shared on WhatsApp, Facebook, X and others.
export const alt = "Rent Ease: simple rent management app for landlords";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#fbfbfa",
          color: "#191918",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 34, fontWeight: 700, letterSpacing: "-0.02em" }}>Rent Ease</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.04em" }}>
            Know who paid.
          </div>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.04em" }}>
            Know what&apos;s left.
          </div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 32, color: "#55544f" }}>
            Rent, tenants and properties, tracked from your phone.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", width: 520, height: 12, borderRadius: 6, background: "#efeeea" }}>
            <div style={{ display: "flex", width: 364, height: 12, borderRadius: 6, background: "#346538" }} />
          </div>
          <div style={{ display: "flex", marginLeft: 24, fontSize: 28, color: "#72716c" }}>70% of rent collected</div>
        </div>
      </div>
    ),
    size,
  );
}
