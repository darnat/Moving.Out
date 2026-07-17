import type { Metadata, Viewport } from "next";
import { Space_Grotesk, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { FloatingActions } from "./components/FloatingActions";
import { BottomNav } from "./components/BottomNav";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Moving Out",
  description: "Track your moving boxes and storage unit",
};

export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${dmSans.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col isolate pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
        <div aria-hidden="true" className="bg-canvas fixed inset-0 -z-10 pointer-events-none" />
        {children}
        <FloatingActions />
        <BottomNav />
      </body>
    </html>
  );
}
