import "rbrgs/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import { Jersey_25, Anton, Archivo } from "next/font/google";

import { TRPCReactProvider } from "rbrgs/trpc/react";
import Navbar from "./_components/navbar";

export const metadata: Metadata = {
  title: "Candidates",
  description: "Candidates 2024 by RoBorregos",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const jersey_25 = Jersey_25({
  subsets: ["latin"],
  display: "swap",
  weight: ["400"],
  variable: "--font-jersey-25",
});

const anton = Anton({
  subsets: ["latin"],
  display: "swap",
  weight: ["400"],
  variable: "--font-anton",
});

const archivo = Archivo({
  subsets: ["latin"],
  display: "swap",
  weight: ["400"],
  variable: "--font-archivo",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${jersey_25.variable} ${anton.variable} ${archivo.variable}`}
    >
      <body className="bg-black">
        <Navbar />
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
