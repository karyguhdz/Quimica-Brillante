'use client';

import { AppShell } from '@/components/app-shell';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type Producto = {
  id: string;
  nombre: string;
  categoria: string;
  presentacion: string;
  precio: number;
  stock_actual: number;
  stock_minimo: number;
  activo: boolean;
  created_at: string;
};

type FormState = {
  nombre: string;
  categoria: string;
  presentacion: string;
  precio: string;
  stock_inicial: string;
  stock_minimo: string;
};

const initialForm: FormState = {
  nombre: '',
  categoria: '',
  presentacion: '',
  precio: '',
  stock_inicial: '',
  stock_minimo: '',
};

function isValidForm(form: FormState, isEditing: boolean) {
  if (!form.nombre.trim() || !form.categoria.trim() || !form.presentacion.trim()) return false;
  if (form.precio === '' || Number(form.precio) < 0) return false;
  if (form.stock_minimo === '' || Number(form.stock_minimo) < 0 || !Number.isInteger(Number(form.stock_minimo))) return false;
  if (!isEditing && (form.stock_inicial === '' || Number(form.stock_inicial) < 0 || !Number.isInteger(Number(form.stock_inicial)))) {
    return false;
  }
  return true;
}

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);

  const isEditing = useMemo(() => Boolean(editingProduct), [editingProduct]);

  const loadProductos = async (query = '') => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/productos${query ? `?q=${encodeURIComponent(query)}` : ''}`);
      const json = (await response.json()) as { data?: Producto[]; error?: string };
      if (!response.ok) throw new Error(json.error || 'No se pudo cargar productos.');
      setProductos(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = setTimeout(() => {
      void loadProductos(search);
    }, 300);
    return () => clearTimeout(id);
  }, [search]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setForm(initialForm);
    setModalOpen(true);
  };

  const openEditModal = (producto: Producto) => {
    setEditingProduct(producto);
    setForm({
      nombre: producto.nombre,
      categoria: producto.categoria,
      presentacion: producto.presentacion,
      precio: String(producto.precio),
      stock_inicial: '',
      stock_minimo: String(producto.stock_minimo),
    });
    setModalOpen(true);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValidForm(form, isEditing)) {
      setError('Completa todos los campos obligatorios con valores válidos.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        nombre: form.nombre,
        categoria: form.categoria,
        presentacion: form.presentacion,
        precio: Number(form.precio),
        stock_minimo: Number(form.stock_minimo),
        ...(isEditing ? {} : { stock_inicial: Number(form.stock_inicial) }),
      };

      const endpoint = isEditing ? `/api/productos/${editingProduct?.id}` : '/api/productos';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error || 'No se pudo guardar el producto.');

      setModalOpen(false);
      setForm(initialForm);
      setEditingProduct(null);
      await loadProductos(search);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setSaving(false);
    }
  };

  const deactivateProduct = async (producto: Producto) => {
    const confirmed = window.confirm(`¿Deseas desactivar "${producto.nombre}"?`);
    if (!confirmed) return;

    setError('');
    try {
      const response = await fetch(`/api/productos/${producto.id}`, { method: 'PATCH' });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error || 'No se pudo desactivar el producto.');
      await loadProductos(search);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado.');
    }
  };

  return (
    <AppShell title="Módulo de productos">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre, categoría o presentación"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2 sm:max-w-md"
          />

          <button
            type="button"
            onClick={openCreateModal}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Agregar producto
          </button>
        </div>

        {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Categoría</th>
                <th className="px-3 py-2">Presentación</th>
                <th className="px-3 py-2">Precio</th>
                <th className="px-3 py-2">Stock</th>
                <th className="px-3 py-2">Stock mínimo</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={8}>
                    Cargando productos...
                  </td>
                </tr>
              ) : productos.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={8}>
                    No hay productos para mostrar.
                  </td>
                </tr>
              ) : (
                productos.map((producto) => (
                  <tr key={producto.id} className="border-b border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-900">{producto.nombre}</td>
                    <td className="px-3 py-2">{producto.categoria}</td>
                    <td className="px-3 py-2">{producto.presentacion}</td>
                    <td className="px-3 py-2">${Number(producto.precio).toFixed(2)}</td>
                    <td className="px-3 py-2">{producto.stock_actual}</td>
                    <td className="px-3 py-2">{producto.stock_minimo}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          producto.activo ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {producto.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(producto)}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          Editar
                        </button>
                        {producto.activo ? (
                          <button
                            type="button"
                            onClick={() => deactivateProduct(producto)}
                            className="rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                          >
                            Desactivar
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <section className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">{isEditing ? 'Editar producto' : 'Nuevo producto'}</h3>
            <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                Nombre *
                <input
                  required
                  value={form.nombre}
                  onChange={(event) => setForm((prev) => ({ ...prev, nombre: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-brand-500 focus:ring-2"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Categoría *
                <input
                  required
                  value={form.categoria}
                  onChange={(event) => setForm((prev) => ({ ...prev, categoria: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-brand-500 focus:ring-2"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Presentación *
                <input
                  required
                  value={form.presentacion}
                  onChange={(event) => setForm((prev) => ({ ...prev, presentacion: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-brand-500 focus:ring-2"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Precio *
                <input
                  required
                  min={0}
                  step="0.01"
                  type="number"
                  value={form.precio}
                  onChange={(event) => setForm((prev) => ({ ...prev, precio: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-brand-500 focus:ring-2"
                />
              </label>

              {!isEditing ? (
                <label className="text-sm font-medium text-slate-700">
                  Stock inicial *
                  <input
                    required
                    min={0}
                    step="1"
                    type="number"
                    value={form.stock_inicial}
                    onChange={(event) => setForm((prev) => ({ ...prev, stock_inicial: event.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-brand-500 focus:ring-2"
                  />
                </label>
              ) : null}

              <label className="text-sm font-medium text-slate-700">
                Stock mínimo *
                <input
                  required
                  min={0}
                  step="1"
                  type="number"
                  value={form.stock_minimo}
                  onChange={(event) => setForm((prev) => ({ ...prev, stock_minimo: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-brand-500 focus:ring-2"
                />
              </label>

              <div className="mt-2 flex justify-end gap-2 sm:col-span-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setEditingProduct(null);
                    setForm(initialForm);
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear producto'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}
