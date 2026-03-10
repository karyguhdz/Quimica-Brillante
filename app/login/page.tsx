import Image from 'next/image';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-white px-6">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/60">
        <div className="flex items-center gap-3">
          <Image
            src="/logo-quimica-brillante.svg"
            alt="Logo Química Brillante"
            width={44}
            height={44}
            className="h-11 w-11"
          />
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-brand-700">Bienvenido</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Química Brillante</h1>
          </div>
        </div>
        <p className="mt-2 text-sm text-slate-600">Inicia sesión para acceder al sistema de punto de venta.</p>

        <form className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Correo electrónico
            <input
              type="email"
              placeholder="admin@quimicabrillante.com"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-brand-500 transition focus:ring-2"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Contraseña
            <input
              type="password"
              placeholder="••••••••"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-brand-500 transition focus:ring-2"
            />
          </label>

          <Link
            href="/dashboard"
            className="block w-full rounded-lg bg-brand-600 px-4 py-2 text-center font-medium text-white transition hover:bg-brand-700"
          >
            Entrar
          </Link>
        </form>
      </section>
    </main>
  );
}
