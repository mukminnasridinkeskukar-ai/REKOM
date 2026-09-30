import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "E-REKOM — Tata Kelola Rekomendasi Kepala Dinas Kesehatan Kutai Kartanegara",
  description:
    "Platform tata kelola surat rekomendasi Dinas Kesehatan Kabupaten Kutai Kartanegara: pengajuan daring, verifikasi berkas lintas bidang, penomoran otomatis, TTD Kadis, dan verifikasi keaslian surat via QR Code.",
  keywords: ["E-REKOM", "Dinkes Kukar", "rekomendasi", "Kutai Kartanegara", "surat rekomendasi"],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
