import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db, User, UserRole } from './db.js';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

const SESSION_SECRET = process.env.SESSION_SECRET || 'naisiae-enterprise-session-secret-2026-kenya-etims';
const revokedTokens: Set<string> = new Set();
const legacySessions: Map<string, { userId: string; expiresAt: number }> = new Map();

// ==========================================
// RATE LIMITING & BRUTE FORCE PROTECTION
// ==========================================
interface AttemptRecord {
  count: number;
  firstAttempt: number;
  lockedUntil?: number;
}

const loginAttempts: Map<string, AttemptRecord> = new Map();

export function checkRateLimit(
  key: string,
  maxAttempts = 5,
  lockDurationMs = 15 * 60 * 1000
): { allowed: boolean; remainingAttempts: number; retryAfterSeconds?: number } {
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record) {
    return { allowed: true, remainingAttempts: maxAttempts };
  }

  // Check if currently locked
  if (record.lockedUntil && now < record.lockedUntil) {
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds: Math.ceil((record.lockedUntil - now) / 1000),
    };
  }

  // If window expired, reset
  if (now - record.firstAttempt > lockDurationMs) {
    loginAttempts.delete(key);
    return { allowed: true, remainingAttempts: maxAttempts };
  }

  if (record.count >= maxAttempts) {
    record.lockedUntil = now + lockDurationMs;
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds: Math.ceil(lockDurationMs / 1000),
    };
  }

  return { allowed: true, remainingAttempts: maxAttempts - record.count };
}

export function recordFailedAttempt(
  key: string,
  maxAttempts = 5,
  lockDurationMs = 15 * 60 * 1000
): { isLocked: boolean; remaining: number } {
  const now = Date.now();
  let record = loginAttempts.get(key);

  if (!record || now - record.firstAttempt > lockDurationMs) {
    record = { count: 1, firstAttempt: now };
  } else {
    record.count += 1;
  }

  if (record.count >= maxAttempts) {
    record.lockedUntil = now + lockDurationMs;
    loginAttempts.set(key, record);
    return { isLocked: true, remaining: 0 };
  }

  loginAttempts.set(key, record);
  return { isLocked: false, remaining: maxAttempts - record.count };
}

export function resetRateLimit(key: string): void {
  loginAttempts.delete(key);
}

// ==========================================
// SESSION MANAGEMENT (SIGNED HMAC-SHA256)
// ==========================================

export function createSession(userId: string): string {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days validity
  const payload = {
    userId,
    expiresAt,
    salt: crypto.randomBytes(8).toString('hex'),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');
  const token = `nst_${payloadB64}.${signature}`;

  // Also retain in memory for fast lookup
  legacySessions.set(token, { userId, expiresAt });
  return token;
}

export function revokeSession(token: string): void {
  revokedTokens.add(token);
  legacySessions.delete(token);
}

export function getUserFromToken(token: string): User | null {
  if (!token) return null;
  if (revokedTokens.has(token)) return null;

  // 1. Check signed HMAC token
  if (token.startsWith('nst_')) {
    const raw = token.slice(4);
    const dotIdx = raw.indexOf('.');
    if (dotIdx !== -1) {
      const payloadB64 = raw.slice(0, dotIdx);
      const signature = raw.slice(dotIdx + 1);
      const expectedSignature = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');

      if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        try {
          const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
          if (payload.userId && payload.expiresAt && Date.now() <= payload.expiresAt) {
            const users = db.getData().users;
            const user = users.find((u) => u.id === payload.userId && u.status === 'ACTIVE');
            if (user) return user;
          }
        } catch {
          // Fall through to legacy check
        }
      }
    }
  }

  // 2. Fallback check legacy in-memory session
  const legacy = legacySessions.get(token);
  if (legacy) {
    if (Date.now() > legacy.expiresAt) {
      legacySessions.delete(token);
      return null;
    }
    const users = db.getData().users;
    const user = users.find((u) => u.id === legacy.userId && u.status === 'ACTIVE');
    return user || null;
  }

  return null;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid authentication token' });
  }

  const token = authHeader.split(' ')[1];
  const user = getUserFromToken(token);

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Session expired or invalid credentials' });
  }

  req.user = user;
  next();
}

export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // SUPER_ADMIN has access to any endpoint that permits ADMIN
    const effectiveRoles: UserRole[] = [...allowedRoles];
    if (allowedRoles.includes('ADMIN') && !allowedRoles.includes('SUPER_ADMIN')) {
      effectiveRoles.push('SUPER_ADMIN');
    }

    if (!effectiveRoles.includes(req.user.role)) {
      // Log unauthorized privilege escalation attempt in audit
      db.logAudit({
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        branchId: req.user.branchId,
        branchName: 'N/A',
        action: 'ACCESS_DENIED_ATTEMPT',
        entityType: 'SECURITY',
        entityId: req.path,
        details: `User with role ${req.user.role} attempted to access restricted endpoint ${req.method} ${req.path}`,
        ipAddress: req.ip,
      });

      return res.status(403).json({
        error: `Forbidden: Access denied. Role '${req.user.role}' lacks required permissions for this action.`,
      });
    }

    next();
  };
}
