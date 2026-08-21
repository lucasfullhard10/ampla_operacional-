import { AlertTriangle, UserCheck, UserX } from "lucide-react";
import { Motorista, Veiculo } from "../types";
import { resolveVehicleDriverLink } from "../../shared/vehicleDriverLink";

interface VehicleDriverLinkProps {
  vehicle: Pick<Veiculo, "motoristaId" | "unidadeId">;
  drivers: Motorista[];
  compact?: boolean;
}
export function VehicleDriverLink({ vehicle, drivers, compact = false }: VehicleDriverLinkProps) {
  const link = resolveVehicleDriverLink(vehicle, drivers);

  if (link.status === "linked") {
    return (
      <span className="inline-flex items-center gap-1.5 text-slate-100">
        <UserCheck className="h-3.5 w-3.5 shrink-0 text-sky-400" />
        <span className={compact ? "truncate" : ""}>{link.message}</span>
      </span>
    );
  }

  if (link.status === "none") {
    return (
      <span className="inline-flex items-center gap-1.5 text-slate-500 italic">
        <UserX className="h-3.5 w-3.5 shrink-0" />
        <span>{link.message}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-amber-400" title={`ID informado: ${link.driverId}`}>
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      <span className={compact ? "truncate" : ""}>{link.message}</span>
    </span>
  );
}
