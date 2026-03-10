import { AppShell } from '@/components/app-shell';
import { PlaceholderCard } from '@/components/placeholder-card';

export default function HistorialVentasPage() {
  return (
    <AppShell title="Historial de ventas">
      <PlaceholderCard
        title="Registro de ventas"
        description="Vista base para consultar ventas previas, estados y filtros por fecha."
      />
    </AppShell>
  );
}
