export type VehicleDriverLike = {
  motoristaId?: string | null;
  unidadeId?: string | null;
};

export type DriverLike = {
  id: string;
  nome?: string | null;
  unidadeId?: string | null;
  tipo?: string | null;
};

export type VehicleDriverLinkResult<TDriver extends DriverLike = DriverLike> =
  | { status: "linked"; driverId: string; driver: TDriver; message: string }
  | { status: "none"; driverId: ""; driver: null; message: "Nenhum motorista vinculado" }
  | { status: "invalid_driver"; driverId: string; driver: null; message: "Vínculo inválido — motorista não encontrado" }
  | { status: "invalid_role"; driverId: string; driver: TDriver; message: "Vínculo inválido — cadastro não é de motorista" }
  | { status: "unit_mismatch"; driverId: string; driver: TDriver; message: "Vínculo inválido — motorista de outra unidade" };

export const normalizeDriverId = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

/**
 * Regra corporativa do vínculo atual veículo × motorista.
 *
 * A única fonte aceita é vehicle.motoristaId. Campos preferenciais e registros
 * operacionais/históricos não participam desta resolução.
 */
export function resolveVehicleDriverLink<TDriver extends DriverLike>(
  vehicle: VehicleDriverLike,
  drivers: readonly TDriver[]
): VehicleDriverLinkResult<TDriver> {
  const driverId = normalizeDriverId(vehicle.motoristaId);
  if (!driverId) {
    return { status: "none", driverId: "", driver: null, message: "Nenhum motorista vinculado" };
  }

  const driver = drivers.find(candidate => candidate.id === driverId);
  if (!driver) {
    return { status: "invalid_driver", driverId, driver: null, message: "Vínculo inválido — motorista não encontrado" };
  }

  if (driver.tipo && driver.tipo !== "Motorista") {
    return { status: "invalid_role", driverId, driver, message: "Vínculo inválido — cadastro não é de motorista" };
  }

  if (vehicle.unidadeId && driver.unidadeId && vehicle.unidadeId !== driver.unidadeId) {
    return { status: "unit_mismatch", driverId, driver, message: "Vínculo inválido — motorista de outra unidade" };
  }

  return {
    status: "linked",
    driverId,
    driver,
    message: driver.nome?.trim() || driverId
  };
}
/**
 * Uma disponibilidade já existente preserva sua escala operacional. Para uma
 * nova declaração, o preenchimento inicial só pode vir de um vínculo atual válido.
 */
export function getAvailabilityOperationalDriverId<TDriver extends DriverLike>(
  vehicle: VehicleDriverLike,
  drivers: readonly TDriver[],
  existingAvailability?: { motoristaId?: string | null } | null
): string {
  if (existingAvailability) {
    return normalizeDriverId(existingAvailability.motoristaId);
  }

  const link = resolveVehicleDriverLink(vehicle, drivers);
  return link.status === "linked" ? link.driverId : "";
}
