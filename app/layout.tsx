import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "楽 Raku Player",
  description: "Spotify音楽ストリーミングプレーヤー",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className="font-gothic antialiased">{children}</body>
    </html>
  );
}
