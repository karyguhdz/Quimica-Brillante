-- Esquema base para Química Brillante POS (Supabase/PostgreSQL)

create extension if not exists pgcrypto;

-- =========================
-- Tabla: usuarios
-- =========================
create table if not exists public.usuarios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  email text not null unique,
  rol text not null check (rol in ('admin', 'cajero', 'inventario')),
  created_at timestamptz not null default now()
);

-- =========================
-- Tabla: productos
-- =========================
create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria text not null,
  presentacion text not null,
  precio numeric(12,2) not null check (precio >= 0),
  stock_actual integer not null default 0 check (stock_actual >= 0),
  stock_minimo integer not null default 0 check (stock_minimo >= 0),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_productos_nombre on public.productos (nombre);
create index if not exists idx_productos_categoria on public.productos (categoria);

-- =========================
-- Tabla: inventario_movimientos
-- =========================
create table if not exists public.inventario_movimientos (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos(id) on update cascade on delete restrict,
  tipo_entrada_salida text not null check (tipo_entrada_salida in ('entrada', 'salida', 'ajuste')),
  cantidad integer not null check (cantidad > 0),
  motivo text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_inventario_movimientos_producto_id on public.inventario_movimientos (producto_id);
create index if not exists idx_inventario_movimientos_created_at on public.inventario_movimientos (created_at desc);

-- =========================
-- Tabla: ventas
-- =========================
create table if not exists public.ventas (
  id uuid primary key default gen_random_uuid(),
  folio text not null unique,
  total numeric(12,2) not null check (total >= 0),
  metodo_pago text not null check (metodo_pago in ('efectivo', 'tarjeta', 'transferencia', 'mixto')),
  monto_recibido numeric(12,2),
  cambio numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  usuario_id uuid not null references public.usuarios(id) on update cascade on delete restrict
);

create index if not exists idx_ventas_created_at on public.ventas (created_at desc);
create index if not exists idx_ventas_usuario_id on public.ventas (usuario_id);

alter table public.ventas add column if not exists monto_recibido numeric(12,2);
alter table public.ventas add column if not exists cambio numeric(12,2) not null default 0;

-- =========================
-- Tabla: venta_detalle
-- =========================
create table if not exists public.venta_detalle (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references public.ventas(id) on update cascade on delete cascade,
  producto_id uuid not null references public.productos(id) on update cascade on delete restrict,
  cantidad integer not null check (cantidad > 0),
  precio_unitario numeric(12,2) not null check (precio_unitario >= 0),
  subtotal numeric(12,2) not null check (subtotal >= 0)
);

create index if not exists idx_venta_detalle_venta_id on public.venta_detalle (venta_id);
create index if not exists idx_venta_detalle_producto_id on public.venta_detalle (producto_id);

-- ======================================================
-- Trigger: aplicar movimientos de inventario en stock
-- ======================================================
create or replace function public.fn_aplicar_movimiento_inventario()
returns trigger
language plpgsql
as $$
declare
  v_stock_actual integer;
  v_stock_nuevo integer;
begin
  select stock_actual
  into v_stock_actual
  from public.productos
  where id = new.producto_id
  for update;

  if v_stock_actual is null then
    raise exception 'Producto % no existe', new.producto_id;
  end if;

  if new.tipo_entrada_salida = 'entrada' then
    v_stock_nuevo := v_stock_actual + new.cantidad;
  else
    v_stock_nuevo := v_stock_actual - new.cantidad;
  end if;

  if v_stock_nuevo < 0 then
    raise exception 'Stock insuficiente para producto % (stock actual %, movimiento %)', new.producto_id, v_stock_actual, new.cantidad;
  end if;

  update public.productos
  set stock_actual = v_stock_nuevo
  where id = new.producto_id;

  return new;
end;
$$;

drop trigger if exists trg_aplicar_movimiento_inventario on public.inventario_movimientos;
create trigger trg_aplicar_movimiento_inventario
before insert on public.inventario_movimientos
for each row
execute function public.fn_aplicar_movimiento_inventario();

-- ======================================================
-- Trigger: registrar salida por venta en inventario
-- ======================================================
create or replace function public.fn_registrar_movimiento_venta_detalle()
returns trigger
language plpgsql
as $$
begin
  insert into public.inventario_movimientos (producto_id, tipo_entrada_salida, cantidad, motivo)
  values (new.producto_id, 'salida', new.cantidad, concat('Venta ', new.venta_id));

  return new;
end;
$$;

drop trigger if exists trg_registrar_movimiento_venta_detalle on public.venta_detalle;
create trigger trg_registrar_movimiento_venta_detalle
after insert on public.venta_detalle
for each row
execute function public.fn_registrar_movimiento_venta_detalle();

-- ======================================================
-- Función transaccional: registrar venta completa POS
-- ======================================================
create or replace function public.fn_registrar_venta(
  p_usuario_id uuid,
  p_metodo_pago text,
  p_monto_recibido numeric,
  p_items jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_venta_id uuid;
  v_folio text;
  v_total numeric(12,2) := 0;
  v_item jsonb;
  v_producto_id uuid;
  v_cantidad integer;
  v_precio_unitario numeric(12,2);
  v_precio_catalogo numeric(12,2);
begin
  if p_metodo_pago not in ('efectivo', 'transferencia', 'tarjeta') then
    raise exception 'Método de pago inválido';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta debe incluir al menos un item';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_producto_id := (v_item->>'producto_id')::uuid;
    v_cantidad := (v_item->>'cantidad')::integer;

    if v_producto_id is null or v_cantidad is null then
      raise exception 'Item incompleto en la venta';
    end if;

    if v_cantidad <= 0 then
      raise exception 'Cantidad inválida en item';
    end if;

    select precio
    into v_precio_catalogo
    from public.productos
    where id = v_producto_id and activo = true;

    if v_precio_catalogo is null then
      raise exception 'Producto inválido o inactivo en item de venta';
    end if;

    v_total := v_total + (v_cantidad * v_precio_catalogo);
  end loop;

  if p_metodo_pago = 'efectivo' and (p_monto_recibido is null or p_monto_recibido < v_total) then
    raise exception 'Monto recibido insuficiente para pago en efectivo';
  end if;

  v_folio := concat('V-', to_char(now(), 'YYYYMMDDHH24MISSMS'));

  insert into public.ventas (folio, total, metodo_pago, monto_recibido, cambio, usuario_id)
  values (v_folio, v_total, p_metodo_pago, p_monto_recibido, case when p_metodo_pago = 'efectivo' then (p_monto_recibido - v_total) else 0 end, p_usuario_id)
  returning id into v_venta_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_producto_id := (v_item->>'producto_id')::uuid;
    v_cantidad := (v_item->>'cantidad')::integer;

    select precio
    into v_precio_unitario
    from public.productos
    where id = v_producto_id and activo = true;

    if v_precio_unitario is null then
      raise exception 'Producto inválido o inactivo en item de venta';
    end if;

    insert into public.venta_detalle (venta_id, producto_id, cantidad, precio_unitario, subtotal)
    values (v_venta_id, v_producto_id, v_cantidad, v_precio_unitario, (v_cantidad * v_precio_unitario));
  end loop;

  return jsonb_build_object(
    'venta_id', v_venta_id,
    'folio', v_folio,
    'total', v_total,
    'metodo_pago', p_metodo_pago,
    'cambio', case when p_metodo_pago = 'efectivo' then (p_monto_recibido - v_total) else 0 end
  );
end;
$$;
