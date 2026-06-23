import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Free Canvas",
  description: "A free-form thinking space",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
