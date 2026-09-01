import crypto from "crypto";

import type { Usuario } from "./database";

export const normalizeLogin = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, "");

export const validateLogin = (value: unknown): string[] => {
  if (typeof value !== "string" || !value.trim()) return ["O login é obrigatório."];
  const normalized = normalizeLogin(value);
  const errors: string[] = [];
  if (normalized.length < 3 || normalized.length > 120) {
    errors.push("O login deve possuir entre 3 e 120 caracteres.");
  }
  if (!/^[a-z0-9._@+-]+$/.test(normalized)) {
    errors.push("O login aceita apenas letras, números, ponto, hífen, sublinhado, + e @.");
  }
  return errors;
};

export const validatePasswordPolicy = (password: unknown): string[] => {
  if (typeof password !== "string") return ["Informe uma nova senha."];
  const errors: string[] = [];
  if (password.length < 8) errors.push("A senha deve possuir pelo menos 8 caracteres.");
  if (!/[A-Za-zÀ-ÿ]/.test(password)) errors.push("A senha deve conter pelo menos uma letra.");
  if (!/\d/.test(password)) errors.push("A senha deve conter pelo menos um número.");
  if (/\s/.test(password)) errors.push("A senha não pode conter espaços.");
  return errors;
};

export const hashPassword = (password: string): string => {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
};

export const verifyPassword = (password: string, user: Pick<Usuario, "senha" | "senhaHash">): boolean => {
  if (user.senhaHash) {
    const [algorithm, saltValue, hashValue] = user.senhaHash.split("$");
    if (algorithm !== "scrypt" || !saltValue || !hashValue) return false;
    const expected = Buffer.from(hashValue, "base64");
    const actual = crypto.scryptSync(password, Buffer.from(saltValue, "base64"), expected.length);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  }
  if (!user.senha) return false;
  const expected = Buffer.from(user.senha);
  const actual = Buffer.from(password);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
};

export const isMasterUser = (user: Usuario): boolean =>
  user.perfil === "admin_master" || user.tipo_usuario === "MASTER";

export const isFieldUser = (user: Usuario): boolean =>
  user.tipo_usuario === "MOTORISTA" || user.tipo_usuario === "AJUDANTE";

export const requiresPasswordChange = (user: Usuario): boolean =>
  Boolean(user.mustChangePassword || user.deveAlterarSenha);

export const canUseExistingSession = (user: Usuario): boolean =>
  user.status === "ativo" && !user.bloqueado;

export const canManageUsers = (user: Usuario): boolean => {
  if (isMasterUser(user)) return true;
  if (user.perfil === "admin_unidade") return true;
  if (["SUPERVISOR", "ADMINISTRATIVO", "GESTOR_OPERACIONAL"].includes(user.tipo_usuario || "")) return true;
  const permission = user.permissions?.usuarios as Record<string, boolean> | undefined;
  return permission?.editar === true || permission?.edit === true;
};
