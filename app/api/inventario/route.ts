import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function GET() {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from('productos')
    .select('id,nombre,categoria,presentacion,stock_actual,stock_minimo,activo,created_at')
    .order('nombre', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}
