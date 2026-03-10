'use client';

import { AppShell } from '@/components/app-shell';
import { jsPDF } from 'jspdf';
import Link from 'next/link';
import { useMemo, useState } from 'react';

type Producto = {
  id: string;
  nombre: string;
  categoria: string;
  presentacion: string;
  precio: number;
  stock_actual: number;
  activo: boolean;
};

type CartItem = {
  producto_id: string;
  nombre: string;
  precio_unitario: number;
  cantidad: number;
  stock_actual: number;
};

type MetodoPago = 'efectivo' | 'transferencia' | 'tarjeta';

type TicketDetalle = {
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  productos: {
    nombre: string;
    presentacion: string;
  };
};

type TicketVenta = {
  id: string;
  folio: string;
  total: number;
  metodo_pago: MetodoPago;
  created_at: string;
  monto_recibido: number | null;
  cambio: number;
  venta_detalle: TicketDetalle[];
};

function exportTicketPdf(ticket: TicketVenta) {
  const doc = new jsPDF();
  let y = 16;

  doc.setFontSize(16);
  doc.text('Química Brillante', 14, y);
  y += 7;
  doc.setFontSize(11);
  doc.text(`Ticket de venta - Folio: ${ticket.folio}`, 14, y);
  y += 6;
  doc.text(`Fecha: ${new Date(ticket.created_at).toLocaleString('es-MX')}`, 14, y);
  y += 6;

  doc.text('-------------------------------------------', 14, y);
  y += 6;

  ticket.venta_detalle.forEach((item) => {
    doc.text(`${item.productos.nombre} (${item.productos.presentacion})`, 14, y);
    y += 5;
    doc.text(`Cant: ${item.cantidad}  PU: $${Number(item.precio_unitario).toFixed(2)}  Sub: $${Number(item.subtotal).toFixed(2)}`, 14, y);
    y += 6;
  });

  doc.text('-------------------------------------------', 14, y);
  y += 6;
  doc.text(`Total: $${Number(ticket.total).toFixed(2)}`, 14, y);
  y += 6;
  doc.text(`Método de pago: ${ticket.metodo_pago}`, 14, y);
  y += 6;

  if (ticket.metodo_pago === 'efectivo') {
    doc.text(`Monto recibido: $${Number(ticket.monto_recibido || 0).toFixed(2)}`, 14, y);
    y += 6;
    doc.text(`Cambio: $${Number(ticket.cambio || 0).toFixed(2)}`, 14, y);
  }

  doc.save(`ticket-${ticket.folio}.pdf`);
}

export default function VentasPage() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Producto[]>([]);
  const [searching, setSearching] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [loadingConfirm, setLoadingConfirm] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [lastSaleId, setLastSaleId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const subtotal = useMemo(
    () => cart.reduce((acc, item) => acc + item.cantidad * item.precio_unitario, 0),
    [cart],
  );

  const total = subtotal;
  const recibido = Number(montoRecibido || 0);
  const cambio = metodoPago === 'efectivo' ? recibido - total : 0;

  const searchProducts = async (value: string) => {
    setSearch(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }

    setSearching(true);
    setError('');
    try {
      const response = await fetch(`/api/productos?q=${encodeURIComponent(value)}`);
      const json = (await response.json()) as { data?: Producto[]; error?: string };
      if (!response.ok) throw new Error(json.error || 'No se pudo buscar productos.');

      const available = (json.data || []).filter((p) => p.activo && p.stock_actual > 0);
      setResults(available);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al buscar productos.');
    } finally {
      setSearching(false);
    }
  };

  const addToCart = (product: Producto) => {
    setError('');
    setSuccess('');
    setCart((prev) => {
      const found = prev.find((item) => item.producto_id === product.id);
      if (found) {
        if (found.cantidad >= product.stock_actual) return prev;
        return prev.map((item) =>
          item.producto_id === product.id ? { ...item, cantidad: item.cantidad + 1 } : item,
        );
      }

      return [
        ...prev,
        {
          producto_id: product.id,
          nombre: product.nombre,
          precio_unitario: Number(product.precio),
          cantidad: 1,
          stock_actual: product.stock_actual,
        },
      ];
    });
  };

  const updateQuantity = (productId: string, value: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.producto_id !== productId) return item;
        const clamped = Math.max(1, Math.min(value, item.stock_actual));
        return { ...item, cantidad: clamped };
      }),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.producto_id !== productId));
  };

  const confirmSale = async () => {
    setError('');
    setSuccess('');
    setLastSaleId('');

    if (cart.length === 0) {
      setError('Agrega productos al carrito antes de confirmar la venta.');
      return;
    }

    if (metodoPago === 'efectivo' && recibido < total) {
      setError('El monto recibido debe ser mayor o igual al total.');
      return;
    }

    setLoadingConfirm(true);
    try {
      const response = await fetch('/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metodo_pago: metodoPago,
          monto_recibido: metodoPago === 'efectivo' ? recibido : null,
          items: cart.map((item) => ({
            producto_id: item.producto_id,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
          })),
        }),
      });

      const json = (await response.json()) as { data?: { folio?: string; venta_id?: string }; error?: string };
      if (!response.ok) throw new Error(json.error || 'No se pudo confirmar la venta.');

      setSuccess(`Venta registrada correctamente. Folio: ${json.data?.folio || 'N/A'}`);
      setLastSaleId(json.data?.venta_id || '');
      setCart([]);
      setResults([]);
      setSearch('');
      setMontoRecibido('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al confirmar venta.');
    } finally {
      setLoadingConfirm(false);
    }
  };

  const handleExportLastSalePdf = async () => {
    if (!lastSaleId) return;
    setLoadingPdf(true);
    setError('');
    try {
      const response = await fetch(`/api/ventas/${lastSaleId}`);
      const json = (await response.json()) as { data?: TicketVenta; error?: string };
      if (!response.ok || !json.data) throw new Error(json.error || 'No se pudo obtener el ticket.');
      exportTicketPdf(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo exportar el ticket.');
    } finally {
      setLoadingPdf(false);
    }
  };

  return (
    <AppShell title="Módulo de ventas">
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h3 className="text-lg font-semibold text-slate-900">Buscador de productos</h3>
          <input
            value={search}
            onChange={(event) => void searchProducts(event.target.value)}
            placeholder="Buscar por nombre, categoría o presentación"
            className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2"
          />

          <div className="mt-4 space-y-2">
            {searching ? <p className="text-sm text-slate-500">Buscando...</p> : null}
            {!searching && search.trim().length >= 2 && results.length === 0 ? (
              <p className="text-sm text-slate-500">No se encontraron productos disponibles.</p>
            ) : null}

            {results.map((product) => (
              <div key={product.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <div>
                  <p className="font-medium text-slate-900">{product.nombre}</p>
                  <p className="text-xs text-slate-600">
                    {product.presentacion} · Stock: {product.stock_actual}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-semibold text-slate-800">${Number(product.precio).toFixed(2)}</p>
                  <button
                    type="button"
                    onClick={() => addToCart(product)}
                    className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h3 className="text-lg font-semibold text-slate-900">Carrito</h3>

          <div className="mt-3 space-y-3">
            {cart.length === 0 ? <p className="text-sm text-slate-500">El carrito está vacío.</p> : null}
            {cart.map((item) => (
              <div key={item.producto_id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">{item.nombre}</p>
                    <p className="text-xs text-slate-600">${item.precio_unitario.toFixed(2)} c/u</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.producto_id)}
                    className="text-xs font-semibold text-red-700 hover:underline"
                  >
                    Eliminar
                  </button>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <input
                    type="number"
                    min={1}
                    max={item.stock_actual}
                    value={item.cantidad}
                    onChange={(event) => updateQuantity(item.producto_id, Number(event.target.value))}
                    className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                  />
                  <p className="text-sm font-semibold text-slate-900">
                    ${(item.cantidad * item.precio_unitario).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-semibold text-slate-900">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base">
              <span className="font-semibold text-slate-900">Total</span>
              <span className="font-bold text-slate-900">${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              Método de pago
              <select
                value={metodoPago}
                onChange={(event) => setMetodoPago(event.target.value as MetodoPago)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option>
              </select>
            </label>

            {metodoPago === 'efectivo' ? (
              <>
                <label className="block text-sm font-medium text-slate-700">
                  Monto recibido
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={montoRecibido}
                    onChange={(event) => setMontoRecibido(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
                <p className="text-sm">
                  Cambio: <span className="font-semibold">${(cambio > 0 ? cambio : 0).toFixed(2)}</span>
                </p>
              </>
            ) : null}
          </div>

          {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          {success ? <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{success}</p> : null}

          <button
            type="button"
            onClick={() => void confirmSale()}
            disabled={loadingConfirm}
            className="mt-4 w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loadingConfirm ? 'Confirmando venta...' : 'Confirmar venta'}
          </button>

          {lastSaleId ? (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Link
                href={`/tickets/${lastSaleId}`}
                className="rounded-lg border border-slate-300 px-3 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Vista imprimible
              </Link>
              <button
                type="button"
                onClick={() => void handleExportLastSalePdf()}
                disabled={loadingPdf}
                className="rounded-lg border border-brand-300 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-70"
              >
                {loadingPdf ? 'Exportando...' : 'Exportar PDF'}
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
