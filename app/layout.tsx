import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "楽 Raku Player",
  description: "YouTube音楽ストリーミングプレーヤー",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Rampart+One&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-gothic antialiased">{children}</body>
    </html>
  );
}
