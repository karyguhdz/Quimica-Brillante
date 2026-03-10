import { AppShell } from '@/components/app-shell';
import { PlaceholderCard } from '@/components/placeholder-card';

export default function DashboardPage() {
  return (
    <AppShell title="Dashboard principal">
      <div className="grid gap-4 md:grid-cols-3">
        <PlaceholderCard title="Ventas del día" description="Resumen rápido de ingresos, tickets y promedio de venta." />
        <PlaceholderCard title="Stock bajo" description="Lista de productos que necesitan reposición inmediata." />
        <PlaceholderCard title="Actividad reciente" description="Últimas operaciones realizadas por el personal." />
      </div>
    </AppShell>
  );
}
