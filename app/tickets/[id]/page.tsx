'use client';

import Image from 'next/image';
import { jsPDF } from 'jspdf';
import { useEffect, useState } from 'react';

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
  metodo_pago: 'efectivo' | 'transferencia' | 'tarjeta';
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

export default function TicketPage({ params }: { params: { id: string } }) {
  const [ticket, setTicket] = useState<TicketVenta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/ventas/${params.id}`);
        const json = (await response.json()) as { data?: TicketVenta; error?: string };
        if (!response.ok || !json.data) throw new Error(json.error || 'No se pudo cargar ticket.');
        setTicket(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error inesperado.');
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [params.id]);

  if (loading) return <main className="p-8">Cargando ticket...</main>;
  if (error || !ticket) return <main className="p-8 text-red-700">{error || 'Ticket no encontrado.'}</main>;

  return (
    <main className="mx-auto max-w-2xl p-6 print:p-0">
      <div className="mb-4 flex gap-2 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
        >
          Imprimir
        </button>
        <button
          type="button"
          onClick={() => exportTicketPdf(ticket)}
          className="rounded-lg border border-brand-300 px-3 py-2 text-sm font-semibold text-brand-700"
        >
          Exportar PDF
        </button>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm shadow-sm print:rounded-none print:border-0 print:shadow-none">
        <div className="flex items-center gap-3">
          <Image src="/logo-quimica-brillante.svg" alt="Logo Química Brillante" width={40} height={40} className="h-10 w-10" />
          <div>
            <h1 className="text-xl font-bold">Química Brillante</h1>
            <p className="mt-1">Ticket de venta</p>
          </div>
        </div>
        <p className="mt-2">Folio: <strong>{ticket.folio}</strong></p>
        <p>Fecha y hora: {new Date(ticket.created_at).toLocaleString('es-MX')}</p>

        <div className="mt-4 border-t border-dashed border-slate-300 pt-3">
          {ticket.venta_detalle.map((item, index) => (
            <div key={`${item.productos.nombre}-${index}`} className="mb-3">
              <p className="font-semibold">{item.productos.nombre}</p>
              <p className="text-slate-600">{item.productos.presentacion}</p>
              <p>
                Cantidad: {item.cantidad} · Precio unitario: ${Number(item.precio_unitario).toFixed(2)} · Subtotal: ${Number(item.subtotal).toFixed(2)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t border-dashed border-slate-300 pt-3 space-y-1">
          <p>Total: <strong>${Number(ticket.total).toFixed(2)}</strong></p>
          <p>Método de pago: {ticket.metodo_pago}</p>
          {ticket.metodo_pago === 'efectivo' ? (
            <>
              <p>Monto recibido: ${Number(ticket.monto_recibido || 0).toFixed(2)}</p>
              <p>Cambio: ${Number(ticket.cambio || 0).toFixed(2)}</p>
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}
