import "./globals.css";
import { Inter } from "next/font/google";
import { Analytics } from '@vercel/analytics/next';

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body className={`${inter.className} bg-[#050505] text-white min-h-screen antialiased`}>
        {children}
        <Analytics/>
      </body>
    </html>
  );
}
