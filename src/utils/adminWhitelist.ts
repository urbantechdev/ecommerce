import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';

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

export const PRIMARY_ADMIN_EMAIL = 'moraasdorcah@gmail.com';

/**
 * Checks dynamically against Firebase Firestore whether a given email or UID is in the admins whitelist.
 */
export async function checkIsAdminWhitelisted(email: string, uid?: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();

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
    console.warn(`[AdminWhitelist] Direct email doc check error for ${normalizedEmail}:`, err);
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
      console.warn(`[AdminWhitelist] Direct UID doc check error for ${uid}:`, err);
    }
  }

  // 3. Collection scan if direct key didn't match (in case admin was added with a random uuid or different key)
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
    console.warn('[AdminWhitelist] Collection scan check error:', err);
  }

  return false;
}

/**
 * Bootstraps the primary administrator (moraasdorcah@gmail.com) in Firestore
 * if it doesn't already exist.
 */
export async function bootstrapPrimaryAdmin(currentUid?: string): Promise<void> {
  try {
    const normalizedEmail = PRIMARY_ADMIN_EMAIL.toLowerCase();
    const adminDocRef = doc(db, 'admins', normalizedEmail);
    const snap = await getDoc(adminDocRef);

    const now = new Date().toISOString();
    const entryData: Record<string, any> = {
      email: normalizedEmail,
      name: 'Primary Administrator (Moraa)',
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
    } else if (currentUid && snap.data()?.uid !== currentUid) {
      // Update with current UID so UID-based rules pass immediately
      await setDoc(adminDocRef, entryData, { merge: true });
    }

    // Also write a secondary record keyed by UID if currentUid is present
    if (currentUid) {
      const uidDocRef = doc(db, 'admins', currentUid);
      await setDoc(uidDocRef, entryData, { merge: true });
    }
  } catch (err) {
    console.error('[AdminWhitelist] Failed to bootstrap primary admin:', err);
  }
}

/**
 * Retrieves all whitelisted administrators from Firebase Firestore.
 */
export async function getWhitelistedAdmins(): Promise<AdminWhitelistEntry[]> {
  const list: AdminWhitelistEntry[] = [];
  try {
    const adminsCol = collection(db, 'admins');
    const querySnap = await getDocs(adminsCol);

    querySnap.forEach((d) => {
      const data = d.data();
      list.push({
        id: d.id,
        email: data.email || d.id,
        uid: data.uid || '',
        name: data.name || data.email || 'Administrator',
        role: data.role || 'ADMIN',
        status: data.status || 'ACTIVE',
        addedBy: data.addedBy || 'System',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      });
    });
  } catch (err) {
    console.error('[AdminWhitelist] Failed to fetch admins from Firestore:', err);
  }
  return list;
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
  const adminId = normalizedEmail; // Use normalized email as doc ID for instant rules lookup

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

  const docRef = doc(db, 'admins', adminId);
  await setDoc(docRef, adminData);

  // If UID provided, also sync doc by UID for fast rules evaluation
  if (entry.uid) {
    const uidRef = doc(db, 'admins', entry.uid);
    await setDoc(uidRef, adminData);
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

  const docRef = doc(db, 'admins', normalized);
  await deleteDoc(docRef);
}

/**
 * Toggles status (ACTIVE / INACTIVE) of a whitelisted admin in Firestore.
 */
export async function toggleAdminStatus(idOrEmail: string, newStatus: 'ACTIVE' | 'INACTIVE'): Promise<void> {
  const normalized = idOrEmail.trim().toLowerCase();
  if (normalized === PRIMARY_ADMIN_EMAIL.toLowerCase() && newStatus === 'INACTIVE') {
    throw new Error('Cannot deactivate root primary administrator.');
  }

  const docRef = doc(db, 'admins', normalized);
  await setDoc(
    docRef,
    {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}
