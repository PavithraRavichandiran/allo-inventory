import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Allo Inventory",
  description: "Inventory reservation system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50">
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 font-semibold text-slate-800">
              <img
                src="https://media.allohealth.care/allo-logo-v1.png"
                alt="Allo Health"
                className="h-14 w-14 object-contain"
              />
              
            </Link>
            <nav className="flex items-center gap-1">
              <Link
                href="/"
                className="px-3 py-1.5 text-sm text-[#572AC8] hover:text-[#21143F] hover:bg-slate-100 rounded-md transition-colors"
              >
                Products
              </Link>
              <Link
                href="/reservations"
                className="px-3 py-1.5 text-sm text-[#572AC8] hover:text-[#21143F] hover:bg-slate-100 rounded-md transition-colors"
              >
                Reservations
              </Link>
            </nav>
          </div>
        </header>
        <div className="flex-1">{children}</div>
        <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400">
          Allo Health Inventory · Reservations expire after 10 minutes
        </footer>
      </body>
    </html>
  );
}
