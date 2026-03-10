import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

type ProductoPayload = {
  nombre?: string;
  categoria?: string;
  presentacion?: string;
  precio?: number;
  stock_inicial?: number;
  stock_minimo?: number;
};

function validatePayload(payload: ProductoPayload) {
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
    typeof payload.stock_inicial !== 'number' ||
    Number.isNaN(payload.stock_inicial) ||
    payload.stock_inicial < 0 ||
    !Number.isInteger(payload.stock_inicial)
  ) {
    return 'El stock inicial debe ser un entero mayor o igual a 0.';
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

export async function GET(request: NextRequest) {
  const supabase = await getSupabaseServerClient(request);
  const q = request.nextUrl.searchParams.get('q')?.trim();

  let query = supabase
    .from('productos')
    .select('id,nombre,categoria,presentacion,precio,stock_actual,stock_minimo,activo,created_at')
    .order('created_at', { ascending: false });

  if (q) {
    query = query.or(`nombre.ilike.%${q}%,categoria.ilike.%${q}%,presentacion.ilike.%${q}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient(request);
  const payload = (await request.json()) as ProductoPayload;
  const validationError = validatePayload(payload);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('productos')
    .insert({
      nombre: payload.nombre?.trim(),
      categoria: payload.categoria?.trim(),
      presentacion: payload.presentacion?.trim(),
      precio: payload.precio,
      stock_actual: payload.stock_inicial,
      stock_minimo: payload.stock_minimo,
      activo: true,
    })
    .select('id,nombre,categoria,presentacion,precio,stock_actual,stock_minimo,activo,created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
