import React from "react";
import { FileText, Package, Users } from "lucide-react";
import type { Rota } from "../types";

type Props = {
  route: Rota;
  vehicleLabel?: string;
  driverLabel?: string;
};

export default function ShipsRouteDeliveries({ route, vehicleLabel, driverLabel }: Props) {
  if (route.origemRegistro !== "SHIPS_PDF" && !route.shipsEntregas?.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
          <FileText className="w-4 h-4" /> Dados importados do Ships
        </h4>
        <span className="rounded border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[9px] font-bold text-emerald-300">
          ORIGEM: SHIPS PDF
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] font-mono">
        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-2.5">
          <span className="block text-slate-500 uppercase">Data / hora</span>
          <strong className="text-slate-200">{route.data} {route.horaRota || "--:--"}</strong>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-2.5">
          <span className="block text-slate-500 uppercase">Veículo associado</span>
          <strong className="text-slate-200">{vehicleLabel || route.shipsVehicleNumber || "N/D"}</strong>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-2.5">
          <span className="block text-slate-500 uppercase">Delivery Orders</span>
          <strong className="text-sky-300 flex items-center gap-1"><Package className="w-3 h-3" /> {route.shipsEntregas?.length || 0}</strong>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-2.5">
          <span className="block text-slate-500 uppercase">Clientes únicos</span>
          <strong className="text-purple-300 flex items-center gap-1"><Users className="w-3 h-3" /> {route.quantidadeClientesUnicos || 0}</strong>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-2.5">
          <span className="block text-slate-500 uppercase">Motorista</span>
          <strong className="text-slate-200">{driverLabel || "N/D"}</strong>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-2.5">
          <span className="block text-slate-500 uppercase">Status</span>
          <strong className="text-slate-200">{route.status_viagem || route.status}</strong>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-2.5">
          <span className="block text-slate-500 uppercase">Placa no PDF</span>
          <strong className="text-slate-200">{route.shipsVehicleNumber || "N/D"}</strong>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full min-w-[520px] text-left text-[10px] font-mono">
          <thead className="bg-slate-950 text-slate-500 uppercase">
            <tr>
              <th className="px-3 py-2 w-20">Seq.</th>
              <th className="px-3 py-2">Delivery Order</th>
              <th className="px-3 py-2">Customer ID</th>
              <th className="px-3 py-2">Cliente</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {(route.shipsEntregas || []).map((delivery) => (
              <tr key={delivery.id || delivery.deliveryOrder} className="bg-slate-900/40 text-slate-300">
                <td className="px-3 py-2 text-slate-500">{delivery.sequencia}</td>
                <td className="px-3 py-2 font-semibold text-sky-300">{delivery.deliveryOrder}</td>
                <td className="px-3 py-2">{delivery.customerId}</td>
                <td className="px-3 py-2 text-slate-400">{delivery.customerName || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
