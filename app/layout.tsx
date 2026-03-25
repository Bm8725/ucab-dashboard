import "./globals.css";
import { Inter } from "next/font/google";
import { Analytics } from '@vercel/analytics/next';
import NoSleepComponent from "@/components/UcabNoSleep";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  metadataBase: new URL("https://ucab.ro"),

  // PWA - Face aplicația instalabilă
  manifest: "/manifest.json?v=0.9.13",

  // SHARE - Cum arată când trimiți link-ul pe WhatsApp/Social
  openGraph: {
    title: "UCAB Food",
    description: "Comandă mâncare de la restaurantele locale.",
    images: [{ url: "/ucabfood.png" }],
    type: "website",
  },
  
  twitter: {
    card: "summary_large_image",
    title: "UCAB Food",
    images: ["/ucabfood.png"],
  },

  // ICONIȚE - Pentru ecranul telefonului
  icons: {
    icon: "/ucabfood.png",
    apple: "/ucabfood.png",
  },
};

export const viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};



export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body className={`${inter.className} bg-[#050505] text-white min-h-screen antialiased`}>
        {children}
        <Analytics/>
        <NoSleepComponent/>
      </body>
    </html>
  );
}
