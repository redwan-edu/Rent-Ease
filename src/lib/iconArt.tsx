import { ImageResponse } from "next/og";

/** App icon: ink tile with a white roof and a mint "home" dot. */
export function iconArt(size: number, rounded: boolean) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#141414",
          borderRadius: rounded ? size * 0.24 : 0,
        }}
      >
        <svg
          width={size * 0.56}
          height={size * 0.56}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V20h14V9.5" />
          <circle cx="12" cy="14" r="2.2" fill="#86d8ab" stroke="none" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
