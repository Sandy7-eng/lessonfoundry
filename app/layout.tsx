import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LessonFoundry — Teacher-Controlled Learning Material Generation",
  description:
    "A teacher-facing Generative AI learning-material generation system.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-screen flex-col overflow-x-hidden bg-[#fbfbfb] text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50 font-sans">
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
