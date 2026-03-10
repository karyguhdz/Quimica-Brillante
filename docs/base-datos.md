# Esquema de base de datos - Química Brillante POS

## 1) SQL de creación
El SQL completo está en:

- `supabase/schema.sql`

## 2) Relaciones
- `inventario_movimientos.producto_id` → `productos.id` (N:1)
- `ventas.usuario_id` → `usuarios.id` (N:1)
- `venta_detalle.venta_id` → `ventas.id` (N:1)
- `venta_detalle.producto_id` → `productos.id` (N:1)

Reglas de integridad:
- Si se elimina una venta, su `venta_detalle` se elimina en cascada.
- No se permite eliminar productos con detalle de ventas o movimientos.
- No se permite eliminar usuarios con ventas registradas.

## 3) ¿Cómo se actualiza el stock?
El stock se actualiza automáticamente en base de datos por triggers:

1. Al insertar en `inventario_movimientos`, `trg_aplicar_movimiento_inventario`:
   - bloquea la fila de `productos` (`FOR UPDATE`),
   - valida que no quede stock negativo,
   - suma/resta en `productos.stock_actual` según tipo (`entrada`, `salida`, `ajuste`).
2. Al insertar en `venta_detalle`, `trg_registrar_movimiento_venta_detalle` crea una salida automática en `inventario_movimientos`, lo que a su vez ajusta el stock mediante el trigger anterior.

## 4) Registro de ventas tipo POS
La función `fn_registrar_venta(...)` encapsula el flujo transaccional:
- crea el registro en `ventas`,
- inserta todos los renglones en `venta_detalle`,
- dispara automáticamente descuentos de stock y movimientos de salida por los triggers ya definidos.

Si cualquier parte falla (por ejemplo stock insuficiente), la transacción completa se revierte.
