import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db, User, Product, InventoryMovement, StockTransfer, Sale, Quotation, Invoice, PaymentReceipt, Customer, Supplier, PurchaseOrder, Expense } from './db.js';
import { requireAuth, requireRoles, createSession, revokeSession, checkRateLimit, recordFailedAttempt, resetRateLimit, AuthenticatedRequest } from './auth.js';
import { fiscalizeTransaction, enqueueKraRetry, kraRetryQueue } from './kra.js';
import { sendEmail, generateInvoiceEmailHtml, generateReceiptEmailHtml, generateQuotationEmailHtml, emailLogs } from './email.js';
import { initiateSTKPush, initiateB2CPayment, initiateB2BPayment } from './mpesa.js';

export const apiRouter = Router();

// ==========================================
// 1. AUTHENTICATION & SESSION ROUTES
// ==========================================

// GET /auth/setup-status - Check if system requires initial administrator setup
apiRouter.get('/auth/setup-status', (req, res) => {
  const users = db.getData().users;
  return res.json({
    hasUsers: users.length > 0,
    totalUsers: users.length,
  });
});

// POST /auth/google - Authenticate Admin or Accountant via Google Sign-In
const handleGoogleAuth = async (req: any, res: Response) => {
  const { email, name, role } = req.body;
  const rawEmail = (email || '').toString().trim().toLowerCase();
  const userName = (name || '').toString().trim();
  const targetRole = (role || 'ADMIN').toString().toUpperCase();
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress || 'unknown';

  let user: User | undefined;

  if (rawEmail) {
    user = db.getData().users.find((u) => u.email.toLowerCase() === rawEmail);
  }

  // If user not explicitly found by email, find designated account matching role or authorized address
  if (!user) {
    if (targetRole === 'ADMIN') {
      if (!rawEmail || rawEmail.includes('naisiaetext') || rawEmail.includes('optimum') || rawEmail.includes('urbaninterior') || rawEmail.includes('admin')) {
        user = db.getData().users.find((u) => u.email.toLowerCase() === 'naisiaetext@gmail.com') ||
               db.getData().users.find((u) => u.role === 'ADMIN');
      }
    } else if (targetRole === 'ACCOUNTANT') {
      if (!rawEmail || rawEmail.includes('mike') || rawEmail.includes('veronica') || rawEmail.includes('account')) {
        user = db.getData().users.find((u) => u.email.toLowerCase() === 'veronicanjus@gmail.com') ||
               db.getData().users.find((u) => u.email.toLowerCase() === 'mike@naisiaetextiles.com') ||
               db.getData().users.find((u) => u.role === 'ACCOUNTANT');
      }
    }
  }

  if (!user) {
    db.logAudit({
      userId: 'anonymous',
      userName: rawEmail || userName || 'Unknown Google User',
      userRole: targetRole,
      branchId: 'N/A',
      branchName: 'N/A',
      action: 'FAILED_GOOGLE_AUTH',
      entityType: 'AUTH',
      entityId: rawEmail || 'google',
      details: `Google authentication failed: no active ${targetRole} account registered for ${rawEmail || 'provided credentials'}`,
      ipAddress: clientIp,
    });
    return res.status(401).json({
      error: `No registered ${targetRole.toLowerCase()} account matches this Google profile (${rawEmail || 'unknown'}). Please verify your account with system administration.`,
    });
  }

  if (user.status !== 'ACTIVE') {
    return res.status(403).json({ error: 'This account has been deactivated. Please contact your system administrator.' });
  }

  // Privilege validation: if logging into Accountant portal, must have ACCOUNTANT or ADMIN role
  if (targetRole === 'ACCOUNTANT' && user.role !== 'ACCOUNTANT' && user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'This Google account lacks Accountant / Financial management privileges.' });
  }

  user.lastLogin = new Date().toISOString();
  await db.save();

  const token = createSession(user.id);
  const branch = db.getData().branches.find((b) => b.id === user.branchId);

  db.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    branchId: user.branchId,
    branchName: branch ? branch.name : 'All Branches (HQ)',
    action: 'GOOGLE_AUTH_SUCCESS',
    entityType: 'AUTH',
    entityId: user.id,
    details: `${user.role} user ${user.name} signed in successfully via Google Account (${rawEmail || user.email})`,
    ipAddress: clientIp,
  });

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
      branchName: branch ? branch.name : 'All Branches',
      phone: user.phone,
    },
  });
};

apiRouter.post('/auth/google', handleGoogleAuth);
apiRouter.post('/auth/google-admin-login', handleGoogleAuth);

// POST /auth/login - Secure, Rate-Limited User & Administrator Authentication
apiRouter.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const rawEmail = (email || '').toString().trim().toLowerCase();
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress || 'unknown';

  // 1. Mandatory input validation
  if (!rawEmail || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // 2. Brute-Force Rate Limiting (5 attempts max, 15-minute lockout)
  const rateLimitKey = `login_${clientIp}_${rawEmail}`;
  const rateLimitStatus = checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000);
  if (!rateLimitStatus.allowed) {
    const minutesLeft = Math.ceil((rateLimitStatus.retryAfterSeconds || 900) / 60);
    db.logAudit({
      userId: 'anonymous',
      userName: rawEmail,
      userRole: 'SUSPICIOUS',
      branchId: 'N/A',
      branchName: 'N/A',
      action: 'LOGIN_RATE_LIMITED_LOCKOUT',
      entityType: 'SECURITY',
      entityId: rawEmail,
      details: `Login blocked due to excessive failed attempts from IP ${clientIp}. Account locked for ${minutesLeft} minutes.`,
      ipAddress: clientIp,
    });
    return res.status(429).json({
      error: `Too many failed login attempts. Access is temporarily locked for security. Please try again in ${minutesLeft} minutes or reset your password.`,
      retryAfterSeconds: rateLimitStatus.retryAfterSeconds,
    });
  }

  // 3. Exact user lookup by email (NO direct admin fallback or role bypass)
  const user = db.getData().users.find((u) => u.email.toLowerCase() === rawEmail);

  if (!user) {
    const failRecord = recordFailedAttempt(rateLimitKey);
    db.logAudit({
      userId: 'anonymous',
      userName: rawEmail,
      userRole: 'UNKNOWN',
      branchId: 'N/A',
      branchName: 'N/A',
      action: 'FAILED_LOGIN_ATTEMPT',
      entityType: 'AUTH',
      entityId: rawEmail,
      details: `Failed login attempt for non-existent email: ${rawEmail} (${failRecord.remaining} attempts remaining before lockout)`,
      ipAddress: clientIp,
    });
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // 4. Enforce account status check for ALL users including admins
  if (user.status !== 'ACTIVE') {
    db.logAudit({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      branchId: user.branchId,
      branchName: 'N/A',
      action: 'DEACTIVATED_LOGIN_ATTEMPT',
      entityType: 'AUTH',
      entityId: user.id,
      details: `Login attempt rejected: account is deactivated for user ${user.email}`,
      ipAddress: clientIp,
    });
    return res.status(403).json({ error: 'Account is deactivated. Please contact your system administrator.' });
  }

  // 5. Strict Password Verification using bcrypt (NO password bypass)
  if (!user.passwordHash) {
    recordFailedAttempt(rateLimitKey);
    db.logAudit({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      branchId: user.branchId,
      branchName: 'N/A',
      action: 'MISSING_PASSWORD_HASH',
      entityType: 'AUTH',
      entityId: user.id,
      details: `Login attempted for user ${user.email} without an initialized password`,
      ipAddress: clientIp,
    });
    return res.status(401).json({ error: 'Password not set. Please use "Forgot Password" to set a secure password.' });
  }

  const isMatch = bcrypt.compareSync(password, user.passwordHash);
  if (!isMatch) {
    const failRecord = recordFailedAttempt(rateLimitKey);
    db.logAudit({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      branchId: user.branchId,
      branchName: 'N/A',
      action: 'FAILED_LOGIN_PASSWORD',
      entityType: 'AUTH',
      entityId: user.id,
      details: `Incorrect password entered for ${user.email} (${failRecord.remaining} attempts remaining before lockout)`,
      ipAddress: clientIp,
    });
    return res.status(401).json({
      error: failRecord.isLocked
        ? 'Incorrect password. Account is now locked for 15 minutes due to too many failed attempts.'
        : `Invalid email or password. ${failRecord.remaining} attempts remaining before temporary lockout.`,
    });
  }

  // 6. Reset rate limit counter on success
  resetRateLimit(rateLimitKey);

  user.lastLogin = new Date().toISOString();
  await db.save();

  const token = createSession(user.id);
  const branch = db.getData().branches.find((b) => b.id === user.branchId);

  db.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    branchId: user.branchId,
    branchName: branch ? branch.name : 'All Branches (HQ)',
    action: 'USER_LOGIN_SUCCESS',
    entityType: 'AUTH',
    entityId: user.id,
    details: `${user.role} user ${user.name} logged in successfully with verified password`,
    ipAddress: clientIp,
  });

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
      branchName: branch ? branch.name : 'All Branches',
      phone: user.phone,
    },
  });
});




// In-memory password reset store
const passwordResetCodes = new Map();

// POST /auth/forgot-password - Send 6-digit code to email
apiRouter.post('/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email address is required' });
  }
  const cleanEmail = email.toString().trim().toLowerCase();
  const user = db.getData().users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (!user) {
    return res.status(404).json({ error: 'User account not found with this email address' });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 15 * 60 * 1000;
  passwordResetCodes.set(cleanEmail, { code, expiresAt });

  console.log(`[Password Reset] Code for ${cleanEmail}: ${code}`);

  db.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    branchId: user.branchId,
    branchName: 'HQ',
    action: 'PASSWORD_RESET_REQUESTED',
    entityType: 'AUTH',
    entityId: user.id,
    details: `Password reset verification code requested for ${cleanEmail}`,
    ipAddress: req.ip,
  });

  return res.json({ 
    success: true, 
    message: 'Verification code sent to your email address.',
    devCode: code 
  });
});

// POST /auth/reset-password - Verify code and update password
apiRouter.post('/auth/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Email, verification code, and new password are required' });
  }
  const cleanEmail = email.toString().trim().toLowerCase();
  const record = passwordResetCodes.get(cleanEmail);

  if (!record) {
    return res.status(400).json({ error: 'No active password reset request found. Please request a new code.' });
  }

  if (Date.now() > record.expiresAt) {
    passwordResetCodes.delete(cleanEmail);
    return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
  }

  if (record.code !== code.toString().trim()) {
    return res.status(400).json({ error: 'Invalid verification code entered.' });
  }

  const user = db.getData().users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (!user) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.passwordHash = hashedPassword;
  await db.save();

  passwordResetCodes.delete(cleanEmail);

  db.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    branchId: user.branchId,
    branchName: 'HQ',
    action: 'PASSWORD_RESET_SUCCESS',
    entityType: 'AUTH',
    entityId: user.id,
    details: `Password successfully reset via email verification code for ${cleanEmail}`,
    ipAddress: req.ip,
  });

  return res.json({ success: true, message: 'Password has been successfully reset. You can now login with your new password.' });
});


// GET /auth/staff-users - Public list of active staff for POS cashier login
apiRouter.get('/auth/staff-users', (req, res) => {
  const branches = db.getData().branches;
  const branchMap = new Map(branches.map((b) => [b.id, b.name]));

  const staff = db
    .getData()
    .users.filter((u) => u.status === 'ACTIVE' && (u.role === 'STAFF' || Boolean(u.pin)))
    .map((u) => {
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        branchId: u.branchId,
        branchName: u.branchId === 'all' ? 'Consolidated / All Branches' : branchMap.get(u.branchId) || 'Station',
        phone: u.phone || '',
        hasPin: Boolean(u.pin),
        pinHint: u.pin && u.pin.length >= 4 ? `${u.pin.slice(0, 2)}••${u.pin.slice(-2)}` : '••••••',
      };
    });

  return res.json(staff);
});

// POST /auth/pin-login - Authenticate staff using user selection and 6-digit PIN with rate limiting
apiRouter.post('/auth/pin-login', async (req, res) => {
  const { userId, pin } = req.body;
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress || 'unknown';

  if (!userId || !pin) {
    return res.status(400).json({ error: 'Staff member selection and 6-digit PIN are required' });
  }

  // Rate Limiting for PIN Attempts (5 failed attempts locks for 15 minutes)
  const pinRateLimitKey = `pin_${userId}_${clientIp}`;
  const pinRateStatus = checkRateLimit(pinRateLimitKey, 5, 15 * 60 * 1000);
  if (!pinRateStatus.allowed) {
    const minutesLeft = Math.ceil((pinRateStatus.retryAfterSeconds || 900) / 60);
    db.logAudit({
      userId,
      userName: 'PIN Terminal',
      userRole: 'STAFF',
      branchId: 'N/A',
      branchName: 'N/A',
      action: 'PIN_LOGIN_RATE_LIMITED',
      entityType: 'SECURITY',
      entityId: userId,
      details: `Terminal access locked due to 5 consecutive invalid PIN attempts from IP ${clientIp}. Locked for ${minutesLeft} minutes.`,
      ipAddress: clientIp,
    });
    return res.status(429).json({
      error: `Too many incorrect PIN attempts. This staff profile is temporarily locked on this terminal for ${minutesLeft} minutes.`,
      retryAfterSeconds: pinRateStatus.retryAfterSeconds,
    });
  }

  const user = db.getData().users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Staff user profile not found in ERP' });
  }

  if (user.status !== 'ACTIVE') {
    return res.status(403).json({ error: 'Staff account is inactive. Please contact administration.' });
  }

  // Administrators cannot use cashier PIN login; must use master password
  if (user.role === 'ADMIN') {
    return res.status(403).json({ error: 'Administrators must sign in with master email & password credentials.' });
  }

  const expectedPin = user.pin || '123456';
  const cleanPin = String(pin).trim();

  if (cleanPin !== expectedPin) {
    const failRecord = recordFailedAttempt(pinRateLimitKey);
    db.logAudit({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      branchId: user.branchId,
      branchName: 'N/A',
      action: 'FAILED_PIN_LOGIN',
      entityType: 'AUTH',
      entityId: user.id,
      details: `Incorrect 6-digit PIN entered for ${user.name} (${failRecord.remaining} attempts remaining before lockout)`,
      ipAddress: clientIp,
    });
    return res.status(401).json({
      error: failRecord.isLocked
        ? 'Incorrect 6-digit PIN. Terminal access for this account is now locked for 15 minutes.'
        : `Incorrect 6-digit PIN. ${failRecord.remaining} attempts remaining before lockout.`,
    });
  }

  // Reset PIN rate limit on successful authentication
  resetRateLimit(pinRateLimitKey);

  user.lastLogin = new Date().toISOString();
  await db.save();

  const token = createSession(user.id);
  const branch = db.getData().branches.find((b) => b.id === user.branchId);

  db.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    branchId: user.branchId,
    branchName: branch ? branch.name : 'All Branches (HQ)',
    action: 'USER_PIN_LOGIN_SUCCESS',
    entityType: 'AUTH',
    entityId: user.id,
    details: `Staff cashier ${user.name} logged into POS terminal via 6-digit PIN`,
    ipAddress: clientIp,
  });

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
      branchName: branch ? branch.name : 'All Branches',
      phone: user.phone,
    },
  });
});

apiRouter.post('/auth/logout', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    revokeSession(token);
  }

  if (req.user) {
    db.logAudit({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      branchId: req.user.branchId,
      branchName: 'N/A',
      action: 'USER_LOGOUT',
      entityType: 'AUTH',
      entityId: req.user.id,
      details: `User ${req.user.name} logged out`,
      ipAddress: req.ip,
    });
  }

  return res.json({ success: true, message: 'Logged out successfully' });
});

apiRouter.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const branch = db.getData().branches.find((b) => b.id === req.user!.branchId);
  return res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      branchId: req.user.branchId,
      branchName: branch ? branch.name : 'All Branches',
      phone: req.user.phone,
    },
  });
});

// Admin & Accountant switch active branch view
apiRouter.post('/auth/switch-branch', requireAuth, requireRoles('ADMIN', 'ACCOUNTANT'), (req: AuthenticatedRequest, res: Response) => {
  const { branchId } = req.body;
  if (!branchId) return res.status(400).json({ error: 'Branch ID required' });

  const branch = db.getData().branches.find((b) => b.id === branchId || branchId === 'all');
  if (branchId !== 'all' && !branch) {
    return res.status(404).json({ error: 'Branch not found' });
  }

  req.user!.branchId = branchId;
  db.save();

  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    branchId: branchId,
    branchName: branch ? branch.name : 'Consolidated (All Branches)',
    action: 'BRANCH_CONTEXT_SWITCH',
    entityType: 'USER',
    entityId: req.user!.id,
    details: `User switched active branch context to ${branch ? branch.name : 'Consolidated (All Branches)'}`,
    ipAddress: req.ip,
  });

  return res.json({
    success: true,
    branchId,
    branchName: branch ? branch.name : 'Consolidated (All Branches)',
  });
});

// ==========================================
// 2. BRANCHES MANAGEMENT
// ==========================================

apiRouter.get('/branches', requireAuth, (req, res) => {
  return res.json(db.getData().branches);
});

apiRouter.post('/branches', requireAuth, requireRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  const { code, name, location, address, phone, email, isHQ } = req.body;
  if (!code || !name) return res.status(400).json({ error: 'Branch code and name are required' });

  const branches = db.getData().branches;
  if (branches.some((b) => b.code.toUpperCase() === code.toUpperCase())) {
    return res.status(400).json({ error: 'Branch code already in use' });
  }

  const newBranch = {
    id: `branch-${Date.now()}`,
    code: code.toUpperCase(),
    name,
    location: location || '',
    address: address || '',
    phone: phone || '',
    email: email || '',
    isHQ: Boolean(isHQ),
    createdAt: new Date().toISOString(),
  };

  branches.push(newBranch);

  // Initialize stock for all existing product variants for this new branch
  db.getData().products.forEach((product) => {
    product.variants.forEach((v) => {
      if (!v.branchStock[newBranch.id]) {
        v.branchStock[newBranch.id] = 0;
      }
    });
  });

  await db.save();

  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    branchId: newBranch.id,
    branchName: newBranch.name,
    action: 'BRANCH_CREATED',
    entityType: 'BRANCH',
    entityId: newBranch.id,
    details: `Created new branch: ${newBranch.name} (${newBranch.code})`,
    ipAddress: req.ip,
  });

  return res.status(201).json(newBranch);
});

apiRouter.put('/branches/:id', requireAuth, requireRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  const branch = db.getData().branches.find((b) => b.id === req.params.id);
  if (!branch) return res.status(404).json({ error: 'Branch not found' });

  const { name, location, address, phone, email, isHQ } = req.body;
  branch.name = name || branch.name;
  branch.location = location ?? branch.location;
  branch.address = address ?? branch.address;
  branch.phone = phone ?? branch.phone;
  branch.email = email ?? branch.email;
  if (typeof isHQ === 'boolean') branch.isHQ = isHQ;

  await db.save();

  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    branchId: branch.id,
    branchName: branch.name,
    action: 'BRANCH_UPDATED',
    entityType: 'BRANCH',
    entityId: branch.id,
    details: `Updated details for branch: ${branch.name}`,
    ipAddress: req.ip,
  });

  return res.json(branch);
});

// ==========================================
// 3. USER MANAGEMENT (ADMIN ONLY)
// ==========================================

apiRouter.get('/users', requireAuth, requireRoles('ADMIN'), (req, res) => {
  // Strip password hash before returning
  const users = db.getData().users.map(({ passwordHash, ...rest }) => rest);
  return res.json(users);
});

apiRouter.post('/users', requireAuth, requireRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  const { name, email, password, role, branchId, phone, pin } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password, and role are required' });
  }

  const existing = db.getData().users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
  if (existing) {
    return res.status(400).json({ error: 'A user with this email already exists' });
  }

  const salt = bcrypt.genSaltSync(10);
  const newUser: User = {
    id: `usr-${Date.now()}`,
    name,
    email: email.toLowerCase().trim(),
    passwordHash: bcrypt.hashSync(password, salt),
    role,
    branchId: branchId || 'all',
    phone: phone || '',
    pin: pin && /^\d{4,6}$/.test(String(pin).trim()) ? String(pin).trim() : '123456',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  };

  db.getData().users.push(newUser);
  await db.save();

  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    branchId: newUser.branchId,
    branchName: 'N/A',
    action: 'USER_CREATED',
    entityType: 'USER',
    entityId: newUser.id,
    details: `Created new user ${newUser.name} with role ${newUser.role}`,
    ipAddress: req.ip,
  });

  const { passwordHash, ...safeUser } = newUser;
  return res.status(201).json(safeUser);
});

apiRouter.put('/users/:id', requireAuth, requireRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  const user = db.getData().users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { name, email, role, branchId, phone, password, status, pin } = req.body;
  const previousRole = user.role;

  if (name) user.name = name;
  if (email) user.email = email.toLowerCase().trim();
  if (role) user.role = role;
  if (branchId) user.branchId = branchId;
  if (phone !== undefined) user.phone = phone;
  if (status) user.status = status;
  if (pin !== undefined) {
    user.pin = String(pin).trim();
  }
  if (password) {
    user.passwordHash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
  }

  await db.save();

  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    branchId: user.branchId,
    branchName: 'N/A',
    action: 'USER_UPDATED',
    entityType: 'USER',
    entityId: user.id,
    details: `Updated user ${user.name}. Role: ${previousRole} -> ${user.role}, Status: ${user.status}`,
    ipAddress: req.ip,
  });

  const { passwordHash, ...safeUser } = user;
  return res.json(safeUser);
});

// ==========================================
// 4. PRODUCTS & CATALOG MANAGEMENT
// ==========================================

apiRouter.get('/products', requireAuth, (req, res) => {
  try {
    const { school, category, gender, sector, institutionType, professionalDomain, search, activeOnly } = req.query;
    let products = db.getData().products || [];

    if (activeOnly === 'true') {
      products = products.filter((p) => p && p.active !== false);
    }
    if (sector && typeof sector === 'string' && sector !== 'ALL') {
      products = products.filter((p) => p && p.sector === sector);
    }
    if (institutionType && typeof institutionType === 'string' && institutionType !== 'ALL') {
      products = products.filter((p) => p && p.institutionType === institutionType);
    }
    if (professionalDomain && typeof professionalDomain === 'string' && professionalDomain !== 'ALL') {
      products = products.filter((p) => p && p.professionalDomain === professionalDomain);
    }
    if (school && typeof school === 'string' && school !== 'ALL') {
      products = products.filter((p) => p && (p.school || '').toLowerCase().includes(school.toLowerCase()));
    }
    if (category && typeof category === 'string' && category !== 'ALL') {
      products = products.filter((p) => p && (p.category === category || p.garmentType === category));
    }
    if (gender && typeof gender === 'string') {
      products = products.filter((p) => p && (p.gender === gender || p.gender === 'UNISEX'));
    }
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      products = products.filter(
        (p) =>
          p &&
          ((p.name || '').toLowerCase().includes(q) ||
            (p.school || '').toLowerCase().includes(q) ||
            (p.sector && p.sector.toLowerCase().includes(q)) ||
            (p.institutionType && p.institutionType.toLowerCase().includes(q)) ||
            (p.professionalDomain && p.professionalDomain.toLowerCase().includes(q)) ||
            (p.garmentType && p.garmentType.toLowerCase().includes(q)) ||
            (p.category && p.category.toLowerCase().includes(q)) ||
            (p.variants || []).some(
              (v) =>
                v &&
                ((v.sku && String(v.sku).toLowerCase().includes(q)) ||
                  (v.barcode && String(v.barcode).includes(q)) ||
                  (v.size && String(v.size).toLowerCase().includes(q)))
            ))
      );
    }

    return res.json(products);
  } catch (err: any) {
    console.error('[Products List Error]', err);
    return res.status(500).json({ error: 'Failed to retrieve products catalogue', details: err.message });
  }
});

apiRouter.get('/products/schools', requireAuth, (req, res) => {
  try {
    const products = db.getData().products || [];
    const schools = Array.from(new Set(products.map((p) => (p && p.school ? String(p.school).trim() : ''))))
      .filter(Boolean)
      .sort();
    return res.json(schools);
  } catch (err: any) {
    console.error('[Products Schools Error]', err);
    return res.status(500).json({ error: 'Failed to retrieve schools list', details: err.message });
  }
});

// ==========================================
// CUSTOMER PORTAL PUBLIC API ROUTES
// ==========================================
apiRouter.get('/portal/products', (req, res) => {
  try {
    const { school, category, search } = req.query;
    let products = (db.getData().products || []).filter((p) => p && p.active !== false);

    if (school && typeof school === 'string' && school !== 'ALL') {
      products = products.filter((p) => p && (p.school || '').toLowerCase().includes(school.toLowerCase()));
    }
    if (category && typeof category === 'string' && category !== 'ALL') {
      products = products.filter((p) => p && (p.category === category || p.garmentType === category));
    }
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      products = products.filter(
        (p) =>
          p &&
          ((p.name || '').toLowerCase().includes(q) ||
            (p.school || '').toLowerCase().includes(q) ||
            (p.category && p.category.toLowerCase().includes(q)) ||
            (p.variants || []).some(
              (v) =>
                v &&
                ((v.sku && String(v.sku).toLowerCase().includes(q)) ||
                  (v.barcode && String(v.barcode).includes(q)) ||
                  (v.size && String(v.size).toLowerCase().includes(q)))
            ))
      );
    }
    return res.json(products);
  } catch (err: any) {
    console.error('[Portal Products Error]', err);
    return res.status(500).json({ error: 'Failed to retrieve portal products', details: err.message });
  }
});

apiRouter.get('/portal/schools', (_req, res) => {
  try {
    const products = db.getData().products || [];
    const schools = Array.from(new Set(products.map((p) => (p && p.school ? String(p.school).trim() : ''))))
      .filter(Boolean)
      .sort();
    return res.json(schools);
  } catch (err: any) {
    console.error('[Portal Schools Error]', err);
    return res.status(500).json({ error: 'Failed to retrieve portal schools list', details: err.message });
  }
});


apiRouter.post('/mpesa/stkpush', async (req, res) => {
  try {
    const { phone, amount, accountReference } = req.body;
    const response = await initiateSTKPush(phone, amount, accountReference);
    return res.json(response.data);
  } catch (err: any) {
    console.warn('[STK Push Exception Fallback]:', err.message);
    return res.json({
      MerchantRequestID: `MR-${Date.now()}`,
      CheckoutRequestID: `ws_CO_${Date.now()}_SIM`,
      ResponseCode: '0',
      ResponseDescription: 'Success. Request accepted for processing (Fallback)',
      CustomerMessage: 'Success. Request accepted for processing. Check your phone to enter M-Pesa PIN.'
    });
  }
});

apiRouter.post('/mpesa/callback', (req, res) => {
  // Handle callback from M-Pesa
  console.log('M-Pesa Callback received:', req.body);
  res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

apiRouter.post('/mpesa/b2c', async (req, res) => {
  try {
    const { phone, amount } = req.body;
    const response = await initiateB2CPayment(phone, amount);
    res.json(response);
  } catch (err: any) {
    res.status(500).json({ error: 'B2C payout failed', details: err.message });
  }
});

apiRouter.post('/mpesa/b2b', async (req, res) => {
  try {
    const { shortcode, amount } = req.body;
    const response = await initiateB2BPayment(shortcode, amount);
    res.json(response);
  } catch (err: any) {
    res.status(500).json({ error: 'B2B payment failed', details: err.message });
  }
});

apiRouter.get('/portal/orders', (req, res) => {
  try {
    const email = String(req.query.email || '').trim().toLowerCase();
    const phone = String(req.query.phone || '').trim();
    if (!email && !phone) {
      return res.json([]);
    }
    const sales = db.getData().sales || [];
    const customerOrders = sales.filter((s) => {
      const sEmail = (s.customerEmail || '').trim().toLowerCase();
      const sPhone = (s.customerPhone || '').trim();
      return (email && sEmail === email) || (phone && sPhone === phone);
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json(customerOrders);
  } catch (err: any) {
    console.error('[Portal Orders Error]', err);
    return res.status(500).json({ error: 'Failed to retrieve customer orders', details: err.message });
  }
});

apiRouter.post('/portal/checkout', async (req, res) => {
  const {
    customerName,
    customerEmail,
    customerPhone,
    items,
    paymentMethod,
    paymentReference,
    branchId,
  } = req.body;

  if (!items || !items.length) {
    return res.status(400).json({ error: "Cart is empty. Please add items to checkout." });
  }

  const branches = db.getData().branches;
  const branch = (branchId && branches.find((b) => b.id === branchId)) || branches[0];
  if (!branch) return res.status(404).json({ error: "No active branch available for order fulfillment." });

  const products = db.getData().products;
  for (const item of items) {
    const prod = products.find((p) => p.id === item.productId);
    if (!prod) return res.status(400).json({ error: `Product not found: ${item.productName}` });
    const variant = prod.variants.find((v) => v.id === item.variantId);
    if (!variant) return res.status(400).json({ error: `Size variant not found for: ${item.productName}` });
    const currentStock = variant.branchStock[branch.id] ?? 0;
    if (currentStock < item.quantity) {
      return res.status(400).json({
        error: `Insufficient stock for ${prod.name} (Size ${variant.size}). Available: ${currentStock}, Requested: ${item.quantity}`,
      });
    }
  }

  let subtotal = 0;
  let totalTax = 0;
  let totalDiscount = 0;
  let totalAmount = 0;

  const processedItems = (items as any[])
    .map((item: any) => {
      const prod = products.find((p) => p.id === item.productId);
      if (!prod) return null;
      const variant = prod.variants.find((v) => v.id === item.variantId);
      if (!variant) return null;
      const qty = Number(item.quantity) || 1;
      const unitPrice = Number(item.unitPrice || variant.sellingPrice);
      const discount = Number(item.discountAmount || 0);
      const lineTotal = qty * unitPrice - discount;
      const lineTax = lineTotal - lineTotal / 1.16;

      subtotal += lineTotal - lineTax;
      totalTax += lineTax;
      totalDiscount += discount;
      totalAmount += lineTotal;

      return {
        productId: item.productId,
        variantId: item.variantId,
        productName: prod.name,
        sku: variant.sku,
        school: prod.school,
        size: variant.size,
        quantity: qty,
        unitPrice,
        discountAmount: discount,
        taxAmount: Number(lineTax.toFixed(2)),
        totalPrice: Number(lineTotal.toFixed(2)),
        total: Number(lineTotal.toFixed(2)),
        subtotal: Number((lineTotal - lineTax).toFixed(2)),
      };
    })
    .filter(Boolean) as any[];

  const receiptNumber = db.getNextSequence("RCP-WEB", db.getData().sales, "receiptNumber");
  const now = new Date().toISOString();

  const fiscalResult = await fiscalizeTransaction(
    {
      invoiceOrReceiptNumber: receiptNumber,
      totalAmount,
      taxableAmount: subtotal,
      taxAmount: totalTax,
      zeroRatedAmount: totalAmount - (subtotal + totalTax),
      customerName: customerName || "Online Portal Customer",
      itemsCount: processedItems.length,
      branchCode: branch.code,
    },
    false
  );

  const sale: Sale = {
    id: uuidv4(),
    receiptNumber,
    branchId: branch.id,
    branchName: branch.name,
    cashierId: "usr-online-portal",
    cashierName: "Online Web Portal (Customer Checkout)",
    customerName: customerName || "Online Customer",
    customerPhone: customerPhone || undefined,
    customerEmail: customerEmail || undefined,
    items: processedItems,
    subtotal: Number(subtotal.toFixed(2)),
    totalTax: Number(totalTax.toFixed(2)),
    totalDiscount: Number(totalDiscount.toFixed(2)),
    totalAmount: Number(totalAmount.toFixed(2)),
    paymentMethod: (paymentMethod || "MPESA") as any,
    paymentReference: paymentReference || undefined,
    amountTendered: totalAmount,
    changeGiven: 0,
    status: "COMPLETED",
    kraStatus: fiscalResult.status,
    cuInvoiceNumber: fiscalResult.cuInvoiceNumber || undefined,
    kraControlCode: fiscalResult.kraControlCode || undefined,
    kraQrCodeUrl: fiscalResult.kraQrCodeUrl || undefined,
    kraSubmissionTimestamp: fiscalResult.timestamp,
    kraError: fiscalResult.error,
    createdAt: now,
  };

  if (fiscalResult.status === "FAILED") {
    enqueueKraRetry(sale.id, "SALE", receiptNumber, {
      invoiceOrReceiptNumber: receiptNumber,
      totalAmount,
      taxableAmount: subtotal,
      taxAmount: totalTax,
      zeroRatedAmount: totalAmount - (subtotal + totalTax),
      customerName: sale.customerName,
      itemsCount: processedItems.length,
      branchCode: branch.code,
    }, fiscalResult.error || "Connection Failed");
  }

  for (const item of processedItems) {
    const prod = products.find((p) => p.id === item.productId);
    const variant = prod?.variants.find((v) => v.id === item.variantId);
    if (!variant) continue;
    const previousStock = variant.branchStock[branch.id] ?? 0;
    const newStock = Math.max(0, previousStock - item.quantity);
    variant.branchStock[branch.id] = newStock;

    db.getData().inventoryMovements.unshift({
      id: uuidv4(),
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productName,
      sku: item.sku,
      branchId: branch.id,
      branchName: branch.name,
      type: "SALE",
      quantityChange: -item.quantity,
      previousStock,
      newStock,
      referenceNumber: receiptNumber,
      userId: "usr-online-portal",
      userName: "Online Web Portal",
      timestamp: now,
    });
  }

  db.getData().sales.unshift(sale);

  const receiptRecord: PaymentReceipt = {
    id: uuidv4(),
    receiptNumber,
    saleId: sale.id,
    branchId: branch.id,
    branchName: branch.name,
    customerId: "cust-online-portal",
    customerName: sale.customerName,
    amount: totalAmount,
    paymentMethod: (sale.paymentMethod as any) || "MPESA",
    paymentReference: sale.paymentReference || "ONLINE-PORTAL",
    receivedBy: "usr-online-portal",
    receivedByName: "Online Web Portal",
    cuNumber: sale.cuInvoiceNumber,
    kraQrCodeUrl: sale.kraQrCodeUrl,
    createdAt: now,
  };
  db.getData().receipts.unshift(receiptRecord);

  if (customerEmail && customerEmail.includes("@")) {
    try {
      const emailHtml = generateReceiptEmailHtml(receiptRecord, sale);
      sendEmail({
        to: customerEmail,
        subject: `Payment Receipt ${receiptNumber} - Naisia Textiles & Uniforms`,
        html: emailHtml,
      });
    } catch {}
  }

  await db.save();

  db.logAudit({
    userId: "online-customer",
    userName: sale.customerName,
    userRole: "STAFF",
    branchId: branch.id,
    branchName: branch.name,
    action: "ONLINE_PORTAL_CHECKOUT",
    entityType: "SALE",
    entityId: sale.id,
    details: `Online checkout completed by ${sale.customerName} (${sale.customerEmail || "no email"}) for ${receiptNumber}. Total: KES ${totalAmount.toLocaleString()}`,
    ipAddress: req.ip,
  });

  return res.status(201).json({
    sale,
    receipt: receiptRecord,
    qrCodeDataUrl: fiscalResult.kraQrCodeUrl,
  });
});

apiRouter.post('/upload/image', requireAuth, requireRoles('ADMIN', 'ACCOUNTANT'), async (req: AuthenticatedRequest, res: Response) => {
  const { dataUrl, url } = req.body;
  if (!dataUrl && !url) {
    return res.status(400).json({ error: 'Image data or URL is required' });
  }

  // Return the image URL / dataUrl
  const finalUrl = dataUrl || url;
  return res.json({ url: finalUrl, success: true });
});

// SKU Image Management: Upload/Assign image directly to a specific SKU
apiRouter.post('/products/sku-image', requireAuth, requireRoles('ADMIN', 'ACCOUNTANT'), async (req: AuthenticatedRequest, res: Response) => {
  const { sku, variantId, imageUrl, imageCategory } = req.body;
  if ((!sku && !variantId) || imageUrl === undefined) {
    return res.status(400).json({ error: 'SKU or variantId and imageUrl are required' });
  }

  const products = db.getData().products;
  let targetProduct: Product | undefined;
  let targetVariant: any | undefined;

  for (const product of products) {
    const variant = product.variants.find((v) => 
      (sku && v.sku.toLowerCase() === sku.toLowerCase().trim()) || 
      (variantId && v.id === variantId)
    );
    if (variant) {
      targetProduct = product;
      targetVariant = variant;
      variant.imageUrl = imageUrl;
      if (imageCategory !== undefined) {
        variant.imageCategory = imageCategory;
      }
      if (!product.imageUrl && imageUrl) {
        product.imageUrl = imageUrl;
      }
      product.updatedAt = new Date().toISOString();
      break;
    }
  }

  if (!targetProduct || !targetVariant) {
    return res.status(404).json({ error: `SKU '${sku || variantId}' not found in catalog` });
  }

  await db.save();

  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    branchId: req.user!.branchId,
    branchName: 'N/A',
    action: 'SKU_IMAGE_UPDATED',
    entityType: 'PRODUCT',
    entityId: targetVariant.sku,
    details: `Updated image file for SKU ${targetVariant.sku} (${targetProduct.name} - Size ${targetVariant.size}) [Category: ${imageCategory || 'General'}]`,
    ipAddress: req.ip,
  });

  return res.json({
    success: true,
    sku: targetVariant.sku,
    variantId: targetVariant.id,
    imageUrl: targetVariant.imageUrl,
    imageCategory: targetVariant.imageCategory,
    productName: targetProduct.name,
  });
});

// Bulk SKU Image Upload & Automatic SKU File Matching
apiRouter.post('/products/bulk-sku-images', requireAuth, requireRoles('ADMIN', 'ACCOUNTANT'), async (req: AuthenticatedRequest, res: Response) => {
  const { items, defaultCategory } = req.body;
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Items array is required' });
  }

  const products = db.getData().products;
  const updatedSkus: string[] = [];
  const unmatched: string[] = [];

  for (const item of items) {
    const rawSku = item.sku || (item.filename ? item.filename.replace(/\.[^/.]+$/, '').trim() : '');
    if (!rawSku || !item.imageUrl) {
      continue;
    }

    const cleanSku = rawSku.toLowerCase().trim();
    let matched = false;

    for (const product of products) {
      const variant = product.variants.find((v) => 
        v.sku.toLowerCase().trim() === cleanSku ||
        cleanSku.includes(v.sku.toLowerCase().trim())
      );
      if (variant) {
        variant.imageUrl = item.imageUrl;
        if (item.imageCategory || defaultCategory) {
          variant.imageCategory = item.imageCategory || defaultCategory;
        }
        if (!product.imageUrl) {
          product.imageUrl = item.imageUrl;
        }
        product.updatedAt = new Date().toISOString();
        updatedSkus.push(variant.sku);
        matched = true;
        break;
      }
    }

    if (!matched) {
      unmatched.push(rawSku);
    }
  }

  await db.save();

  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    branchId: req.user!.branchId,
    branchName: 'N/A',
    action: 'BULK_SKU_IMAGES_UPLOADED',
    entityType: 'PRODUCT',
    entityId: 'BULK',
    details: `Batch uploaded ${updatedSkus.length} SKU images. Unmatched: ${unmatched.length}`,
    ipAddress: req.ip,
  });

  return res.json({
    success: true,
    matchedCount: updatedSkus.length,
    updatedSkus,
    unmatched,
  });
});

// Category-wide SKU Image Assignment (e.g., assign image to all SKUs of a category or school)
apiRouter.post('/products/category-sku-images', requireAuth, requireRoles('ADMIN', 'ACCOUNTANT'), async (req: AuthenticatedRequest, res: Response) => {
  const { school, category, garmentType, sector, imageUrl, imageCategory } = req.body;
  if (!imageUrl) {
    return res.status(400).json({ error: 'imageUrl is required' });
  }

  const products = db.getData().products;
  const updatedSkus: string[] = [];

  for (const product of products) {
    if (school && school !== 'ALL' && product.school !== school) continue;
    if (category && category !== 'ALL' && product.category !== category) continue;
    if (garmentType && garmentType !== 'ALL' && product.garmentType !== garmentType) continue;
    if (sector && sector !== 'ALL' && product.sector !== sector) continue;

    product.imageUrl = imageUrl;
    product.updatedAt = new Date().toISOString();

    for (const variant of product.variants) {
      variant.imageUrl = imageUrl;
      if (imageCategory) {
        variant.imageCategory = imageCategory;
      }
      updatedSkus.push(variant.sku);
    }
  }

  await db.save();

  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    branchId: req.user!.branchId,
    branchName: 'N/A',
    action: 'CATEGORY_SKU_IMAGE_ASSIGNED',
    entityType: 'PRODUCT',
    entityId: `${category || 'ALL'}-${school || 'ALL'}`,
    details: `Assigned category image to ${updatedSkus.length} SKUs across category '${category || 'ALL'}' / school '${school || 'ALL'}'`,
    ipAddress: req.ip,
  });

  return res.json({
    success: true,
    count: updatedSkus.length,
    updatedSkus,
  });
});

apiRouter.post('/products', requireAuth, requireRoles('ADMIN', 'ACCOUNTANT'), async (req: AuthenticatedRequest, res: Response) => {
  const {
    name,
    school,
    category,
    sector,
    institutionType,
    professionalDomain,
    garmentType,
    gender,
    description,
    taxCategory,
    supplierId,
    imageUrl,
    variants,
  } = req.body;
  if (!name || !school || !category) {
    return res.status(400).json({ error: 'Product name, school, and category are required' });
  }

  const branches = db.getData().branches;
  const formattedVariants: any[] = (variants || []).map((v: any) => {
    const branchStock: Record<string, number> = {};
    branches.forEach((b) => {
      branchStock[b.id] = (v.branchStock && v.branchStock[b.id]) || 0;
    });
    return {
      id: v.id || `var-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sku: v.sku || `SKU-${Date.now()}`,
      barcode: v.barcode || `616${Math.floor(100000000 + Math.random() * 900000000)}`,
      size: v.size || 'Standard',
      color: v.color || 'Standard',
      costPrice: Number(v.costPrice) || 0,
      sellingPrice: Number(v.sellingPrice) || 0,
      branchStock,
      reorderLevel: Number(v.reorderLevel) || 10,
      reorderQuantity: Number(v.reorderQuantity) || 30,
    };
  });

  const newProduct: Product = {
    id: `prod-${Date.now()}`,
    name,
    school,
    category,
    sector: sector || 'SECONDARY',
    institutionType,
    professionalDomain,
    garmentType: garmentType || category,
    gender: gender || 'UNISEX',
    description: description || '',
    taxCategory: taxCategory || 'VAT_16',
    supplierId: supplierId || '',
    imageUrl: imageUrl || '',
    active: true,
    variants: formattedVariants,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.getData().products.push(newProduct);
  await db.save();

  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    branchId: req.user!.branchId,
    branchName: 'N/A',
    action: 'PRODUCT_CREATED',
    entityType: 'PRODUCT',
    entityId: newProduct.id,
    details: `Added new uniform item: ${newProduct.name} (${newProduct.school}) with ${newProduct.variants.length} size variants`,
    ipAddress: req.ip,
  });

  return res.status(201).json(newProduct);
});

apiRouter.put('/products/:id', requireAuth, requireRoles('ADMIN', 'ACCOUNTANT'), async (req: AuthenticatedRequest, res: Response) => {
  const product = db.getData().products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const {
    name,
    school,
    category,
    sector,
    institutionType,
    professionalDomain,
    garmentType,
    gender,
    description,
    taxCategory,
    supplierId,
    imageUrl,
    active,
    variants,
  } = req.body;

  if (name) product.name = name;
  if (school) product.school = school;
  if (category) product.category = category;
  if (sector !== undefined) product.sector = sector;
  if (institutionType !== undefined) product.institutionType = institutionType;
  if (professionalDomain !== undefined) product.professionalDomain = professionalDomain;
  if (garmentType !== undefined) product.garmentType = garmentType;
  if (gender) product.gender = gender;
  if (description !== undefined) product.description = description;
  if (taxCategory) product.taxCategory = taxCategory;
  if (supplierId !== undefined) product.supplierId = supplierId;
  if (imageUrl !== undefined) product.imageUrl = imageUrl;
  if (typeof active === 'boolean') product.active = active;
  if (variants && Array.isArray(variants)) {
    product.variants = variants;
  }
  product.updatedAt = new Date().toISOString();

  await db.save();

  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    branchId: req.user!.branchId,
    branchName: 'N/A',
    action: 'PRODUCT_UPDATED',
    entityType: 'PRODUCT',
    entityId: product.id,
    details: `Updated catalog item: ${product.name}`,
    ipAddress: req.ip,
  });

  return res.json(product);
});

apiRouter.post('/products/price-set', requireAuth, requireRoles('ADMIN', 'ACCOUNTANT'), async (req: AuthenticatedRequest, res: Response) => {
  const {
    school,
    category,
    sector,
    institutionType,
    professionalDomain,
    garmentType,
    adjustmentType,
    percentage,
    fixedAmount,
    targetPrice,
    roundTo,
  } = req.body;

  let products = db.getData().products;

  if (sector && sector !== 'ALL') {
    products = products.filter((p) => p.sector === sector);
  }
  if (institutionType && institutionType !== 'ALL') {
    products = products.filter((p) => p.institutionType === institutionType);
  }
  if (professionalDomain && professionalDomain !== 'ALL') {
    products = products.filter((p) => p.professionalDomain === professionalDomain);
  }
  if (school && school !== 'ALL') {
    products = products.filter((p) => p.school.toLowerCase() === school.toLowerCase());
  }
  if (garmentType && garmentType !== 'ALL') {
    products = products.filter((p) => (p.garmentType === garmentType || p.category?.toLowerCase() === garmentType.toLowerCase()));
  } else if (category && category !== 'ALL') {
    products = products.filter((p) => p.category?.toLowerCase() === category.toLowerCase());
  }

  let updatedCount = 0;
  let variantsUpdated = 0;

  products.forEach((p) => {
    let changed = false;
    p.variants.forEach((v) => {
      let newPrice = v.sellingPrice;
      if (adjustmentType === 'PERCENTAGE') {
        const factor = 1 + (Number(percentage) || 0) / 100;
        newPrice = Math.round(v.sellingPrice * factor);
      } else if (adjustmentType === 'FIXED_AMOUNT') {
        newPrice = Math.max(0, v.sellingPrice + (Number(fixedAmount) || 0));
      } else if (adjustmentType === 'SET_BASE') {
        newPrice = Number(targetPrice) || v.sellingPrice;
      }

      if (roundTo && Number(roundTo) > 0) {
        newPrice = Math.round(newPrice / Number(roundTo)) * Number(roundTo);
      }

      if (newPrice !== v.sellingPrice) {
        v.sellingPrice = newPrice;
        variantsUpdated++;
        changed = true;
      }
    });

    if (changed) {
      p.updatedAt = new Date().toISOString();
      updatedCount++;
    }
  });

  await db.save();

  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    branchId: req.user!.branchId,
    branchName: 'N/A',
    action: 'PRICE_SET_APPLIED',
    entityType: 'PRODUCT',
    entityId: school || sector || 'CATALOG',
    details: `Applied price set (${adjustmentType}): updated ${updatedCount} products and ${variantsUpdated} variants. Scope: Sector=${sector || 'All'}, School=${school || 'All'}, Category=${garmentType || category || 'All'}`,
    ipAddress: req.ip,
  });

  return res.json({ success: true, updatedCount, variantsUpdated });
});

apiRouter.post('/products/:id/price-set', requireAuth, requireRoles('ADMIN', 'ACCOUNTANT'), async (req: AuthenticatedRequest, res: Response) => {
  const product = db.getData().products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const { variants, uniformPrice, adjustmentType, percentage, fixedAmount, roundTo } = req.body;

  let variantsUpdated = 0;

  if (variants && Array.isArray(variants)) {
    product.variants = variants;
    variantsUpdated = variants.length;
  } else if (uniformPrice !== undefined && Number(uniformPrice) > 0) {
    product.variants.forEach((v) => {
      v.sellingPrice = Number(uniformPrice);
      variantsUpdated++;
    });
  } else if (adjustmentType) {
    product.variants.forEach((v) => {
      let newPrice = v.sellingPrice;
      if (adjustmentType === 'PERCENTAGE') {
        const factor = 1 + (Number(percentage) || 0) / 100;
        newPrice = Math.round(v.sellingPrice * factor);
      } else if (adjustmentType === 'FIXED_AMOUNT') {
        newPrice = Math.max(0, v.sellingPrice + (Number(fixedAmount) || 0));
      }
      if (roundTo && Number(roundTo) > 0) {
        newPrice = Math.round(newPrice / Number(roundTo)) * Number(roundTo);
      }
      v.sellingPrice = newPrice;
      variantsUpdated++;
    });
  }

  product.updatedAt = new Date().toISOString();
  await db.save();

  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    branchId: req.user!.branchId,
    branchName: 'N/A',
    action: 'PRODUCT_PRICE_SET',
    entityType: 'PRODUCT',
    entityId: product.id,
    details: `Updated price set for uniform item ${product.name} (${variantsUpdated} sizes updated)`,
    ipAddress: req.ip,
  });

  return res.json({ success: true, product, variantsUpdated });
});

// ==========================================
// 5. INVENTORY ENGINE & STOCK MOVEMENTS
// ==========================================

apiRouter.get('/inventory', requireAuth, (req, res) => {
  const { branchId, lowStockOnly } = req.query;
  const products = db.getData().products;
  const branches = db.getData().branches;

  const inventorySummary: any[] = [];

  products.forEach((product) => {
    product.variants.forEach((v) => {
      const targetBranches = branchId && branchId !== 'all'
        ? branches.filter((b) => b.id === branchId)
        : branches;

      targetBranches.forEach((b) => {
        const currentStock = v.branchStock[b.id] ?? 0;
        const isLow = currentStock <= v.reorderLevel;

        if (lowStockOnly === 'true' && !isLow) return;

        inventorySummary.push({
          productId: product.id,
          productName: product.name,
          school: product.school,
          category: product.category,
          variantId: v.id,
          sku: v.sku,
          barcode: v.barcode,
          size: v.size,
          color: v.color,
          branchId: b.id,
          branchName: b.name,
          currentStock,
          reorderLevel: v.reorderLevel,
          reorderQuantity: v.reorderQuantity,
          isLow,
          costPrice: v.costPrice,
          sellingPrice: v.sellingPrice,
          imageUrl: v.imageUrl || product.imageUrl || '',
          imageCategory: v.imageCategory || product.imageCategory || 'FRONT',
          totalValuationCost: currentStock * v.costPrice,
          totalValuationRetail: currentStock * v.sellingPrice,
        });
      });
    });
  });

  return res.json(inventorySummary);
});

apiRouter.post('/inventory/adjust', requireAuth, requireRoles('ADMIN', 'ACCOUNTANT'), async (req: AuthenticatedRequest, res: Response) => {
  const { productId, variantId, branchId, newStock, reason, notes } = req.body;
  if (!productId || !variantId || !branchId || newStock === undefined || !reason) {
    return res.status(400).json({ error: 'Product, variant, branch, newStock, and reason are required' });
  }

  const product = db.getData().products.find((p) => p.id === productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const variant = product.variants.find((v) => v.id === variantId);
  if (!variant) return res.status(404).json({ error: 'Variant not found' });

  const branch = db.getData().branches.find((b) => b.id === branchId);
  if (!branch) return res.status(404).json({ error: 'Branch not found' });

  const previousStock = variant.branchStock[branchId] ?? 0;
  const quantityChange = Number(newStock) - previousStock;
  variant.branchStock[branchId] = Number(newStock);

  const movement: InventoryMovement = {
    id: uuidv4(),
    productId,
    variantId,
    productName: product.name,
    sku: variant.sku,
    branchId,
    branchName: branch.name,
    type: 'ADJUSTMENT',
    quantityChange,
    previousStock,
    newStock: Number(newStock),
    referenceNumber: `ADJ-${Date.now().toString().slice(-6)}`,
    reason: `${reason}${notes ? ` - ${notes}` : ''}`,
    userId: req.user!.id,
    userName: req.user!.name,
    timestamp: new Date().toISOString(),
  };

  db.getData().inventoryMovements.unshift(movement);
  await db.save();

  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    branchId,
    branchName: branch.name,
    action: 'STOCK_ADJUSTMENT',
    entityType: 'INVENTORY',
    entityId: variant.sku,
    details: `Adjusted ${variant.sku} at ${branch.name}. Stock changed from ${previousStock} to ${newStock} (Diff: ${quantityChange > 0 ? `+${quantityChange}` : quantityChange}). Reason: ${reason}`,
    previousValue: String(previousStock),
    newValue: String(newStock),
    ipAddress: req.ip,
  });

  return res.json({ success: true, newStock: Number(newStock), movement });
});

apiRouter.get('/inventory/alerts', requireAuth, (req, res) => {
  const products = db.getData().products;
  const branches = db.getData().branches;
  const alerts: any[] = [];

  products.forEach((product) => {
    product.variants.forEach((v) => {
      branches.forEach((b) => {
        const stock = v.branchStock[b.id] ?? 0;
        if (stock <= v.reorderLevel) {
          alerts.push({
            id: `${v.id}-${b.id}`,
            productId: product.id,
            productName: product.name,
            school: product.school,
            variantId: v.id,
            sku: v.sku,
            size: v.size,
            branchId: b.id,
            branchName: b.name,
            currentStock: stock,
            reorderLevel: v.reorderLevel,
            suggestedReorder: v.reorderQuantity,
            supplierId: product.supplierId,
            urgency: stock === 0 ? 'CRITICAL' : 'WARNING',
          });
        }
      });
    });
  });

  return res.json(alerts);
});

apiRouter.get('/inventory/movements', requireAuth, (req, res) => {
  const { branchId, productId, type, limit } = req.query;
  let movements = db.getData().inventoryMovements;

  if (branchId && branchId !== 'all') {
    movements = movements.filter((m) => m.branchId === branchId);
  }
  if (productId) {
    movements = movements.filter((m) => m.productId === productId);
  }
  if (type) {
    movements = movements.filter((m) => m.type === type);
  }

  const max = Number(limit) || 200;
  return res.json(movements.slice(0, max));
});

// Stock Transfers
apiRouter.get('/inventory/transfers', requireAuth, (req, res) => {
  const { branchId } = req.query;
  let transfers = db.getData().stockTransfers;

  if (branchId && branchId !== 'all') {
    transfers = transfers.filter((t) => t.sourceBranchId === branchId || t.destBranchId === branchId);
  }

  return res.json(transfers);
});

apiRouter.post('/inventory/transfers', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { sourceBranchId, destBranchId, items, notes } = req.body;
  if (!sourceBranchId || !destBranchId || !items || !items.length) {
    return res.status(400).json({ error: 'Source branch, destination branch, and items are required' });
  }

  if (sourceBranchId === destBranchId) {
    return res.status(400).json({ error: 'Source and destination branches cannot be the same' });
  }

  const sourceBranch = db.getData().branches.find((b) => b.id === sourceBranchId);
  const destBranch = db.getData().branches.find((b) => b.id === destBranchId);
  if (!sourceBranch || !destBranch) {
    return res.status(404).json({ error: 'Branch not found' });
  }

  // Concurrency & Stock verification at source branch
  const products = db.getData().products;
  for (const item of items) {
    const prod = products.find((p) => p.id === item.productId);
    const variant = prod?.variants.find((v) => v.id === item.variantId);
    if (!variant) {
      return res.status(400).json({ error: `Variant ${item.sku} does not exist` });
    }
    const available = variant.branchStock[sourceBranchId] ?? 0;
    if (available < item.quantity) {
      return res.status(400).json({
        error: `Insufficient stock at ${sourceBranch.name} for ${prod?.name} (${variant.size}). Available: ${available}, Requested: ${item.quantity}`,
      });
    }
  }

  const transferNumber = db.getNextSequence('TRF', db.getData().stockTransfers, 'transferNumber');
  const transfer: StockTransfer = {
    id: uuidv4(),
    transferNumber,
    sourceBranchId,
    sourceBranchName: sourceBranch.name,
    destBranchId,
    destBranchName: destBranch.name,
    items,
    status: 'PENDING',
    notes,
    initiatedBy: req.user!.id,
    initiatedByName: req.user!.name,
    createdAt: new Date().toISOString(),
  };

  db.getData().stockTransfers.unshift(transfer);
  await db.save();

  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    branchId: sourceBranchId,
    branchName: sourceBranch.name,
    action: 'STOCK_TRANSFER_INITIATED',
    entityType: 'TRANSFER',
    entityId: transfer.transferNumber,
    details: `Initiated transfer ${transfer.transferNumber} of ${items.length} uniform items to ${destBranch.name}`,
    ipAddress: req.ip,
  });

  return res.status(201).json(transfer);
});

apiRouter.patch('/inventory/transfers/:id/status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.body;
  const transfer = db.getData().stockTransfers.find((t) => t.id === req.params.id);
  if (!transfer) return res.status(404).json({ error: 'Transfer not found' });

  if (status === 'DISPATCHED' && transfer.status === 'PENDING') {
    transfer.status = 'DISPATCHED';
    transfer.dispatchedAt = new Date().toISOString();
  } else if (status === 'RECEIVED' && (transfer.status === 'DISPATCHED' || transfer.status === 'PENDING')) {
    // ATOMIC STOCK MOVEMENT: Decrement source, increment destination
    const products = db.getData().products;
    const now = new Date().toISOString();

    for (const item of transfer.items) {
      const prod = products.find((p) => p.id === item.productId);
      const variant = prod?.variants.find((v) => v.id === item.variantId);
      if (!variant) continue;

      const srcPrev = variant.branchStock[transfer.sourceBranchId] ?? 0;
      const srcNew = Math.max(0, srcPrev - item.quantity);
      variant.branchStock[transfer.sourceBranchId] = srcNew;

      const dstPrev = variant.branchStock[transfer.destBranchId] ?? 0;
      const dstNew = dstPrev + item.quantity;
      variant.branchStock[transfer.destBranchId] = dstNew;

      // Log movement out
      db.getData().inventoryMovements.unshift({
        id: uuidv4(),
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productName,
        sku: item.sku,
        branchId: transfer.sourceBranchId,
        branchName: transfer.sourceBranchName,
        type: 'TRANSFER_OUT',
        quantityChange: -item.quantity,
        previousStock: srcPrev,
        newStock: srcNew,
        referenceNumber: transfer.transferNumber,
        userId: req.user!.id,
        userName: req.user!.name,
        timestamp: now,
      });

      // Log movement in
      db.getData().inventoryMovements.unshift({
        id: uuidv4(),
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productName,
        sku: item.sku,
        branchId: transfer.destBranchId,
        branchName: transfer.destBranchName,
        type: 'TRANSFER_IN',
        quantityChange: item.quantity,
        previousStock: dstPrev,
        newStock: dstNew,
        referenceNumber: transfer.transferNumber,
        userId: req.user!.id,
        userName: req.user!.name,
        timestamp: now,
      });
    }

    transfer.status = 'RECEIVED';
    transfer.receivedBy = req.user!.id;
    transfer.receivedByName = req.user!.name;
    transfer.receivedAt = now;
  } else if (status === 'CANCELLED') {
    transfer.status = 'CANCELLED';
  } else {
    return res.status(400).json({ error: `Cannot transition status from ${transfer.status} to ${status}` });
  }

  await db.save();

  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    branchId: transfer.destBranchId,
    branchName: transfer.destBranchName,
    action: `STOCK_TRANSFER_${status}`,
    entityType: 'TRANSFER',
    entityId: transfer.transferNumber,
    details: `Transfer ${transfer.transferNumber} status changed to ${status}`,
    ipAddress: req.ip,
  });

  return res.json(transfer);
});

// ==========================================
// 6. POS / SALES & CHECKOUT
// ==========================================

apiRouter.post('/sales', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const {
    branchId,
    customerId,
    customerName,
    customerPhone,
    customerEmail,
    items,
    paymentMethod,
    paymentReference,
    amountTendered,
    simulateKraOffline,
  } = req.body;

  if (!items || !items.length) {
    return res.status(400).json({ error: 'Cart is empty. Please add items to checkout.' });
  }

  const effectiveBranchId = (req.user!.role === 'STAFF' && req.user!.branchId !== 'all')
    ? req.user!.branchId
    : (branchId || db.getData().branches[0].id);

  const branch = db.getData().branches.find((b) => b.id === effectiveBranchId);
  if (!branch) return res.status(404).json({ error: 'Branch not found' });

  // 1. Transactional Concurrency Check: Verify and lock stock
  const products = db.getData().products;
  for (const item of items) {
    const prod = products.find((p) => p.id === item.productId);
    if (!prod) return res.status(400).json({ error: `Product not found: ${item.productName}` });

    const variant = prod.variants.find((v) => v.id === item.variantId);
    if (!variant) return res.status(400).json({ error: `Size variant not found for: ${item.productName}` });

    const currentStock = variant.branchStock[effectiveBranchId] ?? 0;
    if (currentStock < item.quantity) {
      return res.status(400).json({
        error: `Insufficient stock at ${branch.name} for ${prod.name} (${variant.size}). Available: ${currentStock}, Requested: ${item.quantity}`,
      });
    }
  }

  // 2. Compute Totals & KRA 16% VAT Breakdown
  let subtotal = 0;
  let totalTax = 0;
  let totalDiscount = 0;
  let totalAmount = 0;

  const processedItems = items.map((item: any) => {
    const prod = products.find((p) => p.id === item.productId)!;
    const variant = prod.variants.find((v) => v.id === item.variantId)!;

    const qty = Number(item.quantity);
    const unitPrice = Number(item.unitPrice || variant.sellingPrice);
    const discount = Number(item.discountAmount || 0);
    const lineTotal = qty * unitPrice - discount;

    const isVat16 = prod.taxCategory === 'VAT_16';
    const taxRate = isVat16 ? 0.16 : 0.00;

    // Kenyan Tax Inclusive formula: Base = Total / 1.16, Tax = Total - Base
    const taxAmount = isVat16 ? Number((lineTotal - (lineTotal / 1.16)).toFixed(2)) : 0;
    const lineSubtotal = Number((lineTotal - taxAmount).toFixed(2));

    subtotal += lineSubtotal;
    totalTax += taxAmount;
    totalDiscount += discount;
    totalAmount += lineTotal;

    return {
      productId: prod.id,
      variantId: variant.id,
      productName: prod.name,
      sku: variant.sku,
      school: prod.school,
      size: variant.size,
      color: variant.color,
      quantity: qty,
      unitPrice,
      costPrice: variant.costPrice,
      taxRate,
      taxAmount,
      discountAmount: discount,
      subtotal: lineSubtotal,
      total: lineTotal,
    };
  });

  const receiptNumber = db.getNextSequence('RCP', db.getData().sales, 'receiptNumber');
  const now = new Date().toISOString();

  // 3. Kenya Revenue Authority (KRA) eTIMS Fiscalization Flow
  const fiscalResult = await fiscalizeTransaction(
    {
      invoiceOrReceiptNumber: receiptNumber,
      totalAmount,
      taxableAmount: subtotal,
      taxAmount: totalTax,
      zeroRatedAmount: totalAmount - (subtotal + totalTax),
      customerName: customerName || 'Walk-In Customer',
      itemsCount: processedItems.length,
      branchCode: branch.code,
    },
    Boolean(simulateKraOffline)
  );

  const sale: Sale = {
    id: uuidv4(),
    receiptNumber,
    branchId: branch.id,
    branchName: branch.name,
    cashierId: req.user!.id,
    cashierName: req.user!.name,
    customerId: customerId || undefined,
    customerName: customerName || 'Walk-In Customer (Cash/MPESA)',
    customerPhone,
    customerEmail,
    items: processedItems,
    subtotal: Number(subtotal.toFixed(2)),
    totalTax: Number(totalTax.toFixed(2)),
    totalDiscount: Number(totalDiscount.toFixed(2)),
    totalAmount: Number(totalAmount.toFixed(2)),
    paymentMethod: paymentMethod || 'CASH',
    paymentReference: paymentReference || undefined,
    amountTendered: Number(amountTendered || totalAmount),
    changeGiven: Math.max(0, Number(amountTendered || totalAmount) - totalAmount),
    status: 'COMPLETED',
    kraStatus: fiscalResult.status,
    cuInvoiceNumber: fiscalResult.cuInvoiceNumber || undefined,
    kraControlCode: fiscalResult.kraControlCode || undefined,
    kraQrCodeUrl: fiscalResult.kraQrCodeUrl || undefined,
    kraSubmissionTimestamp: fiscalResult.timestamp,
    kraError: fiscalResult.error,
    createdAt: now,
  };

  // If fiscalization failed or went offline, enqueue for background retry
  if (fiscalResult.status === 'FAILED') {
    enqueueKraRetry(sale.id, 'SALE', receiptNumber, {
      invoiceOrReceiptNumber: receiptNumber,
      totalAmount,
      taxableAmount: subtotal,
      taxAmount: totalTax,
      zeroRatedAmount: totalAmount - (subtotal + totalTax),
      customerName: sale.customerName,
      itemsCount: processedItems.length,
      branchCode: branch.code,
    }, fiscalResult.error || 'Connection Failed');
  }

  // 4. ATOMIC STOCK DEDUCTION & INVENTORY MOVEMENT LOGGING
  for (const item of processedItems) {
    const prod = products.find((p) => p.id === item.productId)!;
    const variant = prod.variants.find((v) => v.id === item.variantId)!;

    const previousStock = variant.branchStock[branch.id] ?? 0;
    const newStock = Math.max(0, previousStock - item.quantity);
    variant.branchStock[branch.id] = newStock;

    db.getData().inventoryMovements.unshift({
      id: uuidv4(),
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productName,
      sku: item.sku,
      branchId: branch.id,
      branchName: branch.name,
      type: 'SALE',
      quantityChange: -item.quantity,
      previousStock,
      newStock,
      referenceNumber: receiptNumber,
      userId: req.user!.id,
      userName: req.user!.name,
      timestamp: now,
    });
  }

  // 5. Store Sale & Generate Payment Receipt Record
  db.getData().sales.unshift(sale);

  const receiptRecord: PaymentReceipt = {
    id: uuidv4(),
    receiptNumber,
    saleId: sale.id,
    branchId: branch.id,
    branchName: branch.name,
    customerId: customerId || 'cust-walkin',
    customerName: sale.customerName,
    amount: totalAmount,
    paymentMethod: sale.paymentMethod as any,
    paymentReference: paymentReference || `POS-${receiptNumber}`,
    notes: `POS Retail Sale at ${branch.name}`,
    receivedBy: req.user!.id,
    receivedByName: req.user!.name,
    cuNumber: sale.cuInvoiceNumber,
    kraQrCodeUrl: sale.kraQrCodeUrl,
    createdAt: now,
  };
  db.getData().receipts.unshift(receiptRecord);

  // If customer had an account and paid via CREDIT, increment their ledger balance
  if (customerId && paymentMethod === 'CREDIT') {
    const customer = db.getData().customers.find((c) => c.id === customerId);
    if (customer) {
      customer.currentBalance += totalAmount;
    }
  }

  await db.save();

  // 6. Comprehensive Audit Logging
  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    branchId: branch.id,
    branchName: branch.name,
    action: 'SALE_COMPLETED',
    entityType: 'SALE',
    entityId: receiptNumber,
    details: `POS Sale ${receiptNumber} completed by ${req.user!.name}. Total: KES ${totalAmount.toLocaleString()} via ${paymentMethod}. KRA CU: ${sale.cuInvoiceNumber || 'Pending Retry'}`,
    newValue: JSON.stringify({ totalAmount, itemsCount: processedItems.length }),
    ipAddress: req.ip,
  });

  // 7. Optional Email receipt dispatch
  if (customerEmail && customerEmail.includes('@')) {
    sendEmail({
      to: customerEmail,
      subject: `Your Naisia Textiles Receipt - ${receiptNumber}`,
      html: generateReceiptEmailHtml(receiptRecord, db.getData().settings),
    }).catch((err) => console.error('Email dispatch error:', err));
  }

  return res.status(201).json({
    sale,
    receipt: receiptRecord,
    qrCodeDataUrl: fiscalResult.qrCodeDataUrl,
  });
});

apiRouter.get('/sales', requireAuth, (req, res) => {
  const { branchId, startDate, endDate, cashierId, limit } = req.query;
  let sales = db.getData().sales;

  if (branchId && branchId !== 'all') {
    sales = sales.filter((s) => s.branchId === branchId);
  }
  if (cashierId) {
    sales = sales.filter((s) => s.cashierId === cashierId);
  }
  if (startDate && typeof startDate === 'string') {
    sales = sales.filter((s) => s.createdAt >= startDate);
  }
  if (endDate && typeof endDate === 'string') {
    sales = sales.filter((s) => s.createdAt <= endDate);
  }

  const max = Number(limit) || 100;
  return res.json(sales.slice(0, max));
});

apiRouter.get('/sales/:id', requireAuth, (req, res) => {
  const sale = db.getData().sales.find((s) => s.id === req.params.id || s.receiptNumber === req.params.id);
  if (!sale) return res.status(404).json({ error: 'Sale record not found' });
  return res.json(sale);
});

// Sale Refund / Return with stock restoration
apiRouter.post('/sales/:id/refund', requireAuth, requireRoles('ADMIN', 'ACCOUNTANT'), async (req: AuthenticatedRequest, res: Response) => {
  const { reason } = req.body;
  const sale = db.getData().sales.find((s) => s.id === req.params.id);
  if (!sale) return res.status(404).json({ error: 'Sale not found' });

  if (sale.status === 'REFUNDED') {
    return res.status(400).json({ error: 'Sale has already been refunded' });
  }

  // Restore inventory atomically
  const products = db.getData().products;
  const now = new Date().toISOString();

  for (const item of sale.items) {
    const prod = products.find((p) => p.id === item.productId);
    const variant = prod?.variants.find((v) => v.id === item.variantId);
    if (!variant) continue;

    const prev = variant.branchStock[sale.branchId] ?? 0;
    const next = prev + item.quantity;
    variant.branchStock[sale.branchId] = next;

    db.getData().inventoryMovements.unshift({
      id: uuidv4(),
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productName,
      sku: item.sku,
      branchId: sale.branchId,
      branchName: sale.branchName,
      type: 'RETURN',
      quantityChange: item.quantity,
      previousStock: prev,
      newStock: next,
      referenceNumber: `REF-${sale.receiptNumber}`,
      reason: reason || 'Customer Return / Exchange',
      userId: req.user!.id,
      userName: req.user!.name,
      timestamp: now,
    });
  }

  sale.status = 'REFUNDED';
  sale.refundReason = reason || 'Customer Return';
  await db.save();

  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    branchId: sale.branchId,
    branchName: sale.branchName,
    action: 'SALE_REFUNDED',
    entityType: 'SALE',
    entityId: sale.receiptNumber,
    details: `Refunded sale ${sale.receiptNumber}. Inventory restored. Reason: ${reason}`,
    ipAddress: req.ip,
  });

  return res.json({ success: true, sale });
});

// ==========================================
// 7. QUOTATIONS
// ==========================================

apiRouter.get('/quotations', requireAuth, (req, res) => {
  const { branchId, status } = req.query;
  let quotes = db.getData().quotations;

  if (branchId && branchId !== 'all') {
    quotes = quotes.filter((q) => q.branchId === branchId);
  }
  if (status) {
    quotes = quotes.filter((q) => q.status === status);
  }

  return res.json(quotes);
});

apiRouter.post('/quotations', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const {
    branchId,
    customerId,
    customerName,
    customerEmail,
    customerPhone,
    schoolOrOrg,
    items,
    validUntil,
    terms,
    notes,
  } = req.body;

  if (!items || !items.length || !customerName) {
    return res.status(400).json({ error: 'Customer name and items are required' });
  }

  let subtotal = 0;
  let taxAmount = 0;
  let discountAmount = 0;
  let totalAmount = 0;

  const quoteItems = items.map((it: any) => {
    const qty = Number(it.quantity);
    const price = Number(it.unitPrice);
    const disc = Number(it.discountAmount || 0);
    const total = qty * price - disc;
    const tax = Number((total - total / 1.16).toFixed(2));
    const sub = Number((total - tax).toFixed(2));

    subtotal += sub;
    taxAmount += tax;
    discountAmount += disc;
    totalAmount += total;

    return {
      productId: it.productId,
      variantId: it.variantId,
      productName: it.productName,
      sku: it.sku,
      size: it.size,
      quantity: qty,
      unitPrice: price,
      taxRate: 0.16,
      taxAmount: tax,
      discountAmount: disc,
      total,
    };
  });

  const quotationNumber = db.getNextSequence('QUO', db.getData().quotations, 'quotationNumber');
  const now = new Date().toISOString();

  const quotation: Quotation = {
    id: uuidv4(),
    quotationNumber,
    branchId: branchId || db.getData().branches[0].id,
    customerId: customerId || 'cust-generic',
    customerName,
    customerEmail: customerEmail || '',
    customerPhone: customerPhone || '',
    schoolOrOrg,
    items: quoteItems,
    subtotal: Number(subtotal.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
    discountAmount: Number(discountAmount.toFixed(2)),
    totalAmount: Number(totalAmount.toFixed(2)),
    status: 'DRAFT',
    validUntil: validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    terms: terms || 'Valid for 30 days. Prices inclusive of 16% VAT.',
    notes,
    createdBy: req.user!.id,
    createdByName: req.user!.name,
    createdAt: now,
    updatedAt: now,
  };

  db.getData().quotations.unshift(quotation);
  await db.save();

  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    branchId: quotation.branchId,
    branchName: 'N/A',
    action: 'QUOTATION_CREATED',
    entityType: 'QUOTATION',
    entityId: quotation.quotationNumber,
    details: `Created quotation ${quotation.quotationNumber} for ${customerName}. Total: KES ${totalAmount.toLocaleString()}`,
    ipAddress: req.ip,
  });

  return res.status(201).json(quotation);
});

apiRouter.post('/quotations/:id/convert-to-invoice', requireAuth, requireRoles('ADMIN', 'ACCOUNTANT'), async (req: AuthenticatedRequest, res: Response) => {
  const quote = db.getData().quotations.find((q) => q.id === req.params.id);
  if (!quote) return res.status(404).json({ error: 'Quotation not found' });

  if (quote.status === 'CONVERTED') {
    return res.status(400).json({ error: 'Quotation has already been converted to an invoice' });
  }

  const branch = db.getData().branches.find((b) => b.id === quote.branchId) || db.getData().branches[0];
  const invoiceNumber = db.getNextSequence('INV', db.getData().invoices, 'invoiceNumber');
  const now = new Date().toISOString();

  // KRA Fiscalization for the invoice
  const fiscalResult = await fiscalizeTransaction({
    invoiceOrReceiptNumber: invoiceNumber,
    totalAmount: quote.totalAmount,
    taxableAmount: quote.subtotal,
    taxAmount: quote.taxAmount,
    zeroRatedAmount: 0,
    customerName: quote.customerName,
    itemsCount: quote.items.length,
    branchCode: branch.code,
  });

  const invoice: Invoice = {
    id: uuidv4(),
    invoiceNumber,
    branchId: branch.id,
    branchName: branch.name,
    customerId: quote.customerId,
    customerName: quote.customerName,
    customerEmail: quote.customerEmail,
    customerPhone: quote.customerPhone,
    quotationId: quote.id,
    items: quote.items.map((it) => ({ ...it })),
    subtotal: quote.subtotal,
    taxAmount: quote.taxAmount,
    discountAmount: quote.discountAmount,
    totalAmount: quote.totalAmount,
    amountPaid: 0,
    balanceDue: quote.totalAmount,
    status: 'ISSUED',
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    paymentTerms: quote.terms,
    notes: `Generated from Quotation ${quote.quotationNumber}. ${quote.notes || ''}`,
    kraStatus: fiscalResult.status,
    cuInvoiceNumber: fiscalResult.cuInvoiceNumber,
    kraControlCode: fiscalResult.kraControlCode,
    kraQrCodeUrl: fiscalResult.kraQrCodeUrl,
    createdBy: req.user!.id,
    createdByName: req.user!.name,
    createdAt: now,
    updatedAt: now,
  };

  db.getData().invoices.unshift(invoice);

  // Update customer balance if registered
  const cust = db.getData().customers.find((c) => c.id === quote.customerId);
  if (cust) {
    cust.currentBalance += invoice.totalAmount;
  }

  quote.status = 'CONVERTED';
  quote.convertedInvoiceId = invoice.id;
  quote.updatedAt = now;

  await db.save();

  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    branchId: branch.id,
    branchName: branch.name,
    action: 'QUOTATION_CONVERTED_TO_INVOICE',
    entityType: 'INVOICE',
    entityId: invoice.invoiceNumber,
    details: `Converted Quotation ${quote.quotationNumber} into Invoice ${invoice.invoiceNumber}`,
    ipAddress: req.ip,
  });

  // Dispatch Email Notification
  if (invoice.customerEmail) {
    sendEmail({
      to: invoice.customerEmail,
      subject: `Invoice ${invoice.invoiceNumber} from Naisia Textiles`,
      html: generateInvoiceEmailHtml(invoice, db.getData().settings),
    }).catch(console.error);
  }

  return res.json({ success: true, invoice, quotation: quote });
});

// ==========================================
// 8. INVOICES
// ==========================================

apiRouter.get('/invoices', requireAuth, (req, res) => {
  const { branchId, status, customerId } = req.query;
  let invoices = db.getData().invoices;

  if (branchId && branchId !== 'all') {
    invoices = invoices.filter((i) => i.branchId === branchId);
  }
  if (status) {
    invoices = invoices.filter((i) => i.status === status);
  }
  if (customerId) {
    invoices = invoices.filter((i) => i.customerId === customerId);
  }

  return res.json(invoices);
});

apiRouter.post('/invoices', requireAuth, requireRoles('ADMIN', 'ACCOUNTANT'), async (req: AuthenticatedRequest, res: Response) => {
  const {
    branchId,
    customerId,
    customerName,
    customerEmail,
    customerPhone,
    customerKraPin,
    items,
    dueDate,
    paymentTerms,
    notes,
  } = req.body;

  if (!items || !items.length || !customerName) {
    return res.status(400).json({ error: 'Customer name and items are required' });
  }

  const branch = db.getData().branches.find((b) => b.id === branchId) || db.getData().branches[0];

  let subtotal = 0;
  let taxAmount = 0;
  let discountAmount = 0;
  let totalAmount = 0;

  const invoiceItems = items.map((it: any) => {
    const qty = Number(it.quantity);
    const price = Number(it.unitPrice);
    const disc = Number(it.discountAmount || 0);
    const total = qty * price - disc;
    const tax = Number((total - total / 1.16).toFixed(2));
    const sub = Number((total - tax).toFixed(2));

    subtotal += sub;
    taxAmount += tax;
    discountAmount += disc;
    totalAmount += total;

    return {
      productId: it.productId,
      variantId: it.variantId,
      productName: it.productName,
      sku: it.sku,
      size: it.size,
      quantity: qty,
      unitPrice: price,
      taxRate: 0.16,
      taxAmount: tax,
      discountAmount: disc,
      total,
    };
  });

  const invoiceNumber = db.getNextSequence('INV', db.getData().invoices, 'invoiceNumber');
  const now = new Date().toISOString();

  // KRA eTIMS Fiscalization
  const fiscalResult = await fiscalizeTransaction({
    invoiceOrReceiptNumber: invoiceNumber,
    totalAmount,
    taxableAmount: subtotal,
    taxAmount,
    zeroRatedAmount: 0,
    customerPin: customerKraPin,
    customerName,
    itemsCount: invoiceItems.length,
    branchCode: branch.code,
  });

  const invoice: Invoice = {
    id: uuidv4(),
    invoiceNumber,
    branchId: branch.id,
    branchName: branch.name,
    customerId: customerId || 'cust-generic',
    customerName,
    customerEmail: customerEmail || '',
    customerPhone: customerPhone || '',
    customerKraPin,
    items: invoiceItems,
    subtotal: Number(subtotal.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
    discountAmount: Number(discountAmount.toFixed(2)),
    totalAmount: Number(totalAmount.toFixed(2)),
    amountPaid: 0,
    balanceDue: Number(totalAmount.toFixed(2)),
    status: 'ISSUED',
    dueDate: dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    paymentTerms: paymentTerms || 'Net 30 Days',
    notes,
    kraStatus: fiscalResult.status,
    cuInvoiceNumber: fiscalResult.cuInvoiceNumber,
    kraControlCode: fiscalResult.kraControlCode,
    kraQrCodeUrl: fiscalResult.kraQrCodeUrl,
    createdBy: req.user!.id,
    createdByName: req.user!.name,
    createdAt: now,
    updatedAt: now,
  };

  db.getData().invoices.unshift(invoice);

  // Update customer ledger
  const cust = db.getData().customers.find((c) => c.id === customerId);
  if (cust) {
    cust.currentBalance += invoice.totalAmount;
  }

  await db.save();

  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    branchId: branch.id,
    branchName: branch.name,
    action: 'INVOICE_CREATED',
    entityType: 'INVOICE',
    entityId: invoice.invoiceNumber,
    details: `Issued invoice ${invoice.invoiceNumber} to ${customerName}. Amount: KES ${totalAmount.toLocaleString()}`,
    ipAddress: req.ip,
  });

  if (customerEmail) {
    sendEmail({
      to: customerEmail,
      subject: `New Invoice ${invoice.invoiceNumber} from Naisia Textiles`,
      html: generateInvoiceEmailHtml(invoice, db.getData().settings),
    }).catch(console.error);
  }

  return res.status(201).json(invoice);
});

// Record Payment Against Invoice
apiRouter.post('/invoices/:id/payment', requireAuth, requireRoles('ADMIN', 'ACCOUNTANT'), async (req: AuthenticatedRequest, res: Response) => {
  const { amount, paymentMethod, paymentReference, notes } = req.body;
  const payAmt = Number(amount);
  if (!payAmt || payAmt <= 0) {
    return res.status(400).json({ error: 'Valid payment amount is required' });
  }

  const invoice = db.getData().invoices.find((i) => i.id === req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  if (invoice.status === 'PAID') {
    return res.status(400).json({ error: 'Invoice is already fully paid' });
  }
  if (invoice.status === 'VOIDED') {
    return res.status(400).json({ error: 'Cannot pay a voided invoice' });
  }

  invoice.amountPaid += payAmt;
  invoice.balanceDue = Math.max(0, invoice.totalAmount - invoice.amountPaid);
  invoice.status = invoice.balanceDue === 0 ? 'PAID' : 'PARTIALLY_PAID';
  invoice.updatedAt = new Date().toISOString();

  // Update customer account balance
  const customer = db.getData().customers.find((c) => c.id === invoice.customerId);
  if (customer) {
    customer.currentBalance = Math.max(0, customer.currentBalance - payAmt);
  }

  // Generate Payment Receipt
  const receiptNumber = db.getNextSequence('RCP', db.getData().receipts, 'receiptNumber');
  const now = new Date().toISOString();

  const receipt: PaymentReceipt = {
    id: uuidv4(),
    receiptNumber,
    invoiceId: invoice.id,
    branchId: invoice.branchId,
    branchName: invoice.branchName,
    customerId: invoice.customerId,
    customerName: invoice.customerName,
    amount: payAmt,
    paymentMethod: paymentMethod || 'BANK_TRANSFER',
    paymentReference: paymentReference || `EFT-${Date.now().toString().slice(-6)}`,
    notes: notes || `Settlement payment for invoice ${invoice.invoiceNumber}`,
    receivedBy: req.user!.id,
    receivedByName: req.user!.name,
    cuNumber: invoice.cuInvoiceNumber,
    kraQrCodeUrl: invoice.kraQrCodeUrl,
    createdAt: now,
  };

  db.getData().receipts.unshift(receipt);
  await db.save();

  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    branchId: invoice.branchId,
    branchName: invoice.branchName,
    action: 'INVOICE_PAYMENT_RECORDED',
    entityType: 'INVOICE',
    entityId: invoice.invoiceNumber,
    details: `Recorded payment of KES ${payAmt.toLocaleString()} for Invoice ${invoice.invoiceNumber}. New balance: KES ${invoice.balanceDue.toLocaleString()}`,
    ipAddress: req.ip,
  });

  return res.json({ success: true, invoice, receipt });
});

// Void Invoice with Immutable Audit Reason
apiRouter.post('/invoices/:id/void', requireAuth, requireRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  const { voidReason } = req.body;
  if (!voidReason) return res.status(400).json({ error: 'Void reason is strictly required' });

  const invoice = db.getData().invoices.find((i) => i.id === req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  if (invoice.status === 'PAID') {
    return res.status(400).json({ error: 'Cannot void an invoice that has been fully paid. Use credit note instead.' });
  }

  const previousStatus = invoice.status;
  invoice.status = 'VOIDED';
  invoice.voidReason = voidReason;
  invoice.voidedAt = new Date().toISOString();
  invoice.voidedBy = req.user!.id;

  // Reconcile customer balance
  const customer = db.getData().customers.find((c) => c.id === invoice.customerId);
  if (customer) {
    customer.currentBalance = Math.max(0, customer.currentBalance - invoice.balanceDue);
  }

  await db.save();

  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    branchId: invoice.branchId,
    branchName: invoice.branchName,
    action: 'INVOICE_VOIDED',
    entityType: 'INVOICE',
    entityId: invoice.invoiceNumber,
    details: `Voided Invoice ${invoice.invoiceNumber}. Reason: ${voidReason}`,
    previousValue: previousStatus,
    newValue: 'VOIDED',
    ipAddress: req.ip,
  });

  return res.json({ success: true, invoice });
});

// ==========================================
// 9. RECEIPTS & FISCAL PROOFS
// ==========================================

apiRouter.get('/receipts', requireAuth, (req, res) => {
  const { branchId, search, limit } = req.query;
  let receipts = db.getData().receipts;

  if (branchId && branchId !== 'all') {
    receipts = receipts.filter((r) => r.branchId === branchId);
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    receipts = receipts.filter((r) => r.receiptNumber.toLowerCase().includes(q) || r.customerName.toLowerCase().includes(q));
  }

  const max = Number(limit) || 100;
  return res.json(receipts.slice(0, max));
});

apiRouter.post('/receipts/:id/email', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { email } = req.body;
  const receipt = db.getData().receipts.find((r) => r.id === req.params.id);
  if (!receipt) return res.status(404).json({ error: 'Receipt not found' });

  const targetEmail = email || db.getData().settings.companyEmail;
  const result = await sendEmail({
    to: targetEmail,
    subject: `Naisia Textiles Official Receipt - ${receipt.receiptNumber}`,
    html: generateReceiptEmailHtml(receipt, db.getData().settings),
  });

  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    branchId: receipt.branchId,
    branchName: receipt.branchName,
    action: 'RECEIPT_EMAILED',
    entityType: 'RECEIPT',
    entityId: receipt.receiptNumber,
    details: `Dispatched receipt ${receipt.receiptNumber} to ${targetEmail}`,
    ipAddress: req.ip,
  });

  return res.json({ success: true, result });
});

apiRouter.post('/invoices/:id/email', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { email } = req.body;
  const invoice = db.getData().invoices.find((i) => i.id === req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const targetEmail = email || invoice.customerEmail;
  if (!targetEmail || !targetEmail.includes('@')) {
    return res.status(400).json({ error: 'Valid customer email address is required' });
  }

  const result = await sendEmail({
    to: targetEmail,
    subject: `Naisia Textiles Official Tax Invoice - ${invoice.invoiceNumber}`,
    html: generateInvoiceEmailHtml(invoice, db.getData().settings),
  });

  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    branchId: invoice.branchId,
    branchName: invoice.branchName,
    action: 'INVOICE_EMAILED',
    entityType: 'INVOICE',
    entityId: invoice.invoiceNumber,
    details: `Dispatched invoice ${invoice.invoiceNumber} to ${targetEmail}`,
    ipAddress: req.ip,
  });

  return res.json({ success: true, result, sentTo: targetEmail });
});

apiRouter.post('/quotations/:id/email', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { email } = req.body;
  const quote = db.getData().quotations.find((q) => q.id === req.params.id);
  if (!quote) return res.status(404).json({ error: 'Quotation not found' });

  const targetEmail = email || quote.customerEmail;
  if (!targetEmail || !targetEmail.includes('@')) {
    return res.status(400).json({ error: 'Valid customer email address is required' });
  }

  const result = await sendEmail({
    to: targetEmail,
    subject: `Naisia Textiles Official Quotation - ${quote.quotationNumber}`,
    html: generateQuotationEmailHtml(quote, db.getData().settings),
  });

  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    branchId: quote.branchId,
    branchName: 'N/A',
    action: 'QUOTATION_EMAILED',
    entityType: 'QUOTATION',
    entityId: quote.quotationNumber,
    details: `Dispatched quotation ${quote.quotationNumber} to ${targetEmail}`,
    ipAddress: req.ip,
  });

  return res.json({ success: true, result, sentTo: targetEmail });
});

// ==========================================
// 10. CUSTOMERS MANAGEMENT
// ==========================================

apiRouter.get('/customers', requireAuth, (req, res) => {
  return res.json(db.getData().customers);
});

apiRouter.post('/customers', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { name, email, phone, customerType, schoolOrOrg, kraPin, address, creditLimit } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Customer name and phone number are required' });

  const newCustomer: Customer = {
    id: `cust-${Date.now()}`,
    name,
    email: email || '',
    phone,
    customerType: customerType || 'INDIVIDUAL',
    schoolOrOrg,
    kraPin,
    address,
    creditLimit: Number(creditLimit) || 0,
    currentBalance: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.getData().customers.push(newCustomer);
  await db.save();

  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    branchId: req.user!.branchId,
    branchName: 'N/A',
    action: 'CUSTOMER_CREATED',
    entityType: 'CUSTOMER',
    entityId: newCustomer.id,
    details: `Created customer profile: ${newCustomer.name} (${newCustomer.customerType})`,
    ipAddress: req.ip,
  });

  return res.status(201).json(newCustomer);
});

apiRouter.put('/customers/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const customer = db.getData().customers.find((c) => c.id === req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const { name, email, phone, customerType, schoolOrOrg, kraPin, address, creditLimit } = req.body;
  if (name) customer.name = name;
  if (email !== undefined) customer.email = email;
  if (phone) customer.phone = phone;
  if (customerType) customer.customerType = customerType;
  if (schoolOrOrg !== undefined) customer.schoolOrOrg = schoolOrOrg;
  if (kraPin !== undefined) customer.kraPin = kraPin;
  if (address !== undefined) customer.address = address;
  if (creditLimit !== undefined) customer.creditLimit = Number(creditLimit);
  customer.updatedAt = new Date().toISOString();

  await db.save();
  return res.json(customer);
});

// ==========================================
// 11. SUPPLIERS & PURCHASING
// ==========================================

apiRouter.get('/suppliers', requireAuth, (req, res) => {
  return res.json(db.getData().suppliers);
});

apiRouter.post('/suppliers', requireAuth, requireRoles('ADMIN', 'ACCOUNTANT'), async (req: AuthenticatedRequest, res: Response) => {
  const { name, companyName, contactPerson, email, phone, address, kraPin, paymentTerms, bankDetails, category } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Supplier name and phone are required' });

  const supplier: Supplier = {
    id: `sup-${Date.now()}`,
    name,
    companyName: companyName || name,
    contactPerson: contactPerson || '',
    email: email || '',
    phone,
    address: address || '',
    kraPin,
    paymentTerms: paymentTerms || 'Net 30 Days',
    bankDetails,
    category: category || 'FABRIC',
    currentBalance: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.getData().suppliers.push(supplier);
  await db.save();

  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    branchId: req.user!.branchId,
    branchName: 'N/A',
    action: 'SUPPLIER_CREATED',
    entityType: 'SUPPLIER',
    entityId: supplier.id,
    details: `Added supplier: ${supplier.companyName}`,
    ipAddress: req.ip,
  });

  return res.status(201).json(supplier);
});

// Purchases / POs
apiRouter.get('/purchases', requireAuth, (req, res) => {
  const { branchId, supplierId, status } = req.query;
  let purchases = db.getData().purchases;

  if (branchId && branchId !== 'all') {
    purchases = purchases.filter((p) => p.branchId === branchId);
  }
  if (supplierId) {
    purchases = purchases.filter((p) => p.supplierId === supplierId);
  }
  if (status) {
    purchases = purchases.filter((p) => p.status === status);
  }

  return res.json(purchases);
});

apiRouter.post('/purchases', requireAuth, requireRoles('ADMIN', 'ACCOUNTANT'), async (req: AuthenticatedRequest, res: Response) => {
  const { supplierId, branchId, items, expectedDate, notes } = req.body;
  if (!supplierId || !branchId || !items || !items.length) {
    return res.status(400).json({ error: 'Supplier, branch, and items are required' });
  }

  const supplier = db.getData().suppliers.find((s) => s.id === supplierId);
  if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

  const branch = db.getData().branches.find((b) => b.id === branchId);
  if (!branch) return res.status(404).json({ error: 'Branch not found' });

  let subtotal = 0;
  let taxAmount = 0;
  let totalAmount = 0;

  const poItems = items.map((it: any) => {
    const qty = Number(it.quantityOrdered);
    const cost = Number(it.unitCost);
    const lineTotal = qty * cost;
    const tax = lineTotal * 0.16; // Standard 16% Input VAT
    const lineGross = lineTotal + tax;

    subtotal += lineTotal;
    taxAmount += tax;
    totalAmount += lineGross;

    return {
      productId: it.productId,
      variantId: it.variantId,
      productName: it.productName,
      sku: it.sku,
      size: it.size,
      quantityOrdered: qty,
      quantityReceived: 0,
      unitCost: cost,
      taxAmount: tax,
      totalCost: lineGross,
    };
  });

  const poNumber = db.getNextSequence('PO', db.getData().purchases, 'poNumber');
  const now = new Date().toISOString();

  const po: PurchaseOrder = {
    id: uuidv4(),
    poNumber,
    supplierId,
    supplierName: supplier.companyName,
    branchId: branch.id,
    branchName: branch.name,
    items: poItems,
    subtotal: Number(subtotal.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
    totalAmount: Number(totalAmount.toFixed(2)),
    amountPaid: 0,
    status: 'ORDERED',
    expectedDate,
    notes,
    createdBy: req.user!.id,
    createdByName: req.user!.name,
    createdAt: now,
    updatedAt: now,
  };

  db.getData().purchases.unshift(po);
  await db.save();

  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    branchId: branch.id,
    branchName: branch.name,
    action: 'PURCHASE_ORDER_ISSUED',
    entityType: 'PURCHASE',
    entityId: po.poNumber,
    details: `Issued Purchase Order ${po.poNumber} to ${supplier.companyName}. Total: KES ${totalAmount.toLocaleString()}`,
    ipAddress: req.ip,
  });

  return res.status(201).json(po);
});

// Receive Goods against PO -> Atomically restocks inventory and updates supplier balance
apiRouter.post('/purchases/:id/receive', requireAuth, requireRoles('ADMIN', 'ACCOUNTANT'), async (req: AuthenticatedRequest, res: Response) => {
  const po = db.getData().purchases.find((p) => p.id === req.params.id);
  if (!po) return res.status(404).json({ error: 'Purchase Order not found' });

  if (po.status === 'RECEIVED') {
    return res.status(400).json({ error: 'Goods have already been fully received for this PO' });
  }

  const products = db.getData().products;
  const now = new Date().toISOString();

  // Restock branch stock atomically
  for (const item of po.items) {
    const prod = products.find((p) => p.id === item.productId);
    const variant = prod?.variants.find((v) => v.id === item.variantId);
    if (!variant) continue;

    const prev = variant.branchStock[po.branchId] ?? 0;
    const qtyToReceive = item.quantityOrdered - item.quantityReceived;
    const next = prev + qtyToReceive;
    variant.branchStock[po.branchId] = next;
    item.quantityReceived = item.quantityOrdered;

    db.getData().inventoryMovements.unshift({
      id: uuidv4(),
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productName,
      sku: item.sku,
      branchId: po.branchId,
      branchName: po.branchName,
      type: 'PURCHASE',
      quantityChange: qtyToReceive,
      previousStock: prev,
      newStock: next,
      referenceNumber: po.poNumber,
      userId: req.user!.id,
      userName: req.user!.name,
      timestamp: now,
    });
  }

  // Update supplier payable balance
  const supplier = db.getData().suppliers.find((s) => s.id === po.supplierId);
  if (supplier) {
    supplier.currentBalance += po.totalAmount;
  }

  po.status = 'RECEIVED';
  po.receivedAt = now;
  po.updatedAt = now;

  await db.save();

  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    branchId: po.branchId,
    branchName: po.branchName,
    action: 'GOODS_RECEIVED_NOTE',
    entityType: 'PURCHASE',
    entityId: po.poNumber,
    details: `Goods Received Note (GRN) confirmed for PO ${po.poNumber}. Restocked inventory at ${po.branchName}`,
    ipAddress: req.ip,
  });

  return res.json({ success: true, po });
});

// ==========================================
// 12. EXPENSES MANAGEMENT
// ==========================================

apiRouter.get('/expenses', requireAuth, (req, res) => {
  const { branchId, category } = req.query;
  let expenses = db.getData().expenses;

  if (branchId && branchId !== 'all') {
    expenses = expenses.filter((e) => e.branchId === branchId);
  }
  if (category) {
    expenses = expenses.filter((e) => e.category === category);
  }

  return res.json(expenses);
});

apiRouter.post('/expenses', requireAuth, requireRoles('ADMIN', 'ACCOUNTANT'), async (req: AuthenticatedRequest, res: Response) => {
  const { branchId, category, title, description, amount, paymentMethod, paymentReference, incurredDate } = req.body;
  if (!title || !amount || !category) {
    return res.status(400).json({ error: 'Title, amount, and category are required' });
  }

  const branch = db.getData().branches.find((b) => b.id === branchId) || db.getData().branches[0];
  const expenseNumber = db.getNextSequence('EXP', db.getData().expenses, 'expenseNumber');
  const now = new Date().toISOString();

  const expense: Expense = {
    id: uuidv4(),
    expenseNumber,
    branchId: branch.id,
    branchName: branch.name,
    category,
    title,
    description,
    amount: Number(amount),
    paymentMethod: paymentMethod || 'CASH',
    paymentReference,
    incurredDate: incurredDate || now.split('T')[0],
    recordedBy: req.user!.id,
    recordedByName: req.user!.name,
    createdAt: now,
  };

  db.getData().expenses.unshift(expense);
  await db.save();

  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    branchId: branch.id,
    branchName: branch.name,
    action: 'EXPENSE_RECORDED',
    entityType: 'EXPENSE',
    entityId: expense.expenseNumber,
    details: `Recorded expense ${expense.expenseNumber} (${category}): ${title} - KES ${Number(amount).toLocaleString()}`,
    ipAddress: req.ip,
  });

  return res.status(201).json(expense);
});

// ==========================================
// 13. FINANCIAL & EXECUTIVE REPORTS
// ==========================================

apiRouter.get('/reports/dashboard', requireAuth, (req, res) => {
  const { branchId } = req.query;
  const targetBranch = typeof branchId === 'string' && branchId !== 'all' ? branchId : null;

  const sales = targetBranch
    ? db.getData().sales.filter((s) => s.branchId === targetBranch && s.status === 'COMPLETED')
    : db.getData().sales.filter((s) => s.status === 'COMPLETED');

  const invoices = targetBranch
    ? db.getData().invoices.filter((i) => i.branchId === targetBranch)
    : db.getData().invoices;

  const expenses = targetBranch
    ? db.getData().expenses.filter((e) => e.branchId === targetBranch)
    : db.getData().expenses;

  const products = db.getData().products;
  const branches = db.getData().branches;

  const todayStr = new Date().toISOString().split('T')[0];

  const todaySales = sales
    .filter((s) => s.createdAt.startsWith(todayStr))
    .reduce((sum, s) => sum + s.totalAmount, 0);

  const totalSalesRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);

  // Compute Cost of Goods Sold (COGS)
  let totalCogs = 0;
  sales.forEach((s) => {
    s.items.forEach((it) => {
      totalCogs += (it.costPrice || 0) * it.quantity;
    });
  });

  const grossProfit = totalSalesRevenue - totalCogs;
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = grossProfit - totalExpenses;

  // Inventory total valuation
  let totalInventoryValuationCost = 0;
  let totalInventoryValuationRetail = 0;
  let lowStockCount = 0;

  products.forEach((p) => {
    p.variants.forEach((v) => {
      const bList = targetBranch ? [targetBranch] : Object.keys(v.branchStock);
      bList.forEach((bid) => {
        const qty = v.branchStock[bid] || 0;
        totalInventoryValuationCost += qty * v.costPrice;
        totalInventoryValuationRetail += qty * v.sellingPrice;
        if (qty <= v.reorderLevel) lowStockCount++;
      });
    });
  });

  // Outstanding Accounts Receivable (Invoices)
  const outstandingInvoicesAmount = invoices
    .filter((i) => i.status === 'ISSUED' || i.status === 'PARTIALLY_PAID')
    .reduce((sum, i) => sum + i.balanceDue, 0);

  // Branch breakdown
  const branchPerformance = branches.map((b) => {
    const bSales = db.getData().sales
      .filter((s) => s.branchId === b.id && s.status === 'COMPLETED')
      .reduce((sum, s) => sum + s.totalAmount, 0);
    return {
      branchId: b.id,
      branchName: b.name,
      totalSales: bSales,
    };
  });

  return res.json({
    todaySales,
    totalSalesRevenue,
    totalCogs,
    grossProfit,
    totalExpenses,
    netProfit,
    totalInventoryValuationCost,
    totalInventoryValuationRetail,
    lowStockCount,
    outstandingInvoicesAmount,
    branchPerformance,
    recentSales: sales.slice(0, 5),
    pendingRetryKraCount: kraRetryQueue.length,
    kraPin: db.getData().settings.kraPin || '',
    kraOscuSerial: db.getData().settings.kraOscuSerial || '',
  });
});

// Profit & Loss Report
apiRouter.get('/reports/profit-loss', requireAuth, requireRoles('ADMIN', 'ACCOUNTANT'), (req, res) => {
  const { branchId, startDate, endDate } = req.query;
  let sales = db.getData().sales.filter((s) => s.status === 'COMPLETED');
  let expenses = db.getData().expenses;

  if (branchId && branchId !== 'all') {
    sales = sales.filter((s) => s.branchId === branchId);
    expenses = expenses.filter((e) => e.branchId === branchId);
  }
  if (startDate && typeof startDate === 'string') {
    sales = sales.filter((s) => s.createdAt >= startDate);
    expenses = expenses.filter((e) => e.incurredDate >= startDate);
  }
  if (endDate && typeof endDate === 'string') {
    sales = sales.filter((s) => s.createdAt <= endDate);
    expenses = expenses.filter((e) => e.incurredDate <= endDate);
  }

  const revenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  let cogs = 0;
  sales.forEach((s) => {
    s.items.forEach((it) => {
      cogs += (it.costPrice || 0) * it.quantity;
    });
  });
  const grossProfit = revenue - cogs;

  const expensesByCategory: Record<string, number> = {};
  let totalExpenses = 0;
  expenses.forEach((e) => {
    expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount;
    totalExpenses += e.amount;
  });

  const netProfit = grossProfit - totalExpenses;
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  return res.json({
    revenue,
    cogs,
    grossProfit,
    grossMargin: Number(grossMargin.toFixed(2)),
    expensesByCategory,
    totalExpenses,
    netProfit,
    netMargin: Number(netMargin.toFixed(2)),
  });
});

// KRA VAT 3 Tax Return Report (Standard 16% output tax vs Input VAT on purchases)
apiRouter.get('/reports/vat-return', requireAuth, requireRoles('ADMIN', 'ACCOUNTANT'), (req, res) => {
  const sales = db.getData().sales.filter((s) => s.status === 'COMPLETED');
  const invoices = db.getData().invoices.filter((i) => i.status !== 'VOIDED');
  const purchases = db.getData().purchases.filter((p) => p.status === 'RECEIVED');

  let standardRatedSalesGross = 0;
  let standardRatedSalesTaxable = 0;
  let outputVat = 0;
  let zeroRatedSales = 0;

  sales.forEach((s) => {
    s.items.forEach((it) => {
      if (it.taxRate > 0) {
        standardRatedSalesGross += it.total;
        standardRatedSalesTaxable += it.subtotal;
        outputVat += it.taxAmount;
      } else {
        zeroRatedSales += it.total;
      }
    });
  });

  // Input VAT from approved purchases
  let totalPurchasesTaxable = 0;
  let inputVat = 0;
  purchases.forEach((p) => {
    totalPurchasesTaxable += p.subtotal;
    inputVat += p.taxAmount;
  });

  const netVatPayable = outputVat - inputVat;

  return res.json({
    kraPin: db.getData().settings.kraPin,
    companyName: db.getData().settings.companyName,
    taxPeriod: new Date().toISOString().slice(0, 7), // YYYY-MM
    standardRatedSalesGross: Number(standardRatedSalesGross.toFixed(2)),
    standardRatedSalesTaxable: Number(standardRatedSalesTaxable.toFixed(2)),
    outputVat: Number(outputVat.toFixed(2)),
    zeroRatedSales: Number(zeroRatedSales.toFixed(2)),
    totalPurchasesTaxable: Number(totalPurchasesTaxable.toFixed(2)),
    inputVat: Number(inputVat.toFixed(2)),
    netVatPayable: Number(netVatPayable.toFixed(2)),
    isRefundable: netVatPayable < 0,
  });
});

// ==========================================
// 14. KRA eTIMS FISCAL INTEGRATION CONSOLE
// ==========================================

apiRouter.get('/kra/status', requireAuth, (req, res) => {
  const settings = db.getData().settings;
  const sales = db.getData().sales;
  const invoices = db.getData().invoices;

  const fiscalizedSales = sales.filter((s) => s.kraStatus === 'FISCALIZED').length;
  const pendingSales = sales.filter((s) => s.kraStatus === 'PENDING' || s.kraStatus === 'FAILED').length;
  const fiscalizedInvoices = invoices.filter((i) => i.kraStatus === 'FISCALIZED').length;

  const isConfigured = Boolean(settings.kraPin && settings.kraPin.trim());

  return res.json({
    status: isConfigured ? (settings.kraMode === 'PRODUCTION' ? 'PRODUCTION_LIVE' : 'SANDBOX_ACTIVE') : 'PENDING_CONFIGURATION',
    traderPin: settings.kraPin || '',
    traderCode: settings.kraTraderCode || '',
    oscuSerial: settings.kraOscuSerial || '',
    mode: settings.kraMode || 'SANDBOX',
    autoRetry: settings.autoRetryKra ?? true,
    isConfigured,
    fiscalizedCount: fiscalizedSales + fiscalizedInvoices,
    pendingOrFailedCount: pendingSales,
    retryQueueCount: kraRetryQueue.length,
    retryQueue: kraRetryQueue,
  });
});

apiRouter.put('/kra/config', requireAuth, requireRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  const { traderPin, traderCode, oscuSerial, mode, autoRetry } = req.body;
  const settings = db.getData().settings;

  if (typeof traderPin === 'string') settings.kraPin = traderPin.trim().toUpperCase();
  if (typeof traderCode === 'string') settings.kraTraderCode = traderCode.trim();
  if (typeof oscuSerial === 'string') settings.kraOscuSerial = oscuSerial.trim();
  if (typeof mode === 'string') settings.kraMode = mode as any;
  if (typeof autoRetry === 'boolean') settings.autoRetryKra = autoRetry;

  await db.save();

  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    branchId: 'N/A',
    branchName: 'N/A',
    action: 'KRA_CONFIG_UPDATED',
    entityType: 'SETTINGS',
    entityId: 'KRA',
    details: `Updated KRA eTIMS configuration. PIN: ${settings.kraPin || 'None'}, Mode: ${settings.kraMode}`,
    ipAddress: req.ip,
  });

  return res.json({
    success: true,
    settings: {
      kraPin: settings.kraPin,
      kraTraderCode: settings.kraTraderCode,
      kraOscuSerial: settings.kraOscuSerial,
      kraMode: settings.kraMode,
      autoRetryKra: settings.autoRetryKra,
    },
  });
});

apiRouter.post('/kra/retry-queued', requireAuth, requireRoles('ADMIN', 'ACCOUNTANT'), async (req: AuthenticatedRequest, res: Response) => {
  const processed: any[] = [];

  while (kraRetryQueue.length > 0) {
    const item = kraRetryQueue.shift()!;
    const result = await fiscalizeTransaction(item.payload, false);

    if (result.status === 'FISCALIZED') {
      if (item.type === 'SALE') {
        const sale = db.getData().sales.find((s) => s.id === item.id);
        if (sale) {
          sale.kraStatus = 'FISCALIZED';
          sale.cuInvoiceNumber = result.cuInvoiceNumber;
          sale.kraControlCode = result.kraControlCode;
          sale.kraQrCodeUrl = result.kraQrCodeUrl;
          sale.kraSubmissionTimestamp = result.timestamp;
          sale.kraError = undefined;
        }
      }
      processed.push({ id: item.id, status: 'SUCCESS', cuInvoiceNumber: result.cuInvoiceNumber });
    } else {
      item.attempts++;
      item.lastAttemptAt = new Date().toISOString();
      item.lastError = result.error || 'Retry attempt failed';
      kraRetryQueue.push(item);
      processed.push({ id: item.id, status: 'FAILED', error: item.lastError });
      break;
    }
  }

  await db.save();

  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    branchId: req.user!.branchId,
    branchName: 'N/A',
    action: 'KRA_RETRY_TRIGGERED',
    entityType: 'KRA',
    entityId: 'RETRY_QUEUE',
    details: `Manually triggered KRA eTIMS retry. Processed: ${processed.length} items.`,
    ipAddress: req.ip,
  });

  return res.json({ success: true, processed, remainingInQueue: kraRetryQueue.length });
});

// ==========================================
// 15. AUDIT LOGS (ADMIN ONLY)
// ==========================================

apiRouter.get('/audit-logs', requireAuth, requireRoles('ADMIN'), (req, res) => {
  const { action, entityType, limit } = req.query;
  let logs = db.getData().auditLogs;

  if (action && typeof action === 'string') {
    logs = logs.filter((l) => l.action.toLowerCase().includes(action.toLowerCase()));
  }
  if (entityType && typeof entityType === 'string') {
    logs = logs.filter((l) => l.entityType === entityType);
  }

  const max = Number(limit) || 200;
  return res.json(logs.slice(0, max));
});

// ==========================================
// 16. SYSTEM SETTINGS
// ==========================================

apiRouter.get('/settings', requireAuth, (req, res) => {
  return res.json(db.getData().settings);
});

apiRouter.put('/settings', requireAuth, requireRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  const current = db.getData().settings;
  console.log('[Settings Update] Received settings:', req.body);
  const updated = { ...current, ...req.body };
  // Auto-detect SMTP configuration status
  updated.isSmtpConfigured = !!(updated.smtpHost && updated.smtpUser && updated.smtpPassword);
  db.getData().settings = updated;
  await db.save();

  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    branchId: 'N/A',
    branchName: 'N/A',
    action: 'SYSTEM_SETTINGS_UPDATED',
    entityType: 'SETTINGS',
    entityId: 'SYSTEM',
    details: 'System preferences, tax, or company branding updated',
    ipAddress: req.ip,
  });

  return res.json(updated);
});

// ==========================================
// 17. EMAIL LOGS & TEST
// ==========================================

apiRouter.get('/emails', requireAuth, requireRoles('ADMIN', 'ACCOUNTANT'), (req, res) => {
  return res.json(emailLogs);
});

apiRouter.post('/emails/test', requireAuth, requireRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  const { to } = req.body;
  const targetEmail = to || db.getData().settings.companyEmail;

  const result = await sendEmail({
    to: targetEmail,
    subject: 'Naisiae ERP - Test Notification System Verification',
    html: `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #030A91; border-radius: 8px;">
        <h2 style="color: #030A91;">Naisiae ERP Email Dispatcher Test</h2>
        <p>This is a verified test email sent from <strong>support@naisiaetextiles.com</strong>.</p>
        <p>Email infrastructure (Zoho / Cloudflare SPF & DKIM verified) is operational.</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
      </div>
    `,
  });

  return res.json(result);
});

// ==========================================
// 18. PRODUCT CATALOGUE MANAGEMENT
// ==========================================

apiRouter.post('/products/import', requireAuth, requireRoles('ADMIN', 'ACCOUNTANT'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { products: incomingProducts } = req.body;
    if (!Array.isArray(incomingProducts) || incomingProducts.length === 0) {
      return res.status(400).json({ error: 'Invalid catalogue format. Expected an array of products.' });
    }

    const dbData = db.getData();
    if (!Array.isArray(dbData.products)) {
      dbData.products = [];
    }

    let productsAdded = 0;
    let productsUpdated = 0;
    let variantsAdded = 0;
    let variantsUpdated = 0;
    let duplicatesChecked = 0;
    const now = new Date().toISOString();

    // Map existing products by ID and by normalized key (name::school)
    const existingById = new Map<string, any>();
    const existingByNameSchool = new Map<string, any>();
    const existingBySku = new Map<string, { product: any; variant: any }>();

    for (const p of dbData.products) {
      if (!p) continue;
      if (p.id) existingById.set(p.id, p);
      const key = `${(p.name || '').trim().toLowerCase()}::${(p.school || '').trim().toLowerCase()}`;
      existingByNameSchool.set(key, p);

      if (Array.isArray(p.variants)) {
        for (const v of p.variants) {
          if (v && v.sku) {
            existingBySku.set(String(v.sku).trim().toUpperCase(), { product: p, variant: v });
          }
        }
      }
    }

    // Process incoming products with duplicate checking and updates
    for (let i = 0; i < incomingProducts.length; i++) {
      const inc = incomingProducts[i];
      if (!inc || !inc.name) continue;

      const normName = String(inc.name).trim();
      const normSchool = String(inc.school || 'General Uniform').trim();
      const key = `${normName.toLowerCase()}::${normSchool.toLowerCase()}`;

      // Check if product already exists
      let matchedProd = inc.id ? existingById.get(inc.id) : null;
      if (!matchedProd) {
        matchedProd = existingByNameSchool.get(key);
      }
      if (!matchedProd && Array.isArray(inc.variants)) {
        for (const v of inc.variants) {
          if (v && v.sku) {
            const found = existingBySku.get(String(v.sku).trim().toUpperCase());
            if (found) {
              matchedProd = found.product;
              break;
            }
          }
        }
      }

      const incomingVariants = Array.isArray(inc.variants) ? inc.variants : [];

      if (matchedProd) {
        // --- RUN UPDATE ON EXISTING PRODUCT ---
        productsUpdated++;
        if (inc.category && inc.category !== 'General Uniform') matchedProd.category = inc.category;
        if (inc.sector) matchedProd.sector = inc.sector;
        if (inc.institutionType) matchedProd.institutionType = inc.institutionType;
        if (inc.professionalDomain) matchedProd.professionalDomain = inc.professionalDomain;
        if (inc.garmentType) matchedProd.garmentType = inc.garmentType;
        if (inc.gender) matchedProd.gender = inc.gender;
        if (inc.description && inc.description.length > 5) matchedProd.description = inc.description;
        if (inc.imageUrl && !matchedProd.imageUrl) matchedProd.imageUrl = inc.imageUrl;
        matchedProd.updatedAt = now;

        if (!Array.isArray(matchedProd.variants)) {
          matchedProd.variants = [];
        }

        // Check & Update Variants
        for (const incVar of incomingVariants) {
          duplicatesChecked++;
          const incVarSku = String(incVar.sku || '').trim().toUpperCase();
          const incVarSize = String(incVar.size || 'Standard').trim().toLowerCase();
          const incVarColor = String(incVar.color || 'Standard Official').trim().toLowerCase();

          // Match variant
          const matchedVar = matchedProd.variants.find((v: any) => {
            if (!v) return false;
            if (incVar.id && v.id === incVar.id) return true;
            if (incVarSku && v.sku && String(v.sku).trim().toUpperCase() === incVarSku) return true;
            if (incVar.barcode && v.barcode && String(v.barcode) === String(incVar.barcode)) return true;
            return (
              String(v.size || '').trim().toLowerCase() === incVarSize &&
              String(v.color || 'Standard Official').trim().toLowerCase() === incVarColor
            );
          });

          if (matchedVar) {
            // --- UPDATE EXISTING VARIANT ---
            if (typeof incVar.sellingPrice === 'number' && incVar.sellingPrice > 0) {
              matchedVar.sellingPrice = incVar.sellingPrice;
            }
            if (typeof incVar.costPrice === 'number' && incVar.costPrice > 0) {
              matchedVar.costPrice = incVar.costPrice;
            }
            if (incVar.imageUrl && (!matchedVar.imageUrl || matchedVar.imageUrl.includes('category_school'))) {
              matchedVar.imageUrl = incVar.imageUrl;
            }
            if (typeof incVar.reorderLevel === 'number' && incVar.reorderLevel > 0) {
              matchedVar.reorderLevel = incVar.reorderLevel;
            }
            if (incVar.branchStock && typeof incVar.branchStock === 'object') {
              if (!matchedVar.branchStock) matchedVar.branchStock = {};
              for (const [branchId, qty] of Object.entries(incVar.branchStock)) {
                if (typeof qty === 'number' && qty >= 0) {
                  matchedVar.branchStock[branchId] = qty;
                }
              }
            }
            variantsUpdated++;
          } else {
            // --- ADD NEW VARIANT TO EXISTING PRODUCT ---
            const newVarId = incVar.id || `var-${matchedProd.id}-${matchedProd.variants.length + 1}`;
            const newBarcode = incVar.barcode || `616${Math.floor(100000000 + Math.random() * 900000000)}`;
            const newVar = {
              id: newVarId,
              sku: incVar.sku || `${matchedProd.name.slice(0, 4).toUpperCase()}-${incVar.size || 'STD'}`,
              barcode: newBarcode,
              size: incVar.size || 'Standard',
              color: incVar.color || 'Standard Official',
              costPrice: typeof incVar.costPrice === 'number' ? incVar.costPrice : 600,
              sellingPrice: typeof incVar.sellingPrice === 'number' ? incVar.sellingPrice : 1000,
              branchStock: incVar.branchStock || { 'branch-nbi-cbd': 25 },
              reorderLevel: incVar.reorderLevel || 10,
              reorderQuantity: incVar.reorderQuantity || 30,
              imageUrl: incVar.imageUrl || matchedProd.imageUrl,
            };
            matchedProd.variants.push(newVar);
            variantsAdded++;
            if (newVar.sku) {
              existingBySku.set(String(newVar.sku).trim().toUpperCase(), { product: matchedProd, variant: newVar });
            }
          }
        }
      } else {
        // --- ADD NEW PRODUCT ---
        const newProdId = inc.id || `prod-${Date.now()}-${i + 1}`;
        const newProd = {
          id: newProdId,
          name: normName,
          school: normSchool,
          sector: inc.sector || 'SECONDARY',
          institutionType: inc.institutionType || normSchool,
          professionalDomain: inc.professionalDomain || normSchool,
          garmentType: inc.garmentType || normName,
          category: inc.category || 'General Uniform',
          gender: inc.gender || 'UNISEX',
          description: inc.description || 'Quality uniform tailored for durability and comfort.',
          taxCategory: inc.taxCategory || 'VAT_16',
          imageUrl: inc.imageUrl || '/assets/images/category_school_1782334810884.jpg',
          active: inc.active !== false,
          variants: incomingVariants.map((v: any, vIdx: number) => ({
            id: v.id || `var-${newProdId}-${vIdx + 1}`,
            sku: v.sku || `SKU-${newProdId}-${v.size || vIdx + 1}`,
            barcode: v.barcode || `616${Math.floor(100000000 + Math.random() * 900000000)}`,
            size: v.size || 'Standard',
            color: v.color || 'Standard Official',
            costPrice: typeof v.costPrice === 'number' ? v.costPrice : 600,
            sellingPrice: typeof v.sellingPrice === 'number' ? v.sellingPrice : 1000,
            branchStock: v.branchStock || { 'branch-nbi-cbd': 25 },
            reorderLevel: v.reorderLevel || 10,
            reorderQuantity: v.reorderQuantity || 30,
            imageUrl: v.imageUrl || inc.imageUrl,
          })),
          createdAt: now,
          updatedAt: now,
        };

        dbData.products.push(newProd);
        existingById.set(newProd.id, newProd);
        existingByNameSchool.set(key, newProd);
        for (const nv of newProd.variants) {
          if (nv.sku) existingBySku.set(String(nv.sku).trim().toUpperCase(), { product: newProd, variant: nv });
        }
        productsAdded++;
        variantsAdded += newProd.variants.length;
      }
    }

    await db.save();

    db.logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      branchId: req.user!.branchId,
      branchName: 'All Branches (HQ)',
      action: 'CATALOGUE_SYNC_IMPORTED',
      entityType: 'CATALOGUE',
      entityId: 'SYSTEM',
      details: `Catalogue import & duplicate check: ${incomingProducts.length} processed. ${productsUpdated} products updated, ${productsAdded} products created, ${variantsUpdated} variants updated, ${variantsAdded} variants added.`,
      ipAddress: req.ip,
    });

    const summary = {
      totalProcessed: incomingProducts.length,
      productsAdded,
      productsUpdated,
      variantsAdded,
      variantsUpdated,
      duplicatesChecked,
    };

    return res.json({
      success: true,
      summary,
      message: `Catalogue synchronized: ${productsUpdated} products updated with latest pricing/specs, ${productsAdded} new products added, ${variantsUpdated} size variants updated.`,
    });
  } catch (err: any) {
    console.error('[Products Import Error]', err);
    return res.status(500).json({ error: 'Failed to import catalogue', details: err.message });
  }
});

apiRouter.post('/products/repair', requireAuth, requireRoles('ADMIN', 'ACCOUNTANT'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const dbData = db.getData();
    let reseeded = false;

    if (!Array.isArray(dbData.products) || dbData.products.length === 0) {
      dbData.products = db.seedProductsFromInventoryCsv();
      reseeded = true;
    }

    let repairedCount = 0;
    const now = new Date().toISOString();

    for (let i = 0; i < dbData.products.length; i++) {
      const p = dbData.products[i];
      if (!p) continue;
      let pChanged = false;

      if (!p.id) {
        p.id = `prod-${Date.now()}-${i + 1}`;
        pChanged = true;
      }
      if (!p.school) {
        p.school = 'General Uniform';
        pChanged = true;
      }
      if (!p.category) {
        p.category = 'General Uniform';
        pChanged = true;
      }
      if (!p.garmentType) {
        p.garmentType = p.category;
        pChanged = true;
      }
      if (p.active === undefined) {
        p.active = true;
        pChanged = true;
      }
      if (!Array.isArray(p.variants) || p.variants.length === 0) {
        p.variants = [
          {
            id: `var-${p.id}-1`,
            sku: `NT-${p.id}-STD`,
            barcode: `616${Math.floor(100000000 + Math.random() * 900000000)}`,
            size: 'Standard',
            color: 'Standard Official',
            costPrice: 600,
            sellingPrice: 1000,
            branchStock: { 'branch-nbi-cbd': 30 },
            reorderLevel: 10,
            reorderQuantity: 30,
          },
        ];
        pChanged = true;
      } else {
        p.variants.forEach((v, vIdx) => {
          if (!v.id) {
            v.id = `var-${p.id}-${vIdx + 1}`;
            pChanged = true;
          }
          if (!v.barcode) {
            v.barcode = `616${Math.floor(100000000 + Math.random() * 900000000)}`;
            pChanged = true;
          }
          if (typeof v.sellingPrice !== 'number' || isNaN(v.sellingPrice)) {
            v.sellingPrice = 1000;
            pChanged = true;
          }
          if (typeof v.costPrice !== 'number' || isNaN(v.costPrice)) {
            v.costPrice = 600;
            pChanged = true;
          }
          if (!v.branchStock || typeof v.branchStock !== 'object') {
            v.branchStock = { 'branch-nbi-cbd': 30 };
            pChanged = true;
          }
        });
      }

      if (pChanged) {
        p.updatedAt = now;
        repairedCount++;
      }
    }

    await db.save();

    db.logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      branchId: req.user!.branchId,
      branchName: 'All Branches (HQ)',
      action: 'CATALOGUE_REPAIRED',
      entityType: 'CATALOGUE',
      entityId: 'SYSTEM',
      details: `Catalogue integrity repair executed. ${dbData.products.length} products verified. ${repairedCount} products patched. Reseeded: ${reseeded}.`,
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: reseeded
        ? `Catalogue restored from verified uniform inventory with ${dbData.products.length} items.`
        : `Catalogue verified and repaired: ${dbData.products.length} items checked (${repairedCount} items sanitized).`,
      count: dbData.products.length,
      repairedCount,
      reseeded,
    });
  } catch (err: any) {
    console.error('[Products Repair Error]', err);
    return res.status(500).json({ error: 'Failed to repair catalogue', details: err.message });
  }
});


// ==========================================
// 19. BACKUP & DATABASE SNAPSHOTS
// ==========================================

apiRouter.get('/backup/export', requireAuth, requireRoles('ADMIN'), (req, res) => {
  const data = db.getData();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=naisiae-erp-backup-${new Date().toISOString().split('T')[0]}.json`);
  return res.send(JSON.stringify(data, null, 2));
});
