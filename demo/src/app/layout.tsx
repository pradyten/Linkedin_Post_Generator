import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LinkedIn Post Generator | AI-Powered Multi-Agent Pipeline",
  description:
    "An AI-powered pipeline that fetches trending tech news, analyzes trends with Claude, and generates engaging LinkedIn posts through a 6-phase agent chain.",
  openGraph: {
    title: "LinkedIn Post Generator",
    description:
      "Multi-agent AI pipeline for generating engaging LinkedIn posts from trending tech news.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
