import type { Usuario } from "./database";
import { normalizeLogin } from "./authSecurity";

export function sessionMatchesClaimedUser(user: Usuario, claimedLogin: unknown): boolean {
  if (typeof claimedLogin !== "string" || !claimedLogin.trim()) return true;
  const normalizedClaim = normalizeLogin(claimedLogin);
  return normalizedClaim === normalizeLogin(user.email) || normalizedClaim === user.id.toLowerCase();
}
