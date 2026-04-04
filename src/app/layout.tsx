import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Marketing Agency",
  description: "Your AI marketing team argues so you don't have to — $3K/month agency replaced by agents",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="border-b border-[var(--border)] px-6 py-4">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <h1 className="text-xl font-bold">
              <span className="gradient-text">AI Marketing Agency</span>
            </h1>
            <span className="text-sm text-gray-400">
              Powered by InsForge + MiniMax + ElevenLabs
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
