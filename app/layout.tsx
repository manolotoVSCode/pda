import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Ackermann · Evaluación de perfil conductual",
  description: "Plataforma de evaluación de perfil conductual basada en el modelo DISC. Genera informes de comportamiento para apoyar procesos de selección y desarrollo de personas.",
  openGraph: {
    title: "Ackermann · Evaluación de perfil conductual",
    description: "Plataforma de evaluación de perfil conductual basada en el modelo DISC.",
    images: [{ url: "/logo-ackermann.png", width: 831, height: 438 }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
