import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Papelaria - Sistema de Gestão & PDV",
  description: "Sistema completo de gestão para papelarias",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
      </body>
    </html>
  );
}
