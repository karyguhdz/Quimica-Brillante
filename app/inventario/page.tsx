'use client';

import { AppShell } from '@/components/app-shell';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type ProductoInventario = {
  id: string;
  nombre: string;
  categoria: string;
  presentacion: string;
  stock_actual: number;
  stock_minimo: number;
  activo: boolean;
};

type FormState = {
  producto_id: string;
  tipo_entrada_salida: 'entrada' | 'salida' | 'ajuste';
  cantidad: string;
  motivo: string;
};

const initialForm: FormState = {
  producto_id: '',
  tipo_entrada_salida: 'entrada',
  cantidad: '',
  motivo: '',
};

export default function InventarioPage() {
  const [productos, setProductos] = useState<ProductoInventario[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState<FormState>(initialForm);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return productos;
    return productos.filter((p) =>
      [p.nombre, p.categoria, p.presentacion].some((value) => value.toLowerCase().includes(term)),
    );
  }, [productos, search]);

  const loadProductos = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/inventario');
      const json = (await response.json()) as { data?: ProductoInventario[]; error?: string };
      if (!response.ok) throw new Error(json.error || 'No se pudo cargar inventario.');
      setProductos(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProductos();
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!form.producto_id) {
      setError('Selecciona un producto.');
      return;
    }

    if (!form.cantidad || Number(form.cantidad) <= 0 || !Number.isInteger(Number(form.cantidad))) {
      setError('La cantidad debe ser un entero mayor a 0.');
      return;
    }

    if (!form.motivo.trim()) {
      setError('El motivo es obligatorio.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/inventario/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id: form.producto_id,
          tipo_entrada_salida: form.tipo_entrada_salida,
          cantidad: Number(form.cantidad),
          motivo: form.motivo,
        }),
      });

      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error || 'No se pudo registrar el movimiento.');

      setSuccess('Movimiento registrado correctamente.');
      setForm(initialForm);
      await loadProductos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Módulo de inventario">
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Stock actual por producto</h3>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar producto"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2 sm:max-w-sm"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2">Producto</th>
                  <th className="px-3 py-2">Categoría</th>
                  <th className="px-3 py-2">Presentación</th>
                  <th className="px-3 py-2">Stock actual</th>
                  <th className="px-3 py-2">Stock mínimo</th>
                  <th className="px-3 py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-3 py-4 text-slate-500" colSpan={6}>
                      Cargando inventario...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-slate-500" colSpan={6}>
                      No hay productos para mostrar.
                    </td>
                  </tr>
                ) : (
                  filtered.map((producto) => {
                    const lowStock = producto.activo && producto.stock_actual <= producto.stock_minimo;
                    return (
                      <tr
                        key={producto.id}
                        className={`border-b border-slate-100 ${lowStock ? 'bg-amber-50/80' : ''}`}
                      >
                        <td className="px-3 py-2 font-medium text-slate-900">{producto.nombre}</td>
                        <td className="px-3 py-2">{producto.categoria}</td>
                        <td className="px-3 py-2">{producto.presentacion}</td>
                        <td className={`px-3 py-2 font-semibold ${lowStock ? 'text-amber-700' : 'text-slate-800'}`}>
                          {producto.stock_actual}
                        </td>
                        <td className="px-3 py-2">{producto.stock_minimo}</td>
                        <td className="px-3 py-2">
                          {lowStock ? (
                            <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                              Stock bajo
                            </span>
                          ) : (
                            <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                              Normal
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="h-fit rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h3 className="text-lg font-semibold text-slate-900">Registrar movimiento manual</h3>
          <p className="mt-1 text-sm text-slate-600">Entradas y salidas por merma o ajuste.</p>

          <form className="mt-4 space-y-4" onSubmit={onSubmit}>
            <label className="block text-sm font-medium text-slate-700">
              Producto *
              <select
                required
                value={form.producto_id}
                onChange={(event) => setForm((prev) => ({ ...prev, producto_id: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none ring-brand-500 focus:ring-2"
              >
                <option value="">Selecciona un producto</option>
                {productos
                  .filter((p) => p.activo)
                  .map((producto) => (
                    <option key={producto.id} value={producto.id}>
                      {producto.nombre} ({producto.stock_actual})
                    </option>
                  ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Tipo de movimiento *
              <select
                value={form.tipo_entrada_salida}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    tipo_entrada_salida: event.target.value as FormState['tipo_entrada_salida'],
                  }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none ring-brand-500 focus:ring-2"
              >
                <option value="entrada">Entrada manual</option>
                <option value="salida">Salida por merma</option>
                <option value="ajuste">Salida por ajuste</option>
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Cantidad *
              <input
                required
                min={1}
                step={1}
                type="number"
                value={form.cantidad}
                onChange={(event) => setForm((prev) => ({ ...prev, cantidad: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-brand-500 focus:ring-2"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Motivo *
              <textarea
                required
                rows={3}
                value={form.motivo}
                onChange={(event) => setForm((prev) => ({ ...prev, motivo: event.target.value }))}
                placeholder="Ej. Merma por producto dañado"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-brand-500 focus:ring-2"
              />
            </label>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? 'Guardando...' : 'Guardar movimiento'}
            </button>
          </form>

          {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          {success ? <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{success}</p> : null}
        </section>
      </div>
    </AppShell>
  );
}
