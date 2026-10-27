import { doc, writeBatch, collection, getDocs, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup, User as FirebaseUser } from 'firebase/auth';
import { db, auth } from '../firebase';
import { InventoryItem, Product } from '../types';
import config from '../../firebase-applet-config.json';

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
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Format a Product for Firestore document storage adhering to schema
 */
export function formatProductForFirestore(prod: Product, timestamp?: string): Record<string, any> {
  const now = timestamp || new Date().toISOString();
  return {
    id: prod.id,
    name: prod.name,
    school: prod.school || 'General Institution',
    sector: prod.sector || 'SECONDARY',
    institutionType: prod.institutionType || '',
    professionalDomain: prod.professionalDomain || '',
    garmentType: prod.garmentType || prod.category || 'Uniform',
    category: prod.category || 'Uniform',
    gender: prod.gender || 'UNISEX',
    price: Number(prod.variants?.[0]?.sellingPrice) || 1000,
    description: (prod.description || `${prod.name} official high-quality uniform garment.`).slice(0, 3900),
    taxCategory: prod.taxCategory || 'VAT_16',
    imageUrl: prod.imageUrl || '',
    imageCategory: prod.imageCategory || '',
    active: prod.active !== false,
    variantsCount: prod.variants?.length || 0,
    variants: (prod.variants || []).map((v) => ({
      id: v.id,
      sku: v.sku,
      barcode: v.barcode || '',
      size: v.size || 'Standard',
      color: v.color || 'Standard Official',
      sellingPrice: Number(v.sellingPrice) || 0,
      costPrice: Number(v.costPrice) || 0,
      stock: Object.values(v.branchStock || {}).reduce((sum, n) => sum + (Number(n) || 0), 0),
      branchStock: v.branchStock || {},
      reorderLevel: Number(v.reorderLevel) || 10,
      reorderQuantity: Number(v.reorderQuantity) || 30,
      imageUrl: v.imageUrl || '',
    })),
    createdAt: prod.createdAt || now,
    updatedAt: now,
  };
}

/**
 * Prompt Google Sign-In with popup if not already signed in to Firebase Auth
 */
export async function authenticateWithGoogle(): Promise<FirebaseUser> {
  if (auth.currentUser) {
    return auth.currentUser;
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

/**
 * Save the entire catalogue of products into the Firestore database
 */
export async function syncCatalogueToFirestore(
  productsList: Product[],
  onProgress?: (saved: number, total: number) => void
): Promise<{ savedCount: number; databaseId: string; timestamp: string }> {
  if (!productsList || productsList.length === 0) {
    return { savedCount: 0, databaseId: config.firestoreDatabaseId, timestamp: new Date().toISOString() };
  }

  const now = new Date().toISOString();
  const CHUNK_SIZE = 400;
  let totalSaved = 0;

  for (let i = 0; i < productsList.length; i += CHUNK_SIZE) {
    const chunk = productsList.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    for (const prod of chunk) {
      const cleanId = prod.id.replace(/[^a-zA-Z0-9_-]/g, '_');
      const docRef = doc(db, 'products', cleanId);
      const data = formatProductForFirestore(prod, now);
      batch.set(docRef, data, { merge: true });
    }

    try {
      await batch.commit();
      totalSaved += chunk.length;
      if (onProgress) {
        onProgress(totalSaved, productsList.length);
      }
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.WRITE, 'products');
    }
  }

  // Record sync status in /settings/catalogue_status
  try {
    const statusRef = doc(db, 'settings', 'catalogue_status');
    await setDoc(
      statusRef,
      {
        totalProducts: totalSaved,
        databaseId: config.firestoreDatabaseId,
        lastSyncedAt: now,
        syncedBy: auth.currentUser?.email || 'Admin',
        status: 'SYNCED',
        appUrl: 'https://naisiaetextiles.com',
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Could not update catalogue_status metadata document:', err);
  }

  return {
    savedCount: totalSaved,
    databaseId: config.firestoreDatabaseId,
    timestamp: now,
  };
}

/**
 * Save or update a single product into Firestore
 */
export async function saveProductToFirestore(product: Product): Promise<void> {
  const cleanId = product.id.replace(/[^a-zA-Z0-9_-]/g, '_');
  const docRef = doc(db, 'products', cleanId);
  const data = formatProductForFirestore(product);

  try {
    await setDoc(docRef, data, { merge: true });
  } catch (err: unknown) {
    handleFirestoreError(err, OperationType.WRITE, `products/${cleanId}`);
  }
}

/**
 * Delete a product from Firestore
 */
export async function deleteProductFromFirestore(productId: string): Promise<void> {
  const cleanId = productId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const docRef = doc(db, 'products', cleanId);

  try {
    await deleteDoc(docRef);
  } catch (err: unknown) {
    handleFirestoreError(err, OperationType.DELETE, `products/${cleanId}`);
  }
}

/**
 * Fetch all catalogue products directly from Firestore
 */
export async function fetchCatalogueFromFirestore(): Promise<Product[]> {
  try {
    const snap = await getDocs(collection(db, 'products'));
    const list: Product[] = [];
    snap.forEach((d) => {
      const data = d.data();
      list.push({
        id: data.id || d.id,
        name: data.name || '',
        school: data.school || 'General Institution',
        sector: data.sector || 'SECONDARY',
        institutionType: data.institutionType || '',
        professionalDomain: data.professionalDomain || '',
        garmentType: data.garmentType || data.category || 'Uniform',
        category: data.category || 'Uniform',
        gender: data.gender || 'UNISEX',
        description: data.description || '',
        taxCategory: data.taxCategory || 'VAT_16',
        imageUrl: data.imageUrl || '',
        imageCategory: data.imageCategory || '',
        active: data.active !== false,
        variants: data.variants || [],
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      });
    });
    return list;
  } catch (err: unknown) {
    handleFirestoreError(err, OperationType.LIST, 'products');
  }
}

/**
 * Persists all inventory items and products directly into Google Firestore.
 */
export async function syncInventoryToFirestore(
  inventoryItems: InventoryItem[],
  productsList?: Product[],
  onProgress?: (saved: number, total: number) => void
): Promise<{ inventoryCount: number; productsCount: number; databaseId: string }> {
  const now = new Date().toISOString();
  let inventorySaved = 0;
  let productsSaved = 0;

  // 1. Batch save inventory records into /inventory/{docId}
  if (inventoryItems && inventoryItems.length > 0) {
    const CHUNK_SIZE = 400;
    for (let i = 0; i < inventoryItems.length; i += CHUNK_SIZE) {
      const chunk = inventoryItems.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);

      for (const item of chunk) {
        const rawId = `${item.sku}_${item.branchId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
        const docRef = doc(db, 'inventory', rawId);
        const data = {
          productId: item.productId,
          productName: item.productName,
          school: item.school || 'General',
          category: item.category || 'Uniform',
          variantId: item.variantId,
          sku: item.sku,
          size: item.size || 'Standard',
          branchId: item.branchId,
          branchName: item.branchName,
          currentStock: Number(item.currentStock) || 0,
          reorderLevel: Number(item.reorderLevel) || 10,
          reorderQuantity: Number(item.reorderQuantity) || 30,
          costPrice: Number(item.costPrice) || 0,
          sellingPrice: Number(item.sellingPrice) || 0,
          imageUrl: item.imageUrl || '',
          updatedAt: now,
        };
        batch.set(docRef, data, { merge: true });
      }

      try {
        await batch.commit();
        inventorySaved += chunk.length;
      } catch (err: unknown) {
        handleFirestoreError(err, OperationType.WRITE, 'inventory');
      }
    }
  }

  // 2. Batch save products catalogue into /products/{productId}
  if (productsList && productsList.length > 0) {
    const res = await syncCatalogueToFirestore(productsList, onProgress);
    productsSaved = res.savedCount;
  }

  return {
    inventoryCount: inventorySaved,
    productsCount: productsSaved,
    databaseId: config.firestoreDatabaseId,
  };
}

/**
 * Checks how many records exist in the Firestore database
 */
export async function getFirestoreInventoryStats(): Promise<{
  inventoryTotal: number;
  productsTotal: number;
  databaseId: string;
  lastSyncedAt?: string;
}> {
  try {
    const [invSnap, prodSnap] = await Promise.all([
      getDocs(collection(db, 'inventory')),
      getDocs(collection(db, 'products')),
    ]);

    let lastSyncedAt: string | undefined;
    try {
      const statusDoc = await getDoc(doc(db, 'settings', 'catalogue_status'));
      if (statusDoc.exists()) {
        lastSyncedAt = statusDoc.data().lastSyncedAt;
      }
    } catch {
      // Non-blocking
    }

    return {
      inventoryTotal: invSnap.size,
      productsTotal: prodSnap.size,
      databaseId: config.firestoreDatabaseId,
      lastSyncedAt,
    };
  } catch (err: unknown) {
    handleFirestoreError(err, OperationType.LIST, 'inventory');
  }
}
