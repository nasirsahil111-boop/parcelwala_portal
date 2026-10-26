import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Parcelwalah Partner Portal",
  description: "Place and track deliveries, and manage your prepaid wallet.",
};

export const viewport: Viewport = {
  // Partners run this on a shop counter phone; the layout is built for 360px up.
  width: "device-width",
  initialScale: 1,
  themeColor: "#f56a22",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
