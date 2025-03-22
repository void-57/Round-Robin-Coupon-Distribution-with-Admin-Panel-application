import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Coupon Distribution System",
  description: "Round-Robin Coupon Distribution with Admin Panel",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#1f2937",
              color: "#fff",
              padding: "16px",
              borderRadius: "8px",
              fontSize: "16px",
              maxWidth: "400px",
              textAlign: "center" as const,
            },
            success: {
              style: {
                background: "#065f46",
                fontWeight: "500",
              },
              icon: "🎉",
            },
            error: {
              style: {
                background: "#dc2626",
                fontWeight: "500",
              },
              icon: "❌",
              duration: 5000,
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
