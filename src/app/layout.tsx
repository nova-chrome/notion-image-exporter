import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  JetBrains_Mono,
  Merriweather,
} from "next/font/google";
import "./globals.css";
import { QueryProvider } from "~/components/query-provider";
import { cn } from "~/lib/utils";

const merriweatherHeading = Merriweather({
  subsets: ["latin"],
  variable: "--font-heading",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Notion Image Exporter",
  description:
    "Export images from a Notion page via the API as a ZIP—avoid WebP browser saves.",
  icons: {
    icon: [
      {
        url: "/assets/nie-logo-simple-transparent.png",
        sizes: "1024x1024",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/assets/nie-logo-simple-transparent.png",
        sizes: "1024x1024",
        type: "image/png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-mono",
        jetbrainsMono.variable,
        merriweatherHeading.variable,
      )}
    >
      <body className="min-h-full flex flex-col">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
