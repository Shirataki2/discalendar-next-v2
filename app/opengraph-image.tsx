import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Discalendar - Discordコミュニティの予定管理をもっと便利に";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function OpenGraphImage(): Promise<ImageResponse> {
  const fontData = await readFile(
    join(process.cwd(), "public/UniSansHeavy.otf")
  );

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, #1875d1 0%, #1054a0 100%)",
        color: "#ffffff",
        fontFamily: "UniSansHeavy",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <svg
          fill="none"
          height="64"
          role="img"
          viewBox="0 0 24 24"
          width="64"
          xmlns="http://www.w3.org/2000/svg"
        >
          <title>Calendar icon</title>
          <rect
            fill="rgba(255,255,255,0.2)"
            height="20"
            rx="4"
            width="20"
            x="2"
            y="3"
          />
          <path
            d="M2 7 L22 7"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="1.5"
          />
          <rect fill="#ffffff" height="3" rx="1" width="3" x="6" y="10" />
          <rect fill="#ffffff" height="3" rx="1" width="3" x="11" y="10" />
          <rect fill="#ffffff" height="3" rx="1" width="3" x="16" y="10" />
          <rect fill="#ffffff" height="3" rx="1" width="3" x="6" y="15" />
          <rect fill="#ffffff" height="3" rx="1" width="3" x="11" y="15" />
        </svg>
      </div>
      <div
        style={{
          fontSize: 72,
          fontWeight: 800,
          letterSpacing: "-0.02em",
          marginBottom: "16px",
        }}
      >
        Discalendar
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 400,
          opacity: 0.9,
          fontFamily: "sans-serif",
        }}
      >
        Discordコミュニティの予定管理をもっと便利に
      </div>
    </div>,
    {
      ...size,
      fonts: [
        {
          name: "UniSansHeavy",
          data: fontData,
          style: "normal",
          weight: 800,
        },
      ],
    }
  );
}
