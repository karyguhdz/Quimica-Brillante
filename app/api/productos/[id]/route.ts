import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

type UpdatePayload = {
  nombre?: string;
  categoria?: string;
  presentacion?: string;
  precio?: number;
  stock_minimo?: number;
};

function validateUpdate(payload: UpdatePayload) {
  const requiredText = ['nombre', 'categoria', 'presentacion'] as const;

  for (const field of requiredText) {
    const value = payload[field];
    if (!value || String(value).trim().length === 0) {
      return `El campo ${field} es obligatorio.`;
    }
  }

  if (typeof payload.precio !== 'number' || Number.isNaN(payload.precio) || payload.precio < 0) {
    return 'El precio debe ser un número mayor o igual a 0.';
  }

  if (
    typeof payload.stock_minimo !== 'number' ||
    Number.isNaN(payload.stock_minimo) ||
    payload.stock_minimo < 0 ||
    !Number.isInteger(payload.stock_minimo)
  ) {
    return 'El stock mínimo debe ser un entero mayor o igual a 0.';
  }

  return null;
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getSupabaseServerClient();
  const payload = (await request.json()) as UpdatePayload;
  const validationError = validateUpdate(payload);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('productos')
    .update({
      nombre: payload.nombre?.trim(),
      categoria: payload.categoria?.trim(),
      presentacion: payload.presentacion?.trim(),
      precio: payload.precio,
      stock_minimo: payload.stock_minimo,
    })
    .eq('id', params.id)
    .select('id,nombre,categoria,presentacion,precio,stock_actual,stock_minimo,activo,created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('productos')
    .update({ activo: false })
    .eq('id', params.id)
    .select('id,nombre,categoria,presentacion,precio,stock_actual,stock_minimo,activo,created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
