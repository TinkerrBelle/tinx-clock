import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";

const font = Bricolage_Grotesque({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Things Clock",
  description: "Track your shifts, hours and pay.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#5a2f17" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" suppressHydrationWarning>
      <body className={font.className} suppressHydrationWarning>{children}</body>
    </html>
  );
}
