import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Grupo Solitium - Portal de Gestión Comercial & Objetivos Dinámicos',
  description: 'Seguimiento en tiempo real de cuotas, liquidaciones, aceleradores anuales y bonos para comerciales y directores de Grupo Solitium.',
  icons: {
    icon: '/logo-solitium.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
