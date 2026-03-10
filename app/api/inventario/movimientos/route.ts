import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

type MovimientoPayload = {
  producto_id?: string;
  tipo_entrada_salida?: 'entrada' | 'salida' | 'ajuste';
  cantidad?: number;
  motivo?: string;
};

function validatePayload(payload: MovimientoPayload) {
  if (!payload.producto_id) return 'El producto es obligatorio.';

  if (!payload.tipo_entrada_salida || !['entrada', 'salida', 'ajuste'].includes(payload.tipo_entrada_salida)) {
    return 'El tipo de movimiento es inválido.';
  }

  if (typeof payload.cantidad !== 'number' || Number.isNaN(payload.cantidad) || payload.cantidad <= 0 || !Number.isInteger(payload.cantidad)) {
    return 'La cantidad debe ser un entero mayor a 0.';
  }

  if (!payload.motivo || payload.motivo.trim().length === 0) {
    return 'El motivo es obligatorio.';
  }

  return null;
}

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient(request);
  const payload = (await request.json()) as MovimientoPayload;
  const validationError = validatePayload(payload);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('inventario_movimientos')
    .insert({
      producto_id: payload.producto_id,
      tipo_entrada_salida: payload.tipo_entrada_salida,
      cantidad: payload.cantidad,
      motivo: payload.motivo?.trim(),
    })
    .select('id,producto_id,tipo_entrada_salida,cantidad,motivo,created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
