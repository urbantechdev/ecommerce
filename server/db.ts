import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'ADMIN' | 'ACCOUNTANT' | 'STAFF';
  branchId: string; // 'all' or specific branchId
  phone?: string;
  pin?: string; // 6-digit assigned PIN for fast POS terminal cashier authentication
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  lastLogin?: string;
}

export interface Branch {
  id: string;
  code: string;
  name: string;
  location: string;
  address: string;
  phone: string;
  email: string;
  isHQ: boolean;
  createdAt: string;
}

export interface ProductVariant {
  id: string;
  sku: string;
  barcode: string;
  size: string; // e.g., '24', '26', '28', '30', '32', '34', '36', '38', 'S', 'M', 'L'
  color: string;
  costPrice: number;
  sellingPrice: number;
  // Branch inventory quantities: { [branchId: string]: number }
  branchStock: Record<string, number>;
  reorderLevel: number;
  reorderQuantity: number;
  imageUrl?: string;
  imageCategory?: string;
}

export interface Product {
  id: string;
  name: string;
  school: string; // e.g. 'Nairobi School', 'KMTC', 'Corporate Security', 'General Uniform'
  sector?: string; // 'PRE_PRIMARY' | 'PRIMARY' | 'JUNIOR_SECONDARY' | 'SECONDARY' | 'COLLEGE_UNIVERSITY' | 'SERVICE_PROFESSIONAL' | 'ACCESSORIES'
  institutionType?: string; // e.g. 'KMTC', 'TVET colleges', 'Universities', 'Nursing colleges'
  professionalDomain?: string; // e.g. 'Security', 'Hospitality', 'Medical', 'Corporate', 'Industrial'
  garmentType?: string; // e.g. 'Scrubs', 'Polo shirts', 'Chef coats', 'Pinafores'
  category: string;
  gender: 'BOYS' | 'GIRLS' | 'UNISEX';
  description: string;
  taxCategory: 'VAT_16' | 'ZERO_RATED' | 'EXEMPT';
  supplierId?: string;
  imageUrl?: string;
  imageCategory?: string;
  active: boolean;
  variants: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  sku: string;
  branchId: string;
  branchName: string;
  type: 'SALE' | 'PURCHASE' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'ADJUSTMENT' | 'RETURN' | 'DAMAGED' | 'OPENING';
  quantityChange: number; // positive or negative
  previousStock: number;
  newStock: number;
  referenceNumber: string; // e.g. receipt #, PO #, transfer #
  reason?: string;
  userId: string;
  userName: string;
  timestamp: string;
}

export interface StockTransfer {
  id: string;
  transferNumber: string;
  sourceBranchId: string;
  sourceBranchName: string;
  destBranchId: string;
  destBranchName: string;
  items: {
    productId: string;
    variantId: string;
    productName: string;
    sku: string;
    size: string;
    quantity: number;
  }[];
  status: 'PENDING' | 'DISPATCHED' | 'RECEIVED' | 'CANCELLED';
  notes?: string;
  initiatedBy: string;
  initiatedByName: string;
  dispatchedAt?: string;
  receivedBy?: string;
  receivedByName?: string;
  receivedAt?: string;
  createdAt: string;
}

export interface SaleItem {
  productId: string;
  variantId: string;
  productName: string;
  sku: string;
  school: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  taxRate: number; // 0.16 or 0.00
  taxAmount: number;
  discountAmount: number;
  subtotal: number;
  total: number;
}

export interface Sale {
  id: string;
  receiptNumber: string;
  invoiceNumber?: string;
  branchId: string;
  branchName: string;
  cashierId: string;
  cashierName: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  items: SaleItem[];
  subtotal: number;
  totalTax: number;
  totalDiscount: number;
  totalAmount: number;
  paymentMethod: 'CASH' | 'MPESA' | 'CARD' | 'BANK_TRANSFER' | 'CREDIT';
  paymentReference?: string; // M-Pesa transaction code e.g. 'QKJ928374'
  amountTendered: number;
  changeGiven: number;
  status: 'COMPLETED' | 'REFUNDED' | 'VOIDED';
  refundReason?: string;
  // KRA eTIMS Fiscal fields
  kraStatus: 'FISCALIZED' | 'PENDING' | 'FAILED';
  cuInvoiceNumber?: string; // e.g. '013000000000001'
  kraQrCodeUrl?: string;
  kraControlCode?: string; // e.g. 'A98F-21BC-77E0-4491'
  kraSubmissionTimestamp?: string;
  kraError?: string;
  createdAt: string;
}

export interface QuotationItem {
  productId: string;
  variantId: string;
  productName: string;
  sku: string;
  size: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  branchId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  schoolOrOrg?: string;
  items: QuotationItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';
  validUntil: string;
  terms: string;
  notes?: string;
  convertedInvoiceId?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  productId: string;
  variantId: string;
  productName: string;
  sku: string;
  size: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  branchId: string;
  branchName: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerKraPin?: string;
  quotationId?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  status: 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'VOIDED';
  dueDate: string;
  paymentTerms: string;
  notes?: string;
  // Fiscal fields
  kraStatus: 'FISCALIZED' | 'PENDING' | 'FAILED';
  cuInvoiceNumber?: string;
  kraQrCodeUrl?: string;
  kraControlCode?: string;
  voidReason?: string;
  voidedAt?: string;
  voidedBy?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentReceipt {
  id: string;
  receiptNumber: string;
  invoiceId?: string;
  saleId?: string;
  branchId: string;
  branchName: string;
  customerId: string;
  customerName: string;
  amount: number;
  paymentMethod: 'CASH' | 'MPESA' | 'CARD' | 'BANK_TRANSFER';
  paymentReference: string;
  notes?: string;
  receivedBy: string;
  receivedByName: string;
  cuNumber?: string;
  kraQrCodeUrl?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  customerType: 'INDIVIDUAL' | 'SCHOOL' | 'WHOLESALE';
  schoolOrOrg?: string;
  kraPin?: string;
  address?: string;
  creditLimit: number;
  currentBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  kraPin?: string;
  paymentTerms: string;
  bankDetails?: string;
  category: 'FABRIC' | 'ACCESSORIES' | 'KNITWEAR' | 'EMBROIDERY' | 'OTHER';
  currentBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseItem {
  productId: string;
  variantId: string;
  productName: string;
  sku: string;
  size: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
  taxAmount: number;
  totalCost: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  branchId: string;
  branchName: string;
  items: PurchaseItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  status: 'DRAFT' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
  expectedDate?: string;
  notes?: string;
  receivedAt?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  expenseNumber: string;
  branchId: string;
  branchName: string;
  category: 'RENT' | 'UTILITIES' | 'SALARIES' | 'LOGISTICS' | 'PACKAGING' | 'MAINTENANCE' | 'OFFICE' | 'MARKETING' | 'TAX_LEVIES' | 'OTHER';
  title: string;
  description?: string;
  amount: number;
  paymentMethod: 'CASH' | 'MPESA' | 'BANK_TRANSFER' | 'CARD';
  paymentReference?: string;
  receiptAttachment?: string;
  incurredDate: string;
  recordedBy: string;
  recordedByName: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  branchId: string;
  branchName: string;
  action: string; // e.g. 'USER_LOGIN', 'SALE_COMPLETED', 'STOCK_ADJUSTMENT', 'INVOICE_VOIDED', 'KRA_TRANSMISSION'
  entityType: string; // 'SALE', 'INVENTORY', 'USER', 'INVOICE', 'SETTING', etc.
  entityId: string;
  details: string;
  previousValue?: string;
  newValue?: string;
  ipAddress?: string;
  timestamp: string;
}

export interface SystemSettings {
  companyName: string;
  companyDomain: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  kraPin: string;
  currency: string;
  taxRateStandard: number; // 0.16
  taxRateZero: number; // 0.00
  invoicePrefix: string;
  receiptPrefix: string;
  quotationPrefix: string;
  poPrefix: string;
  transferPrefix: string;
  kraTraderCode: string;
  kraOscuSerial: string;
  kraMode: 'SANDBOX' | 'PRODUCTION';
  autoRetryKra: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpSecure: boolean;
  lowStockNotificationThreshold: number;
  receiptFooterMessage: string;
  logoUrl?: string;
}

export interface DatabaseSchema {
  branches: Branch[];
  users: User[];
  products: Product[];
  inventoryMovements: InventoryMovement[];
  stockTransfers: StockTransfer[];
  sales: Sale[];
  quotations: Quotation[];
  invoices: Invoice[];
  receipts: PaymentReceipt[];
  customers: Customer[];
  suppliers: Supplier[];
  purchases: PurchaseOrder[];
  expenses: Expense[];
  auditLogs: AuditLog[];
  settings: SystemSettings;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

class DatabaseEngine {
  private data: DatabaseSchema;
  private isSaving = false;

  constructor() {
    this.ensureDirectoryExists();
    this.data = this.loadDatabase();
  }

  private ensureDirectoryExists() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadDatabase(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed: DatabaseSchema = JSON.parse(raw);
        let updated = false;
        if (parsed.products && Array.isArray(parsed.products) && parsed.products.length > 0) {
          // Sync image URLs from inventory CSV
          const csvProducts = this.seedProductsFromInventoryCsv();
          const csvById = new Map(csvProducts.map((cp) => [cp.id, cp.imageUrl]));
          const csvByName = new Map(csvProducts.map((cp) => [cp.name.toLowerCase().trim(), cp.imageUrl]));
          
          for (const p of parsed.products) {
            if (!p.sector) {
              if (p.category === 'TIES' || p.category === 'SOCKS' || p.category === 'ACCESSORIES') {
                p.sector = 'ACCESSORIES';
              } else {
                p.sector = 'SECONDARY';
              }
              if (!p.garmentType) p.garmentType = p.category;
              updated = true;
            }
            const matchedImg = csvById.get(p.id) || csvByName.get(p.name.toLowerCase().trim());
            if (matchedImg && p.imageUrl !== matchedImg) {
              p.imageUrl = matchedImg;
              p.variants.forEach((v) => {
                v.imageUrl = matchedImg;
              });
              updated = true;
            }
          }
        } else {
          parsed.products = this.seedProductsFromInventoryCsv();
          updated = true;
        }

        if (updated) {
          this.data = parsed;
          this.saveDataDirect(parsed);
        }
        return parsed;
      } catch (err) {
        console.error('Error reading database file, reinitializing default data:', err);
      }
    }
    const defaultData = this.generateInitialSeed();
    this.saveDataDirect(defaultData);
    return defaultData;
  }


  public getData(): DatabaseSchema {
    return this.data;
  }

  public async save(): Promise<void> {
    if (this.isSaving) return;
    this.isSaving = true;
    try {
      const tempPath = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Failed to commit database transaction to disk:', err);
    } finally {
      this.isSaving = false;
    }
  }

  private saveDataDirect(data: DatabaseSchema): void {
    const tempPath = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, DB_FILE);
  }

  // Sequential ID generators
  public getNextSequence(prefix: string, list: { [key: string]: any }[], fieldName: string): string {
    const year = new Date().getFullYear();
    const count = list.length + 1;
    return `${prefix}-${year}-${String(count).padStart(5, '0')}`;
  }

  public logAudit(log: Omit<AuditLog, 'id' | 'timestamp'>): void {
    const auditRecord: AuditLog = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      ...log,
    };
    this.data.auditLogs.unshift(auditRecord);
    // Keep last 5000 audit logs to prevent unbounded growth
    if (this.data.auditLogs.length > 5000) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 5000);
    }
    this.save();
  }

  private generateInitialSeed(): DatabaseSchema {
    const now = new Date().toISOString();

    // 1. Physical Branches in Kenya (Initially Uhuru Market only, with capacity to add more)
    const branches: Branch[] = [
      {
        id: 'branch-nbi-cbd',
        code: 'UHR-MKT',
        name: 'Uhuru Market (HQ)',
        location: 'Uhuru Market, Nairobi',
        address: 'Naisia Textiles Complex, Stall / Unit 2, Uhuru Market, Jogoo Road, P.O. Box 48291-00100 Nairobi',
        phone: '+254 722 001 100',
        email: 'uhuru@naisiaetextiles.com',
        isHQ: true,
        createdAt: now,
      },
    ];

    // 2. Users (No mock or demo users seeded)
    const users: User[] = [];

    // 3. Suppliers (Awaiting real creation)
    const suppliers: Supplier[] = [];

    // 4. Customers (Awaiting real creation)
    const customers: Customer[] = [];

    // Helper to generate variants for a product
    const createUniformVariants = (
      prefix: string,
      baseSku: string,
      color: string,
      cost: number,
      price: number,
      sizes: string[],
      stockDist: { cbd: number; wst: number; msa: number; ksm: number },
      reorder: number = 10
    ): ProductVariant[] => {
      return sizes.map((size) => {
        const totalAllocated = stockDist.cbd + stockDist.wst + stockDist.msa + stockDist.ksm;
        return {
          id: `var-${prefix}-${size}`,
          sku: `${baseSku}-${size}`,
          barcode: `616${Math.floor(100000000 + Math.random() * 900000000)}`,
          size,
          color,
          costPrice: cost,
          sellingPrice: price,
          branchStock: {
            'branch-nbi-cbd': Math.max(0, totalAllocated + Math.floor(Math.random() * 5) - 2),
          },
          reorderLevel: reorder,
          reorderQuantity: 30,
        };
      });
    };

    // 5. Products Catalog (School Uniforms seeded from inventory CSV)
    const products: Product[] = this.seedProductsFromInventoryCsv();

    // 6. Sales & POS Transactions (Awaiting real transactions)
    const sales: Sale[] = [];

    // 7. Quotations (Awaiting real creation)
    const quotations: Quotation[] = [];


    // 8. Invoices (Awaiting real creation)
    const invoices: Invoice[] = [];

    // 9. Payment Receipts (Awaiting real creation)
    const receipts: PaymentReceipt[] = [];

    // 10. Purchases & Goods Received (Awaiting real creation)
    const purchases: PurchaseOrder[] = [];

    // 11. Expenses (Awaiting real creation)
    const expenses: Expense[] = [];

    // 12. Stock Transfers (Awaiting real creation)
    const stockTransfers: StockTransfer[] = [];

    // 13. System Settings
    const settings: SystemSettings = {
      companyName: 'Naisia Textiles',
      companyDomain: 'naisiaetextiles.com',
      logoUrl: 'https://plain-eeur-prod-public.komododecks.com/202605/07/1sm3ITZIdJmYjyTcxmiP/image.png',
      companyEmail: 'support@naisiaetextiles.com',
      companyPhone: '0792021496 / 0112264870',
      companyAddress: 'Naisia Textiles Complex, Uhuru Market, P.O. Box 48291-00100 Nairobi, Kenya',
      kraPin: '',
      currency: 'KES',
      taxRateStandard: 0.16,
      taxRateZero: 0.00,
      invoicePrefix: 'INV',
      receiptPrefix: 'RCP',
      quotationPrefix: 'QUO',
      poPrefix: 'PO',
      transferPrefix: 'TRF',
      kraTraderCode: '',
      kraOscuSerial: '',
      kraMode: 'SANDBOX',
      autoRetryKra: true,
      smtpHost: 'smtp.zoho.com',
      smtpPort: 465,
      smtpUser: 'support@naisiaetextiles.com',
      smtpSecure: true,
      lowStockNotificationThreshold: 10,
      receiptFooterMessage: 'Thank you for shopping with Naisia Textiles. Genuine Quality School Uniforms. Goods once sold may be exchanged within 7 days with valid receipt.',
    };

    // 14. Initial Audit Logs
    const auditLogs: AuditLog[] = [
      {
        id: uuidv4(),
        userId: 'usr-admin-01',
        userName: 'Mercy Chebet',
        userRole: 'ADMIN',
        branchId: 'branch-nbi-cbd',
        branchName: 'Nairobi CBD Flagship (HQ)',
        action: 'SYSTEM_INITIALIZATION',
        entityType: 'SYSTEM',
        entityId: 'SYSTEM',
        details: 'Naisiae ERP system initialized with multi-branch synchronization and KRA eTIMS integration readiness.',
        timestamp: now,
      },
    ];

    return {
      branches,
      users,
      products,
      inventoryMovements: [],
      stockTransfers,
      sales,
      quotations,
      invoices,
      receipts,
      customers,
      suppliers,
      purchases,
      expenses,
      auditLogs,
      settings,
    };
  }

  public seedProductsFromInventoryCsv(): Product[] {
    const csvPath = path.join(DATA_DIR, 'inventory_import.csv');
    if (!fs.existsSync(csvPath)) {
      return [];
    }

    try {
      const csvText = fs.readFileSync(csvPath, 'utf-8');
      const lines = csvText.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) return [];

      const parseLine = (line: string): string[] => {
        const result: string[] = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const c = line[i];
          if (c === '"') {
            if (inQuotes && line[i + 1] === '"') {
              cur += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (c === ',' && !inQuotes) {
            result.push(cur.trim());
            cur = '';
          } else {
            cur += c;
          }
        }
        result.push(cur.trim());
        return result;
      };

      const SUBCAT_MAP: Record<string, string> = {
        'ecde / pre-primary': 'ECDE Pre-Primary Institutions',
        'ecde': 'ECDE Pre-Primary Institutions',
        'primary': 'Primary Schools (National Standard)',
        'jss / junior school': 'Junior Secondary Schools (JSS Kenya)',
        'jss': 'Junior Secondary Schools (JSS Kenya)',
        'secondary': 'Secondary & High Schools',
        'school accessories': 'All Schools & Colleges (Accessories)',
        'school sports': 'Schools & Sports Clubs (Kenya)',
        'kmtc': 'Kenya Medical Training College (KMTC)',
        'nursing / medical': 'Medical & Nursing Colleges',
        'hospitality': 'Hospitality & Culinary Institutions',
        'corporate': 'Corporate & Executive Workplaces',
        'industrial': 'Industrial & Technical Workplaces',
        'security': 'Security Services & Guard Forces',
        'general': 'General & Institutional Workwear',
      };

      const expandSizes = (rawSize: string): string[] => {
        if (!rawSize) return ['Standard'];
        const s = rawSize.trim();
        if (s.includes(',')) {
          return s.split(',').map((x) => x.trim()).filter(Boolean);
        }
        if (s === '22-32') return ['22', '24', '26', '28', '30', '32'];
        if (s === '24-36') return ['24', '26', '28', '30', '32', '34', '36'];
        if (s === '28-40') return ['28', '30', '32', '34', '36', '38', '40'];
        if (s === 'S-XXL') return ['S', 'M', 'L', 'XL', '2XL'];
        if (s === 'S-3XL') return ['S', 'M', 'L', 'XL', '2XL', '3XL'];
        return [s];
      };

      const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
      const colPrice = headers.findIndex((h) => h.includes('retail') || h.includes('selling') || (h.includes('price') && !h.includes('cost') && !h.includes('buy')));
      const colCost = headers.findIndex((h) => h.includes('cost') || h.includes('buying') || h.includes('purchase') || h.includes('marketlow'));
      const colName = headers.findIndex((h) => (h.includes('product') && !h.includes('category')) || h.includes('itemname') || h.includes('name') || h.includes('title'));
      const colSchool = headers.findIndex((h) => h.includes('school') || h.includes('institution') || h.includes('subcategory') || h.includes('campus'));
      const colCategory = headers.findIndex((h) => h.includes('category') || h.includes('garment'));
      const colSector = headers.findIndex((h) => h.includes('sector') || h.includes('education'));
      const colGender = headers.findIndex((h) => h.includes('gender') || h.includes('sex'));
      const colDesc = headers.findIndex((h) => h.includes('desc') || h.includes('note') || h.includes('detail'));
      const colSku = headers.findIndex((h) => h.includes('sku') || h.includes('code'));
      const colSize = headers.findIndex((h) => h.includes('size'));
      const colReorder = headers.findIndex((h) => h.includes('reorder'));
      const colImg = headers.findIndex((h) => h.includes('image') || h.includes('img') || h.includes('url'));

      const products: Product[] = [];
      const now = new Date().toISOString();

      for (let i = 1; i < lines.length; i++) {
        const cols = parseLine(lines[i]);
        if (!cols.length || cols.every((c) => !c)) continue;

        const name = colName >= 0 && cols[colName] ? cols[colName] : `Uniform Item #${i}`;
        const rawSchool = colSchool >= 0 && cols[colSchool] ? cols[colSchool] : 'General Uniform';
        const school = SUBCAT_MAP[rawSchool.toLowerCase().trim()] || rawSchool;
        const category = colCategory >= 0 && cols[colCategory] ? cols[colCategory] : 'General Uniform';
        const rawSector = colSector >= 0 && cols[colSector] ? cols[colSector].toUpperCase() : 'SECONDARY';
        const sector = (['PRE_PRIMARY', 'PRIMARY', 'JSS', 'SECONDARY', 'COLLEGE_UNIVERSITY', 'SERVICE_PROFESSIONAL', 'ACCESSORIES'].includes(rawSector)
          ? rawSector
          : 'SECONDARY') as any;
        const rawGender = colGender >= 0 && cols[colGender] ? cols[colGender].toUpperCase() : 'UNISEX';
        const gender = ['BOYS', 'GIRLS', 'UNISEX'].includes(rawGender) ? (rawGender as any) : 'UNISEX';
        const description = colDesc >= 0 && cols[colDesc] ? cols[colDesc] : 'High quality durable uniform crafted with reinforced stitching.';
        const skuPrefix = colSku >= 0 && cols[colSku] ? cols[colSku].replace(/[^A-Za-z0-9]/g, '') : `NT-${i}`;
        const costPrice = colCost >= 0 && !isNaN(Number(cols[colCost])) ? Number(cols[colCost]) : 600;
        const sellingPrice = colPrice >= 0 && !isNaN(Number(cols[colPrice])) ? Number(cols[colPrice]) : 1000;
        const reorderLevel = colReorder >= 0 && !isNaN(Number(cols[colReorder])) ? Number(cols[colReorder]) : 10;
        const sizes = expandSizes(colSize >= 0 ? cols[colSize] : 'Standard');
        const csvImageUrl = colImg >= 0 && cols[colImg] ? cols[colImg] : '';
        const finalImageUrl = csvImageUrl || '/assets/images/category_school_1782334810884.jpg';

        const prodId = `prod-${skuPrefix.toLowerCase().slice(0, 9)}-${i}`;
        const variants: ProductVariant[] = sizes.map((size, sIdx) => {
          const varSku = `${skuPrefix}-${size}`.toUpperCase();
          const barcode = `616${String(100000000 + i * 100 + sIdx)}`;
          return {
            id: `var-${prodId}-${sIdx + 1}`,
            sku: varSku,
            barcode,
            size,
            color: 'Standard Official',
            costPrice,
            sellingPrice,
            branchStock: {
              'branch-nbi-cbd': 45,
            },
            reorderLevel,
            reorderQuantity: 30,
            imageUrl: finalImageUrl,
          };
        });

        products.push({
          id: prodId,
          name: `${name} (${rawSchool} - ${gender === 'BOYS' ? 'Boys' : gender === 'GIRLS' ? 'Girls' : 'Unisex'})`,
          school,
          sector,
          institutionType: rawSchool,
          professionalDomain: rawSchool,
          garmentType: name,
          category,
          gender,
          description,
          taxCategory: 'VAT_16',
          imageUrl: finalImageUrl,
          active: true,
          variants,
          createdAt: now,
          updatedAt: now,
        });
      }

      return products;
    } catch (err) {
      console.error('[CSV Seeding Error]', err);
      return [];
    }
  }
}

export const db = new DatabaseEngine();

