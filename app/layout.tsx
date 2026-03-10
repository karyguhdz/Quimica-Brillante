import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Química Brillante POS',
  description: 'Punto de venta para tienda de productos de limpieza',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
