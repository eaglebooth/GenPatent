import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GenPatent — Decentralized Global Intellectual Property & Copyright Protection",
  description:
    "Automated on-chain patent filing, copyright assessment, licensing, and compliance dispute resolution powered by GenLayer's AI Jury.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
