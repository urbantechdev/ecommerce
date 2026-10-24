import { doc, writeBatch, collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { InventoryItem, Product } from '../types';

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
 * Persists all inventory items and products directly into Google Firestore.
 * Batches writes in chunks of 400 to honor Firestore's 500-operation transaction boundary.
 */
export async function syncInventoryToFirestore(
  inventoryItems: InventoryItem[],
  productsList?: Product[]
): Promise<{ inventoryCount: number; productsCount: number }> {
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
        // Document ID sanitize for Firestore path
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
    const CHUNK_SIZE = 400;
    for (let i = 0; i < productsList.length; i += CHUNK_SIZE) {
      const chunk = productsList.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);

      for (const prod of chunk) {
        const cleanId = prod.id.replace(/[^a-zA-Z0-9_-]/g, '_');
        const docRef = doc(db, 'products', cleanId);
        const data = {
          name: prod.name,
          school: prod.school,
          category: prod.category,
          price: prod.variants?.[0]?.sellingPrice || 1000,
          description: prod.description || `${prod.name} official high-quality uniform garment.`,
          imageUrl: prod.imageUrl || '',
          active: prod.active !== false,
          variantsCount: prod.variants?.length || 0,
          variants: (prod.variants || []).map((v) => ({
            id: v.id,
            sku: v.sku,
            size: v.size,
            sellingPrice: v.sellingPrice,
            costPrice: v.costPrice,
            stock: Object.values(v.branchStock || {}).reduce((a, b) => a + b, 0),
          })),
          updatedAt: now,
        };
        batch.set(docRef, data, { merge: true });
      }

      try {
        await batch.commit();
        productsSaved += chunk.length;
      } catch (err: unknown) {
        handleFirestoreError(err, OperationType.WRITE, 'products');
      }
    }
  }

  return {
    inventoryCount: inventorySaved,
    productsCount: productsSaved,
  };
}

/**
 * Checks how many records exist in the Firestore database
 */
export async function getFirestoreInventoryStats(): Promise<{ inventoryTotal: number; productsTotal: number }> {
  try {
    const [invSnap, prodSnap] = await Promise.all([
      getDocs(collection(db, 'inventory')),
      getDocs(collection(db, 'products')),
    ]);
    return {
      inventoryTotal: invSnap.size,
      productsTotal: prodSnap.size,
    };
  } catch (err: unknown) {
    handleFirestoreError(err, OperationType.LIST, 'inventory');
  }
}
