import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { clerkAppearance } from "@/lib/clerkAppearance";
import { fontScaleBootScript } from "@/lib/fontScale";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Rent Ease",
  description: "The simplest way to manage rent, tenants and properties.",
  appleWebApp: { capable: true, title: "Rent Ease", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f4f4f0",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={geist.variable} suppressHydrationWarning>
      <head>
        {/* Apply the user's saved text size before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: fontScaleBootScript }} />
      </head>
      <body>
        <ClerkProvider appearance={clerkAppearance}>
          <ConvexClientProvider>
            <div className="device">
              <div className="screen">{children}</div>
            </div>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
