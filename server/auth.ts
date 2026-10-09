import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db, User } from './db.js';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

const SESSION_SECRET = process.env.SESSION_SECRET || 'naisiae-enterprise-session-secret-2026-kenya-etims';
const revokedTokens: Set<string> = new Set();
const legacySessions: Map<string, { userId: string; expiresAt: number }> = new Map();

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

export function requireRoles(...allowedRoles: ('ADMIN' | 'ACCOUNTANT' | 'STAFF')[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // No rules or restrictions applied to ADMIN: full system access
    if (req.user.role === 'ADMIN') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
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
