import type { Metadata, Viewport } from "next";
import { Montserrat, Playfair_Display, Ubuntu } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/components/Store";
import { CatalogProvider } from "@/components/Catalog";
import { Balloons, CartBar, Footer, Header, ProductSheet, SentSheet, Toast } from "@/components/Chrome";

const serif = Playfair_Display({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--f-serif", display: "swap" });
const display = Montserrat({ subsets: ["latin"], weight: ["500", "600", "700", "800", "900"], variable: "--f-display", display: "swap" });
const body = Ubuntu({ subsets: ["latin"], weight: ["400", "500", "700"], style: ["normal", "italic"], variable: "--f-body", display: "swap" });

export const metadata: Metadata = {
  title: "Sabores do Sul — Salgados, Pães e Cucas em Palmas-TO",
  description: "Salgados fritos e assados, buffet de minis e bolos caseiros sob encomenda em Palmas-TO. Monte seu pedido e envie pelo WhatsApp.",
};

export const viewport: Viewport = { themeColor: "#140C08" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${serif.variable} ${display.variable} ${body.variable}`}>
      <body>
        <noscript><style>{`[data-stagger]>*{opacity:1!important}`}</style></noscript>
        <CatalogProvider>
          <StoreProvider>
            <div className="shell">
              <Header />
              <main>{children}</main>
              <Footer />
            </div>
            <CartBar />
            <Toast />
            <ProductSheet />
            <SentSheet />
            <Balloons />
          </StoreProvider>
        </CatalogProvider>
      </body>
    </html>
  );
}
