import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

type VentaItem = {
  producto_id?: string;
  cantidad?: number;
  precio_unitario?: number;
};

type VentaPayload = {
  metodo_pago?: 'efectivo' | 'transferencia' | 'tarjeta';
  monto_recibido?: number;
  usuario_id?: string;
  items?: VentaItem[];
};

function validatePayload(payload: VentaPayload) {
  if (!payload.metodo_pago || !['efectivo', 'transferencia', 'tarjeta'].includes(payload.metodo_pago)) {
    return 'Método de pago inválido.';
  }

  if (!payload.items || payload.items.length === 0) {
    return 'La venta debe incluir al menos un producto.';
  }

  for (const item of payload.items) {
    if (!item.producto_id) return 'Cada item debe incluir producto_id.';
    if (!item.cantidad || !Number.isInteger(item.cantidad) || item.cantidad <= 0) {
      return 'La cantidad de cada item debe ser un entero mayor a 0.';
    }
    if (typeof item.precio_unitario !== 'number' || Number.isNaN(item.precio_unitario) || item.precio_unitario < 0) {
      return 'El precio unitario de cada item debe ser válido.';
    }
  }

  return null;
}

async function resolveUsuarioId(supabase: ReturnType<typeof getSupabaseServerClient>, requestedUserId?: string) {
  if (requestedUserId) return requestedUserId;

  const { data, error } = await supabase.from('usuarios').select('id').limit(1).maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error('No existe un usuario registrado. Crea al menos un usuario en la tabla usuarios.');

  return data.id;
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseServerClient();
  const payload = (await request.json()) as VentaPayload;
  const validationError = validatePayload(payload);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const usuarioId = await resolveUsuarioId(supabase, payload.usuario_id);

    const { data, error } = await supabase.rpc('fn_registrar_venta', {
      p_usuario_id: usuarioId,
      p_metodo_pago: payload.metodo_pago,
      p_monto_recibido: payload.monto_recibido ?? null,
      p_items: payload.items,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'No se pudo registrar la venta.' }, { status: 500 });
  }
}
