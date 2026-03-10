import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from('ventas')
    .select(
      'id,folio,total,metodo_pago,created_at,monto_recibido,cambio,venta_detalle(cantidad,precio_unitario,subtotal,productos(nombre,presentacion))',
    )
    .eq('id', params.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
