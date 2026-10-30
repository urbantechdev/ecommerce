import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { api } from '../api';

export interface AdminWhitelistEntry {
  id: string; // Document ID (usually lowercased email or UID)
  email: string;
  uid?: string;
  name?: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
  status: 'ACTIVE' | 'INACTIVE';
  addedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface FirestoreErrorInfo {
  error: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  path: string;
  authInfo: {
    userId?: string;
    email?: string;
    role?: string;
  };
}

export const PRIMARY_ADMIN_EMAIL = 'moraasdorcah@gmail.com';

function logFirestoreError(operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write', path: string, err: any) {
  const errorInfo: FirestoreErrorInfo = {
    error: err?.message || String(err),
    operation,
    path,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email || undefined,
    },
  };
  console.warn(`[AdminWhitelist] Firestore ${operation.toUpperCase()} error on ${path}:`, errorInfo);
}

/**
 * Checks dynamically against Firebase Firestore whether a given email or UID is in the admins whitelist.
 */
export async function checkIsAdminWhitelisted(email: string, uid?: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();

  // Root Administrator is always whitelisted by constitutional design
  if (normalizedEmail === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
    // Attempt Firestore verification & background sync if online
    try {
      const emailDocRef = doc(db, 'admins', normalizedEmail);
      const emailSnap = await getDoc(emailDocRef);
      if (!emailSnap.exists()) {
        bootstrapPrimaryAdmin(uid).catch((err) =>
          logFirestoreError('write', `admins/${normalizedEmail}`, err)
        );
      }
    } catch (err) {
      logFirestoreError('get', `admins/${normalizedEmail}`, err);
    }
    return true;
  }

  // 1. Direct check by document ID (doc id = email)
  try {
    const emailDocRef = doc(db, 'admins', normalizedEmail);
    const emailSnap = await getDoc(emailDocRef);
    if (emailSnap.exists()) {
      const data = emailSnap.data();
      if (!data.status || data.status === 'ACTIVE') {
        return true;
      }
    }
  } catch (err) {
    logFirestoreError('get', `admins/${normalizedEmail}`, err);
  }

  // 2. Direct check by UID if available
  if (uid) {
    try {
      const uidDocRef = doc(db, 'admins', uid);
      const uidSnap = await getDoc(uidDocRef);
      if (uidSnap.exists()) {
        const data = uidSnap.data();
        if (!data.status || data.status === 'ACTIVE') {
          return true;
        }
      }
    } catch (err) {
      logFirestoreError('get', `admins/${uid}`, err);
    }
  }

  // 3. Collection scan if direct key didn't match (for entries created with custom IDs)
  try {
    const adminsCol = collection(db, 'admins');
    const querySnap = await getDocs(adminsCol);
    for (const adminDoc of querySnap.docs) {
      const data = adminDoc.data();
      const docEmail = (data.email || '').trim().toLowerCase();
      const docUid = data.uid;
      const isActive = !data.status || data.status === 'ACTIVE';

      if (isActive && (docEmail === normalizedEmail || (uid && docUid === uid))) {
        return true;
      }
    }
  } catch (err) {
    logFirestoreError('list', 'admins', err);
  }

  return false;
}

/**
 * Bootstraps the primary administrator (moraasdorcah@gmail.com) in Firestore
 * and synchronizes with the enterprise ERP system database.
 */
export async function bootstrapPrimaryAdmin(currentUid?: string): Promise<void> {
  const normalizedEmail = PRIMARY_ADMIN_EMAIL.toLowerCase();
  const now = new Date().toISOString();

  // 1. Synchronize with ERP backend database
  try {
    await api.syncRootAdmin();
  } catch (err) {
    console.warn('[AdminWhitelist] ERP backend sync error (non-fatal):', err);
  }

  // 2. Synchronize with Firebase Firestore
  try {
    const adminDocRef = doc(db, 'admins', normalizedEmail);
    const snap = await getDoc(adminDocRef);

    const entryData: Record<string, any> = {
      id: normalizedEmail,
      email: normalizedEmail,
      name: 'Dorcah Moraa (Primary Admin)',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      addedBy: 'SYSTEM_BOOTSTRAP',
      updatedAt: now,
    };

    if (currentUid) {
      entryData.uid = currentUid;
    }

    if (!snap.exists()) {
      entryData.createdAt = now;
      await setDoc(adminDocRef, entryData);
      console.log(`[AdminWhitelist] Successfully bootstrapped primary admin: ${normalizedEmail}`);
    } else {
      await setDoc(adminDocRef, entryData, { merge: true });
    }

    // Also write secondary record keyed by UID if present
    if (currentUid) {
      const uidDocRef = doc(db, 'admins', currentUid);
      await setDoc(uidDocRef, entryData, { merge: true });
    }
  } catch (err) {
    logFirestoreError('write', `admins/${normalizedEmail}`, err);
  }
}

/**
 * Retrieves all whitelisted administrators from Firebase Firestore.
 * Always ensures the root super admin is present in the list.
 */
export async function getWhitelistedAdmins(): Promise<AdminWhitelistEntry[]> {
  const mapByEmail = new Map<string, AdminWhitelistEntry>();

  try {
    const adminsCol = collection(db, 'admins');
    const querySnap = await getDocs(adminsCol);

    querySnap.forEach((d) => {
      const data = d.data();
      const email = (data.email || d.id).trim().toLowerCase();
      // Skip if doc ID was just a UID pointing to an existing email record
      if (!mapByEmail.has(email) || d.id === email) {
        mapByEmail.set(email, {
          id: d.id,
          email,
          uid: data.uid || '',
          name: data.name || email.split('@')[0],
          role: data.role || 'ADMIN',
          status: data.status || 'ACTIVE',
          addedBy: data.addedBy || 'System',
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        });
      }
    });
  } catch (err) {
    logFirestoreError('list', 'admins', err);
  }

  // Ensure root administrator is always represented
  const rootEmail = PRIMARY_ADMIN_EMAIL.toLowerCase();
  if (!mapByEmail.has(rootEmail)) {
    mapByEmail.set(rootEmail, {
      id: rootEmail,
      email: rootEmail,
      name: 'Dorcah Moraa (Primary Admin)',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      addedBy: 'SYSTEM_ROOT',
      createdAt: '2026-10-29T07:03:57.220Z',
      updatedAt: new Date().toISOString(),
    });
  }

  return Array.from(mapByEmail.values());
}

/**
 * Adds or updates an administrator in the Firebase Firestore whitelist.
 */
export async function addAdminToWhitelist(
  entry: {
    email: string;
    name?: string;
    role?: 'ADMIN' | 'SUPER_ADMIN';
    uid?: string;
  },
  addedByEmail?: string
): Promise<AdminWhitelistEntry> {
  const normalizedEmail = entry.email.trim().toLowerCase();
  const now = new Date().toISOString();
  const adminId = normalizedEmail;

  const adminData: AdminWhitelistEntry = {
    id: adminId,
    email: normalizedEmail,
    uid: entry.uid || '',
    name: entry.name || normalizedEmail.split('@')[0],
    role: entry.role || 'ADMIN',
    status: 'ACTIVE',
    addedBy: addedByEmail || auth.currentUser?.email || 'Administrator',
    createdAt: now,
    updatedAt: now,
  };

  try {
    const docRef = doc(db, 'admins', adminId);
    await setDoc(docRef, adminData);

    if (entry.uid) {
      const uidRef = doc(db, 'admins', entry.uid);
      await setDoc(uidRef, adminData);
    }
  } catch (err) {
    logFirestoreError('create', `admins/${adminId}`, err);
    throw err;
  }

  return adminData;
}

/**
 * Removes an administrator from the Firebase Firestore whitelist.
 */
export async function removeAdminFromWhitelist(idOrEmail: string): Promise<void> {
  const normalized = idOrEmail.trim().toLowerCase();
  if (normalized === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
    throw new Error('Cannot remove root primary administrator (moraasdorcah@gmail.com).');
  }

  try {
    const docRef = doc(db, 'admins', normalized);
    await deleteDoc(docRef);
  } catch (err) {
    logFirestoreError('delete', `admins/${normalized}`, err);
    throw err;
  }
}

/**
 * Toggles status (ACTIVE / INACTIVE) of a whitelisted admin in Firestore.
 */
export async function toggleAdminStatus(idOrEmail: string, newStatus: 'ACTIVE' | 'INACTIVE'): Promise<void> {
  const normalized = idOrEmail.trim().toLowerCase();
  if (normalized === PRIMARY_ADMIN_EMAIL.toLowerCase() && newStatus === 'INACTIVE') {
    throw new Error('Cannot deactivate root primary administrator.');
  }

  try {
    const docRef = doc(db, 'admins', normalized);
    await setDoc(
      docRef,
      {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    logFirestoreError('update', `admins/${normalized}`, err);
    throw err;
  }
}
