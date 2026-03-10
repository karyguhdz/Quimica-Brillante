import Image from 'next/image';
import Link from 'next/link';
import { ReactNode } from 'react';

const navigation = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/productos', label: 'Productos' },
  { href: '/inventario', label: 'Inventario' },
  { href: '/ventas', label: 'Ventas' },
  { href: '/historial-ventas', label: 'Historial de ventas' },
];

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Image
              src="/logo-quimica-brillante.svg"
              alt="Logo Química Brillante"
              width={40}
              height={40}
              className="h-10 w-10"
            />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-brand-700">Punto de Venta</p>
              <h1 className="text-xl font-semibold text-slate-900">Química Brillante</h1>
            </div>
          </div>
          <Link
            href="/login"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            Cerrar sesión
          </Link>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[240px_1fr]">
        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-3">
          <nav className="flex flex-col gap-1">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-brand-50 hover:text-brand-700"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
