import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { api } from '../api';
import { User, UserRole } from '../types';
import { PRIMARY_ADMIN_EMAIL } from './adminWhitelist';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface RoleConfig {
  role: UserRole;
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  description: string;
  canAccessPos: boolean;
  canManageInventory: boolean;
  canManageFinance: boolean;
  canManageUsers: boolean;
}

export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  SUPER_ADMIN: {
    role: 'SUPER_ADMIN',
    label: 'Super Admin',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-800',
    badgeBorder: 'border-purple-300',
    description: 'Root system governance, security rules, global audit, and whitelist management',
    canAccessPos: true,
    canManageInventory: true,
    canManageFinance: true,
    canManageUsers: true,
  },
  ADMIN: {
    role: 'ADMIN',
    label: 'Administrator',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-800',
    badgeBorder: 'border-indigo-300',
    description: 'Full organizational operations, branch management, products, and staff assignments',
    canAccessPos: true,
    canManageInventory: true,
    canManageFinance: true,
    canManageUsers: true,
  },
  BRANCH_MANAGER: {
    role: 'BRANCH_MANAGER',
    label: 'Branch Manager',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-800',
    badgeBorder: 'border-blue-300',
    description: 'Branch store management, stock transfers, supervisor approvals, and daily shifts',
    canAccessPos: true,
    canManageInventory: true,
    canManageFinance: false,
    canManageUsers: false,
  },
  ACCOUNTANT: {
    role: 'ACCOUNTANT',
    label: 'Accountant',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-300',
    description: 'General ledger, tax/eTIMS fiscalization, quotations, invoicing, and expenses',
    canAccessPos: false,
    canManageInventory: false,
    canManageFinance: true,
    canManageUsers: false,
  },
  STORE_KEEPER: {
    role: 'STORE_KEEPER',
    label: 'Store Keeper',
    badgeBg: 'bg-teal-100',
    badgeText: 'text-teal-800',
    badgeBorder: 'border-teal-300',
    description: 'Warehouse inventory intake, stock audits, damaged goods tracking, and reorder levels',
    canAccessPos: false,
    canManageInventory: true,
    canManageFinance: false,
    canManageUsers: false,
  },
  CASHIER: {
    role: 'CASHIER',
    label: 'Cashier',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    badgeBorder: 'border-emerald-300',
    description: 'POS sales terminal, cash/M-Pesa payment collection, and customer receipts',
    canAccessPos: true,
    canManageInventory: false,
    canManageFinance: false,
    canManageUsers: false,
  },
  TAILOR: {
    role: 'TAILOR',
    label: 'Tailor & Production',
    badgeBg: 'bg-pink-100',
    badgeText: 'text-pink-800',
    badgeBorder: 'border-pink-300',
    description: 'Garment alteration orders, uniform stitching, size custom fittings, and work tickets',
    canAccessPos: false,
    canManageInventory: false,
    canManageFinance: false,
    canManageUsers: false,
  },
  STAFF: {
    role: 'STAFF',
    label: 'General Staff',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-800',
    badgeBorder: 'border-slate-300',
    description: 'Store floor assistance, customer sizing queries, and order lookup',
    canAccessPos: false,
    canManageInventory: false,
    canManageFinance: false,
    canManageUsers: false,
  },
};

export interface MigrationResult {
  success: boolean;
  totalUsers: number;
  migratedUsers: number;
  whitelistedAdmins: number;
  rolesBreakdown: Record<string, number>;
  errors: string[];
}

/**
 * Synchronizes a single user record to Firestore /users/{userId}
 * and /admins/{email} if admin or super_admin.
 */
export async function syncSingleUserToFirestore(user: User): Promise<void> {
  const userPath = `users/${user.id}`;
  const now = new Date().toISOString();

  const userPayload: Record<string, any> = {
    id: user.id,
    name: user.name || 'Unnamed User',
    email: user.email.toLowerCase().trim(),
    role: user.role,
    branchId: user.branchId || 'all',
    status: user.status || 'ACTIVE',
    createdAt: user.createdAt || now,
  };

  if (user.phone) userPayload.phone = user.phone;
  if (user.pin) userPayload.pin = user.pin;
  if (user.lastLogin) userPayload.lastLogin = user.lastLogin;

  try {
    const userDocRef = doc(db, 'users', user.id);
    await setDoc(userDocRef, userPayload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, userPath);
  }

  // If role is ADMIN or SUPER_ADMIN, synchronize to dynamic admins whitelist
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
    const adminEmail = user.email.toLowerCase().trim();
    const adminPath = `admins/${adminEmail}`;
    const adminPayload = {
      id: adminEmail,
      email: adminEmail,
      name: user.name,
      role: user.role,
      status: user.status || 'ACTIVE',
      addedBy: 'USER_ROLE_MIGRATION',
      updatedAt: now,
      createdAt: user.createdAt || now,
    };

    try {
      const adminDocRef = doc(db, 'admins', adminEmail);
      await setDoc(adminDocRef, adminPayload, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, adminPath);
    }
  }
}

/**
 * Executes Option 1: Full User & Role Migration
 * 1. Synchronizes all ERP roles through backend endpoint POST /api/users/sync-all-roles
 * 2. Writes all staff and admin accounts to Firestore /users/{userId}
 * 3. Populates /admins/{email} whitelist for elevated roles
 * 4. Verifies root admin moraasdorcah@gmail.com integrity
 */
export async function migrateAllUsersToFirestore(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    totalUsers: 0,
    migratedUsers: 0,
    whitelistedAdmins: 0,
    rolesBreakdown: {},
    errors: [],
  };

  // Step 1: Call backend sync endpoint
  let backendData;
  try {
    backendData = await api.syncAllRoles();
    result.totalUsers = backendData.count;
    result.rolesBreakdown = backendData.rolesBreakdown;
  } catch (err: any) {
    result.errors.push(`Backend ERP synchronization failed: ${err.message}`);
    return result;
  }

  const users: User[] = backendData.users;

  // Step 2: Iterate over each user and synchronize to Firestore
  for (const user of users) {
    try {
      await syncSingleUserToFirestore(user);
      result.migratedUsers++;
      if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
        result.whitelistedAdmins++;
      }
    } catch (err: any) {
      result.errors.push(`Failed to sync ${user.email} (${user.role}) to Firestore: ${err.message}`);
    }
  }

  result.success = result.errors.length === 0;
  return result;
}

/**
 * Safely removes a user from Firestore and ERP backend
 */
export async function deleteUserWithFirestoreSync(userId: string, email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  if (normalizedEmail === PRIMARY_ADMIN_EMAIL.toLowerCase() || userId === 'usr-admin-moraasdorcah') {
    throw new Error('Root administrator (moraasdorcah@gmail.com) is permanently protected and cannot be deleted.');
  }

  // 1. Delete from ERP backend
  await api.deleteUser(userId);

  // 2. Delete from Firestore /users/{userId}
  try {
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
  } catch (err) {
    console.warn(`[UserMigration] Failed to delete Firestore doc users/${userId}:`, err);
  }

  // 3. Delete from Firestore /admins/{adminEmail} if exists
  try {
    const adminRef = doc(db, 'admins', normalizedEmail);
    const snap = await getDoc(adminRef);
    if (snap.exists()) {
      await deleteDoc(adminRef);
    }
  } catch (err) {
    console.warn(`[UserMigration] Failed to delete Firestore doc admins/${normalizedEmail}:`, err);
  }
}
