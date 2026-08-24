import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";

// Tipografia da marca Novo Millenium: Fredoka (arredondada, para títulos) +
// Nunito (corpo, alta legibilidade — importante pro público de melhor idade).
const fredoka = Fredoka({
  variable: "--fredoka",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const nunito = Nunito({
  variable: "--nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "Conecta · Novo Millenium",
    template: "%s · Conecta",
  },
  description: "Sistema interno da Novo Millenium — turmas, frequência, saúde e financeiro.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${fredoka.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
