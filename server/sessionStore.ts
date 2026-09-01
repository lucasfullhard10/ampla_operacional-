export interface UserSession {
  userId: string;
  expiresAt: number;
}

export class SessionStore {
  private readonly sessions = new Map<string, UserSession>();

  constructor(private readonly ttlMs: number) {}

  issue(userId: string, token: string, now = Date.now()): UserSession {
    const session = { userId, expiresAt: now + this.ttlMs };
    this.sessions.set(token, session);
    return session;
  }

  get(token: string | null | undefined): UserSession | undefined {
    return token ? this.sessions.get(token) : undefined;
  }

  delete(token: string | null | undefined): void {
    if (token) this.sessions.delete(token);
  }

  refresh(token: string, now = Date.now()): UserSession | undefined {
    const session = this.sessions.get(token);
    if (!session) return undefined;
    session.expiresAt = now + this.ttlMs;
    return session;
  }

  revokeUser(userId: string): number {
    let revoked = 0;
    for (const [token, session] of this.sessions.entries()) {
      if (session.userId !== userId) continue;
      this.sessions.delete(token);
      revoked += 1;
    }
    return revoked;
  }
}

