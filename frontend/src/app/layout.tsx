// frontend/src/app/layout.tsx
import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Geist, Geist_Mono } from "next/font/google";
import Footer from './Footer';
import { ThemeProvider } from './ThemeProvider';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Skipass EarlyBird Checker",
  description: "Let's check for when good deals are released",
   keywords: "Skipass, Ski resort, mountain, earlybird, deals",
   openGraph: {
     title: "Skipass earlybird Deals Tracker - Find earlybird deals",
     description: "App to track deals for Skipass Earlybird Prices.",
     type: "website",
     url: "https://skipass-earlybird-checker.louisvolant.com",
     images: ["/icon.png"],
   },
   icons: [
     { rel: "icon", url: "/icon.svg" },
     { rel: "apple-touch-icon", url: "/icon.svg" },
   ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          {children}
          <Footer />
        </ThemeProvider>
        <SpeedInsights/>
      </body>
    </html>
  );
}