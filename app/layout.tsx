import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vision Advisors | Estrategia Contable, Fiscal y Corporativa",
  description: "Asesoría integral contable, fiscal y legal corporativa para empresas que quieren crecer con claridad y certeza.",
  icons: { icon: "/brand/vision-advisors-logo.png" },
  openGraph: {
    title: "Vision Advisors | Claridad para decidir. Visión para crecer.",
    description: "Estrategia contable, fiscal y corporativa para empresas.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Vision Advisors" }],
    type: "website",
    locale: "es_MX",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vision Advisors",
    description: "Claridad para decidir. Visión para crecer.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="es"><body>{children}</body></html>;
}
