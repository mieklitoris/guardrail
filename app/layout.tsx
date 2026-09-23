import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Guardrail | Security Lab",
  description: "Test access controls, investigate security events, and verify fixes in an isolated web security lab.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
