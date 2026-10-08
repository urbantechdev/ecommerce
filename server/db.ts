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
        if (parsed.users && Array.isArray(parsed.users)) {
          const defaultPins: Record<string, string> = {
            'usr-pos-nbi': '123456',
            'usr-pos-wst': '654321',
            'usr-pos-msa': '112233',
            'usr-pos-ksm': '334455',
            'usr-admin-01': '888888',
            'usr-acc-01': '555555',
          };
          for (const u of parsed.users) {
            if (!u.pin) {
              u.pin = defaultPins[u.id] || '123456';
              updated = true;
            }
          }
        }
        if (parsed.products && Array.isArray(parsed.products)) {
          // Backfill sector and add products from all 7 categories
          for (const p of parsed.products) {
            if (!p.sector) {
              if (p.category === 'TIES' || p.category === 'SOCKS' || p.category === 'ACCESSORIES') {
                p.sector = 'ACCESSORIES';
              } else if (p.school && (p.school.includes('Alliance') || p.school.includes('Nairobi School') || p.school.includes('Kenya High'))) {
                p.sector = 'SECONDARY';
              } else {
                p.sector = 'SECONDARY';
              }
              if (!p.garmentType) p.garmentType = p.category;
              updated = true;
            }
          }

          const seedProds = this.generateInitialSeed().products;
          for (const sp of seedProds) {
            if (!parsed.products.some((p) => p.id === sp.id)) {
              parsed.products.push(sp);
              updated = true;
            }
          }
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

    // 1. Physical Branches in Kenya
    const branches: Branch[] = [
      {
        id: 'branch-nbi-cbd',
        code: 'NBI-CBD',
        name: 'Nairobi CBD Flagship (HQ)',
        location: 'Biashara Street, Nairobi CBD',
        address: 'Naisia Textiles Complex, 2nd Flr, Biashara St, P.O. Box 48291-00100 Nairobi',
        phone: '+254 722 001 100',
        email: 'cbd@naisiaetextiles.com',
        isHQ: true,
        createdAt: now,
      },
      {
        id: 'branch-nbi-west',
        code: 'NBI-WST',
        name: 'Nairobi Westlands Branch',
        location: 'Sarit Centre Arcade, Westlands',
        address: 'Shop 14B, Mezzanine 1, Sarit Centre, Nairobi',
        phone: '+254 733 002 200',
        email: 'westlands@naisiaetextiles.com',
        isHQ: false,
        createdAt: now,
      },
      {
        id: 'branch-msa-nyl',
        code: 'MSA-NYL',
        name: 'Mombasa Nyali Branch',
        location: 'Links Road, Nyali, Mombasa',
        address: 'City Mall Nyali, Ground Flr Suite 9, Mombasa',
        phone: '+254 720 003 300',
        email: 'mombasa@naisiaetextiles.com',
        isHQ: false,
        createdAt: now,
      },
      {
        id: 'branch-ksm-cpt',
        code: 'KSM-CEN',
        name: 'Kisumu Mega Plaza Branch',
        location: 'Oginga Odinga Street, Kisumu',
        address: 'Mega Plaza Mall, 1st Floor, Kisumu',
        phone: '+254 725 004 400',
        email: 'kisumu@naisiaetextiles.com',
        isHQ: false,
        createdAt: now,
      },
    ];

    // 2. Default Users with secure bcrypt hashes
    // Admin: AdminPassword2026!
    // Accountant: Accountant2026!
    // Staff: StaffNairobi2026! / StaffWestlands2026! / StaffMombasa2026!
    const salt = bcrypt.genSaltSync(10);
    const users: User[] = [
      {
        id: 'usr-admin-01',
        name: 'Mercy Chebet',
        email: 'admin@naisiaetextiles.com',
        passwordHash: bcrypt.hashSync('AdminPassword2026!', salt),
        role: 'ADMIN',
        branchId: 'all',
        phone: '+254 711 990 001',
        pin: '888888',
        status: 'ACTIVE',
        createdAt: now,
      },
      {
        id: 'usr-acc-01',
        name: 'David Omondi',
        email: 'accountant@naisiaetextiles.com',
        passwordHash: bcrypt.hashSync('Accountant2026!', salt),
        role: 'ACCOUNTANT',
        branchId: 'all',
        phone: '+254 722 880 002',
        pin: '555555',
        status: 'ACTIVE',
        createdAt: now,
      },
      {
        id: 'usr-pos-nbi',
        name: 'Faith Muthoni',
        email: 'staff.nairobi@naisiaetextiles.com',
        passwordHash: bcrypt.hashSync('StaffNairobi2026!', salt),
        role: 'STAFF',
        branchId: 'branch-nbi-cbd',
        phone: '+254 733 770 003',
        pin: '123456',
        status: 'ACTIVE',
        createdAt: now,
      },
      {
        id: 'usr-pos-wst',
        name: 'Brian Kiprop',
        email: 'staff.westlands@naisiaetextiles.com',
        passwordHash: bcrypt.hashSync('StaffWestlands2026!', salt),
        role: 'STAFF',
        branchId: 'branch-nbi-west',
        phone: '+254 714 660 004',
        pin: '654321',
        status: 'ACTIVE',
        createdAt: now,
      },
      {
        id: 'usr-pos-msa',
        name: 'Amina Salim',
        email: 'staff.mombasa@naisiaetextiles.com',
        passwordHash: bcrypt.hashSync('StaffMombasa2026!', salt),
        role: 'STAFF',
        branchId: 'branch-msa-nyl',
        phone: '+254 728 550 005',
        pin: '112233',
        status: 'ACTIVE',
        createdAt: now,
      },
      {
        id: 'usr-pos-ksm',
        name: 'Kevin Otieno',
        email: 'staff.kisumu@naisiaetextiles.com',
        passwordHash: bcrypt.hashSync('StaffKisumu2026!', salt),
        role: 'STAFF',
        branchId: 'branch-ksm-cpt',
        phone: '+254 729 440 006',
        pin: '334455',
        status: 'ACTIVE',
        createdAt: now,
      },
    ];

    // 3. Suppliers
    const suppliers: Supplier[] = [
      {
        id: 'sup-01',
        name: 'Rivatex East Africa Ltd',
        companyName: 'Rivatex East Africa Limited',
        contactPerson: 'Eng. Patrick Koech',
        email: 'sales@rivatex.co.ke',
        phone: '+254 53 203 1400',
        address: 'Kapsoya, Eldoret, Kenya',
        kraPin: 'P051112233M',
        paymentTerms: 'Net 30 Days',
        bankDetails: 'KCB Bank Eldoret Branch, Acc: 1102938475',
        category: 'FABRIC',
        currentBalance: 320000,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'sup-02',
        name: 'Thika Cloth Mills Ltd',
        companyName: 'Thika Cloth Mills Limited',
        contactPerson: 'Sanjay Patel',
        email: 'orders@thikatwills.com',
        phone: '+254 67 220 188',
        address: 'Garissa Road, Thika, Kenya',
        kraPin: 'P051223344K',
        paymentTerms: 'Net 15 Days',
        bankDetails: 'NCBA Thika Branch, Acc: 772639102',
        category: 'FABRIC',
        currentBalance: 185000,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'sup-03',
        name: 'Apex Knitwear & Hosiery',
        companyName: 'Apex Knitwear Manufacturing Ltd',
        contactPerson: 'Grace Wambui',
        email: 'sales@apexknitwear.co.ke',
        phone: '+254 20 558 920',
        address: 'Enterprise Road, Industrial Area, Nairobi',
        kraPin: 'P051334455W',
        paymentTerms: 'Payment on Delivery',
        bankDetails: 'Equity Bank Community Branch, Acc: 0180293817',
        category: 'KNITWEAR',
        currentBalance: 95000,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'sup-04',
        name: 'Prestige Embroidery & Ties',
        companyName: 'Prestige School Accessories Ltd',
        contactPerson: 'Moses Otieno',
        email: 'info@prestigebadges.co.ke',
        phone: '+254 722 411 902',
        address: 'River Road Commercial Centre, Nairobi',
        kraPin: 'P051445566T',
        paymentTerms: 'Immediate',
        bankDetails: 'Co-op Bank River Road, Acc: 0112938475',
        category: 'ACCESSORIES',
        currentBalance: 42000,
        createdAt: now,
        updatedAt: now,
      },
    ];

    // 4. Sample Customers
    const customers: Customer[] = [
      {
        id: 'cust-walkin',
        name: 'Walk-In Customer (Cash/MPESA)',
        email: 'sales@naisiaetextiles.com',
        phone: '+254 700 000 000',
        customerType: 'INDIVIDUAL',
        creditLimit: 0,
        currentBalance: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cust-nairobi-school',
        name: 'Nairobi School PTA Association',
        email: 'pta@nairobischool.ac.ke',
        phone: '+254 20 444 2855',
        customerType: 'SCHOOL',
        schoolOrOrg: 'Nairobi School',
        kraPin: 'P051982736Y',
        address: 'Waiyaki Way, Westlands, Nairobi',
        creditLimit: 500000,
        currentBalance: 125000,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cust-alliance-high',
        name: 'Alliance High School Stores',
        email: 'bursar@alliancehighschool.sc.ke',
        phone: '+254 20 201 4725',
        customerType: 'SCHOOL',
        schoolOrOrg: 'Alliance High School',
        kraPin: 'P051772635B',
        address: 'Kikuyu, Kiambu County',
        creditLimit: 600000,
        currentBalance: 88000,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cust-parent-wanjiku',
        name: 'Dr. Wanjiku Mwangi (Parent)',
        email: 'wanjiku.mwangi@gmail.com',
        phone: '+254 722 345 678',
        customerType: 'INDIVIDUAL',
        schoolOrOrg: 'Kenya High School',
        creditLimit: 20000,
        currentBalance: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cust-parent-otieno',
        name: 'Eng. Peter Otieno (Parent)',
        email: 'potieno.consult@yahoo.com',
        phone: '+254 733 987 654',
        customerType: 'INDIVIDUAL',
        schoolOrOrg: 'Nairobi School',
        creditLimit: 15000,
        currentBalance: 4500,
        createdAt: now,
        updatedAt: now,
      },
    ];

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
      return sizes.map((size) => ({
        id: `var-${prefix}-${size}`,
        sku: `${baseSku}-${size}`,
        barcode: `616${Math.floor(100000000 + Math.random() * 900000000)}`,
        size,
        color,
        costPrice: cost,
        sellingPrice: price,
        branchStock: {
          'branch-nbi-cbd': Math.max(0, stockDist.cbd + Math.floor(Math.random() * 5) - 2),
          'branch-nbi-west': Math.max(0, stockDist.wst + Math.floor(Math.random() * 4) - 2),
          'branch-msa-nyl': Math.max(0, stockDist.msa + Math.floor(Math.random() * 3) - 1),
          'branch-ksm-cpt': Math.max(0, stockDist.ksm + Math.floor(Math.random() * 3) - 1),
        },
        reorderLevel: reorder,
        reorderQuantity: 30,
      }));
    };

    // 5. Products Catalog (School Uniforms)
    const products: Product[] = [
      {
        id: 'prod-ns-shirt',
        name: 'Nairobi School Official Poplin Shirt (Short Sleeve)',
        school: 'Nairobi School',
        category: 'SHIRTS',
        gender: 'BOYS',
        description: 'Premium crisp white polyester-cotton shirting fabric with embroidered Nairobi School crest badge on pocket.',
        taxCategory: 'VAT_16',
        supplierId: 'sup-02',
        active: true,
        variants: createUniformVariants('ns-shirt', 'NS-SH-WHT', 'White', 550, 950, ['26', '28', '30', '32', '34', '36'], {
          cbd: 45,
          wst: 30,
          msa: 12,
          ksm: 10,
        }, 15),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-ns-trouser',
        name: 'Nairobi School Heavyweight Navy Wool-Blend Trouser',
        school: 'Nairobi School',
        category: 'TROUSERS',
        gender: 'BOYS',
        description: 'Tough tailored school trouser with reinforced inner crotch and expandable waistband. High fade-resistant navy twill.',
        taxCategory: 'VAT_16',
        supplierId: 'sup-01',
        active: true,
        variants: createUniformVariants('ns-trouser', 'NS-TR-NVY', 'Navy Blue', 800, 1450, ['26', '28', '30', '32', '34', '36'], {
          cbd: 35,
          wst: 22,
          msa: 8,
          ksm: 6,
        }, 12),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-ns-blazer',
        name: 'Nairobi School Royal Navy Blazer with Braided Crest',
        school: 'Nairobi School',
        category: 'BLAZERS',
        gender: 'BOYS',
        description: 'Formal school blazer, fully lined with gold piping trim and precision gold bullion crest embroidery.',
        taxCategory: 'VAT_16',
        supplierId: 'sup-01',
        active: true,
        variants: createUniformVariants('ns-blazer', 'NS-BLZ-NVY', 'Royal Navy', 2200, 3800, ['28', '30', '32', '34', '36', '38'], {
          cbd: 20,
          wst: 14,
          msa: 5,
          ksm: 4,
        }, 8),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-ns-sweater',
        name: 'Nairobi School V-Neck Knit Sweater with Gold Stripes',
        school: 'Nairobi School',
        category: 'SWEATERS',
        gender: 'UNISEX',
        description: '100% anti-pill acrylic knitwear in navy blue with double gold collar stripe and school monogram.',
        taxCategory: 'VAT_16',
        supplierId: 'sup-03',
        active: true,
        variants: createUniformVariants('ns-sweater', 'NS-SWT-NVY', 'Navy / Gold', 750, 1350, ['26', '28', '30', '32', '34', '36'], {
          cbd: 28,
          wst: 18,
          msa: 6,
          ksm: 5,
        }, 10),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-ahs-shirt',
        name: 'Alliance High School White Oxford Button-Down Shirt',
        school: 'Alliance High School',
        category: 'SHIRTS',
        gender: 'BOYS',
        description: 'Classic durable white Oxford weave with Alliance High School red/green crest badge.',
        taxCategory: 'VAT_16',
        supplierId: 'sup-02',
        active: true,
        variants: createUniformVariants('ahs-shirt', 'AHS-SH-WHT', 'White', 550, 950, ['26', '28', '30', '32', '34', '36'], {
          cbd: 40,
          wst: 25,
          msa: 10,
          ksm: 8,
        }, 12),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-ahs-trouser',
        name: 'Alliance High School Forest Green Tailored Trouser',
        school: 'Alliance High School',
        category: 'TROUSERS',
        gender: 'BOYS',
        description: 'Signature Alliance deep forest green durable twill trouser, crease-resistant.',
        taxCategory: 'VAT_16',
        supplierId: 'sup-01',
        active: true,
        variants: createUniformVariants('ahs-trouser', 'AHS-TR-GRN', 'Forest Green', 850, 1500, ['26', '28', '30', '32', '34', '36'], {
          cbd: 30,
          wst: 20,
          msa: 7,
          ksm: 7,
        }, 10),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-kh-skirt',
        name: 'Kenya High School Pleated Box Skirt (Sky Blue / Navy)',
        school: 'Kenya High School',
        category: 'SKIRTS',
        gender: 'GIRLS',
        description: 'Permanent knife-pleated school skirt with adjustable side zip and concealed inner pocket.',
        taxCategory: 'VAT_16',
        supplierId: 'sup-01',
        active: true,
        variants: createUniformVariants('kh-skirt', 'KHS-SK-BLU', 'Navy / Sky Blue', 750, 1350, ['24', '26', '28', '30', '32', '34'], {
          cbd: 35,
          wst: 28,
          msa: 10,
          ksm: 10,
        }, 12),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-kh-blouse',
        name: 'Kenya High School Sky Blue Revere Collar Blouse',
        school: 'Kenya High School',
        category: 'BLOUSES',
        gender: 'GIRLS',
        description: 'Comfortable pastel sky blue school blouse with crisp revere collar and embroidered school emblem.',
        taxCategory: 'VAT_16',
        supplierId: 'sup-02',
        active: true,
        variants: createUniformVariants('kh-blouse', 'KHS-BL-SKY', 'Sky Blue', 520, 920, ['24', '26', '28', '30', '32', '34'], {
          cbd: 40,
          wst: 30,
          msa: 14,
          ksm: 12,
        }, 15),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-gen-tracksuit',
        name: 'All-Weather Fleece-Lined Sports Tracksuit (Navy/Gold)',
        school: 'General Uniform',
        category: 'TRACKSUITS',
        gender: 'UNISEX',
        description: 'Microfiber windproof athletic jacket with zip pockets plus matching track pants with ankle zips.',
        taxCategory: 'VAT_16',
        supplierId: 'sup-03',
        active: true,
        variants: createUniformVariants('gen-track', 'GEN-TRK-NG', 'Navy / Gold', 1400, 2400, ['26', '28', '30', '32', '34', '36'], {
          cbd: 25,
          wst: 18,
          msa: 8,
          ksm: 6,
        }, 8),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-gen-tie',
        name: 'Woven Jacquard Striped School Tie (Elastic / Standard)',
        school: 'General Uniform',
        category: 'TIES',
        gender: 'UNISEX',
        description: 'High-density micro-woven school tie available in standard 54-inch or junior elastic band.',
        taxCategory: 'VAT_16',
        supplierId: 'sup-04',
        active: true,
        variants: createUniformVariants('gen-tie', 'GEN-TIE-STR', 'Navy / Gold Stripe', 120, 280, ['Junior-Elastic', 'Senior-Standard'], {
          cbd: 80,
          wst: 50,
          msa: 25,
          ksm: 20,
        }, 20),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-gen-socks',
        name: 'Cotton Rich School Knee-High Socks (3-Pack)',
        school: 'General Uniform',
        category: 'SOCKS',
        gender: 'UNISEX',
        description: 'Cushioned heel and toe, elastic rib top that stays up all day. Breathable combed cotton.',
        taxCategory: 'VAT_16',
        supplierId: 'sup-03',
        active: true,
        variants: createUniformVariants('gen-socks', 'GEN-SCK-WHT', 'White / Navy Rib', 180, 420, ['Small (Shoe 1-3)', 'Medium (Shoe 4-7)', 'Large (Shoe 8-11)'], {
          cbd: 120,
          wst: 85,
          msa: 40,
          ksm: 35,
        }, 25),
        createdAt: now,
        updatedAt: now,
      },

      // 1. Pre-Primary / ECDE Products
      {
        id: 'prod-ecde-polo',
        name: 'Little Angels ECDE Polo Shirt (Yellow / Navy Trim)',
        school: 'Little Angels ECDE',
        sector: 'PRE_PRIMARY',
        garmentType: 'Polo shirts',
        category: 'Polo shirts',
        gender: 'UNISEX',
        description: 'Heavyweight pique cotton polo shirt with ribbed collar and embroidered kindergarten emblem.',
        taxCategory: 'VAT_16',
        supplierId: 'sup-02',
        active: true,
        variants: createUniformVariants('ecde-polo', 'ECDE-POL-YEL', 'Sun Yellow', 350, 650, ['18', '20', '22', '24', '26'], {
          cbd: 30,
          wst: 20,
          msa: 15,
          ksm: 10,
        }, 10),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-ecde-sweater',
        name: 'Pre-Primary Red Knit Pullover with Crest',
        school: 'St. Jude Kindergarten',
        sector: 'PRE_PRIMARY',
        garmentType: 'Sweaters',
        category: 'Sweaters',
        gender: 'UNISEX',
        description: 'Soft anti-scratch acrylic knit pullover with snug elastic cuffs for kindergarten pupils.',
        taxCategory: 'VAT_16',
        supplierId: 'sup-03',
        active: true,
        variants: createUniformVariants('ecde-swt', 'ECDE-SWT-RED', 'Bright Red', 500, 950, ['20', '22', '24', '26'], {
          cbd: 25,
          wst: 18,
          msa: 10,
          ksm: 10,
        }, 8),
        createdAt: now,
        updatedAt: now,
      },

      // 2. Primary School Products
      {
        id: 'prod-pri-shirt',
        name: 'Primary School Short-Sleeved Poplin Shirt (Light Blue)',
        school: 'St. Mary\'s Primary',
        sector: 'PRIMARY',
        garmentType: 'Short-sleeved shirts',
        category: 'Short-sleeved shirts',
        gender: 'BOYS',
        description: 'Durable easy-iron polyester-cotton poplin shirt tailored for primary school pupils.',
        taxCategory: 'VAT_16',
        supplierId: 'sup-02',
        active: true,
        variants: createUniformVariants('pri-sh', 'PRI-SH-BLU', 'Light Blue', 420, 780, ['24', '26', '28', '30', '32', '34'], {
          cbd: 45,
          wst: 30,
          msa: 15,
          ksm: 15,
        }, 15),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-pri-pinafore',
        name: 'Primary School Pleated Pinafore Dress (Navy Blue)',
        school: 'St. Mary\'s Primary',
        sector: 'PRIMARY',
        garmentType: 'Pinafore dresses',
        category: 'Pinafore dresses',
        gender: 'GIRLS',
        description: 'V-neck pleated pinafore dress with buttoned side tabs and reinforced hem.',
        taxCategory: 'VAT_16',
        supplierId: 'sup-01',
        active: true,
        variants: createUniformVariants('pri-pin', 'PRI-PIN-NVY', 'Navy Blue', 650, 1200, ['24', '26', '28', '30', '32', '34'], {
          cbd: 35,
          wst: 25,
          msa: 12,
          ksm: 10,
        }, 10),
        createdAt: now,
        updatedAt: now,
      },

      // 3. Junior Secondary (JSS) Products
      {
        id: 'prod-jss-tracksuit',
        name: 'Junior Secondary (JSS) CBC Moisture-Wick Tracksuit',
        school: 'Junior Secondary CBC',
        sector: 'JUNIOR_SECONDARY',
        garmentType: 'Tracksuits',
        category: 'Tracksuits',
        gender: 'UNISEX',
        description: 'Standardized Ministry-compliant Grade 7-9 CBC sports tracksuit with zippered pockets.',
        taxCategory: 'VAT_16',
        supplierId: 'sup-03',
        active: true,
        variants: createUniformVariants('jss-trk', 'JSS-TRK-GRN', 'Emerald Green / White', 1350, 2350, ['28', '30', '32', '34', '36', '38'], {
          cbd: 40,
          wst: 28,
          msa: 15,
          ksm: 15,
        }, 12),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-jss-blazer',
        name: 'Junior School Forest Green Tailored Uniform Blazer',
        school: 'Junior Secondary CBC',
        sector: 'JUNIOR_SECONDARY',
        garmentType: 'Blazers',
        category: 'Blazers',
        gender: 'UNISEX',
        description: 'Single-breasted 2-button blazer tailored for CBC Junior School pupils.',
        taxCategory: 'VAT_16',
        supplierId: 'sup-01',
        active: true,
        variants: createUniformVariants('jss-blz', 'JSS-BLZ-GRN', 'Forest Green', 1900, 3200, ['28', '30', '32', '34', '36'], {
          cbd: 25,
          wst: 18,
          msa: 8,
          ksm: 8,
        }, 8),
        createdAt: now,
        updatedAt: now,
      },

      // 5. Colleges & Universities
      {
        id: 'prod-kmtc-scrubs',
        name: 'KMTC Clinical Officer & Nursing Scrubs (Teal Green)',
        school: 'KMTC',
        sector: 'COLLEGE_UNIVERSITY',
        institutionType: 'KMTC',
        garmentType: 'Scrubs',
        category: 'Scrubs',
        gender: 'UNISEX',
        description: 'Autoclavable polyester-cotton medical scrub top with 3 pockets plus matching drawstring scrub pants.',
        taxCategory: 'VAT_16',
        supplierId: 'sup-02',
        active: true,
        variants: createUniformVariants('kmtc-scb', 'KMTC-SCB-TEA', 'Teal Green', 950, 1650, ['S', 'M', 'L', 'XL', 'XXL'], {
          cbd: 50,
          wst: 35,
          msa: 20,
          ksm: 20,
        }, 15),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-tvet-overall',
        name: 'TVET Engineering Heavy Duty Overalls (Navy Blue)',
        school: 'TVET Colleges Kenya',
        sector: 'COLLEGE_UNIVERSITY',
        institutionType: 'TVET colleges',
        garmentType: 'Overalls',
        category: 'Overalls',
        gender: 'UNISEX',
        description: '100% heavy cotton drill overall with heavy brass front zip, tool pockets, and reflective arm bands.',
        taxCategory: 'VAT_16',
        supplierId: 'sup-01',
        active: true,
        variants: createUniformVariants('tvet-ovr', 'TVET-OVR-NVY', 'Navy Blue', 1100, 1950, ['S', 'M', 'L', 'XL', 'XXL'], {
          cbd: 40,
          wst: 25,
          msa: 15,
          ksm: 15,
        }, 12),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-med-labcoat',
        name: 'Medical Training Institutions Anti-Static Lab Coat',
        school: 'Medical Training Institutions',
        sector: 'COLLEGE_UNIVERSITY',
        institutionType: 'Medical training institutions',
        garmentType: 'Lab coats',
        category: 'Lab coats',
        gender: 'UNISEX',
        description: 'Fluid-resistant lab coat with press studs, side access slits, and pen holder on left chest.',
        taxCategory: 'VAT_16',
        supplierId: 'sup-02',
        active: true,
        variants: createUniformVariants('med-lab', 'MED-LAB-WHT', 'Pure White', 850, 1450, ['S', 'M', 'L', 'XL', 'XXL'], {
          cbd: 45,
          wst: 30,
          msa: 15,
          ksm: 10,
        }, 10),
        createdAt: now,
        updatedAt: now,
      },

      // 6. Service & Professional Uniforms
      {
        id: 'prod-sec-shirt',
        name: 'Tactical Security Officer Short-Sleeve Uniform Shirt',
        school: 'Security Services Kenya',
        sector: 'SERVICE_PROFESSIONAL',
        professionalDomain: 'Security',
        garmentType: 'Security shirts',
        category: 'Security shirts',
        gender: 'UNISEX',
        description: 'High-durability security guard shirt with button-down epaulettes and pleated pockets.',
        taxCategory: 'VAT_16',
        supplierId: 'sup-02',
        active: true,
        variants: createUniformVariants('sec-sh', 'SEC-SH-BLU', 'Light Blue', 650, 1150, ['S', 'M', 'L', 'XL', 'XXL'], {
          cbd: 45,
          wst: 30,
          msa: 20,
          ksm: 15,
        }, 15),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-chef-coat',
        name: 'Executive Double-Breasted Chef Coat & Apron',
        school: 'Hospitality Services',
        sector: 'SERVICE_PROFESSIONAL',
        professionalDomain: 'Hospitality',
        garmentType: 'Chef coats',
        category: 'Chef coats',
        gender: 'UNISEX',
        description: 'Heat-resistant poly-cotton chef coat with detachable black stud buttons.',
        taxCategory: 'VAT_16',
        supplierId: 'sup-02',
        active: true,
        variants: createUniformVariants('chf-cot', 'CHF-COT-WHT', 'White / Black Studs', 900, 1600, ['S', 'M', 'L', 'XL', 'XXL'], {
          cbd: 35,
          wst: 25,
          msa: 15,
          ksm: 10,
        }, 10),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-corp-blouse',
        name: 'Corporate Executive Cotton-Rich Tailored Blouse',
        school: 'Corporate Wear',
        sector: 'SERVICE_PROFESSIONAL',
        professionalDomain: 'Corporate',
        garmentType: 'Corporate blouses',
        category: 'Corporate blouses',
        gender: 'GIRLS',
        description: 'Fitted formal corporate ladies blouse with french cuffs and premium pearlized buttons.',
        taxCategory: 'VAT_16',
        supplierId: 'sup-02',
        active: true,
        variants: createUniformVariants('crp-bls', 'CRP-BLS-WHT', 'Crisp White', 850, 1550, ['8', '10', '12', '14', '16', '18'], {
          cbd: 35,
          wst: 25,
          msa: 12,
          ksm: 10,
        }, 10),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-ind-overall',
        name: 'Heavy-Duty Industrial Boiler Suit with Reflective Striping',
        school: 'Industrial & Manufacturing',
        sector: 'SERVICE_PROFESSIONAL',
        professionalDomain: 'Industrial',
        garmentType: 'Overalls',
        category: 'Overalls',
        gender: 'UNISEX',
        description: 'Flame-retardant 100% cotton boiler suit with 360-degree reflective visibility bands.',
        taxCategory: 'VAT_16',
        supplierId: 'sup-01',
        active: true,
        variants: createUniformVariants('ind-ovr', 'IND-OVR-ORB', 'Orange / Navy', 1450, 2600, ['36', '38', '40', '42', '44', '46'], {
          cbd: 40,
          wst: 25,
          msa: 15,
          ksm: 15,
        }, 12),
        createdAt: now,
        updatedAt: now,
      },

      // 7. Accessories
      {
        id: 'prod-acc-belt',
        name: 'Full Grain Leather School Uniform Belt (Brass Buckle)',
        school: 'General Uniform',
        sector: 'ACCESSORIES',
        garmentType: 'Belts',
        category: 'Belts',
        gender: 'UNISEX',
        description: 'Genuine durable Kenyan full-grain leather uniform belt with heavy-duty solid brass buckle.',
        taxCategory: 'VAT_16',
        supplierId: 'sup-04',
        active: true,
        variants: createUniformVariants('acc-blt', 'ACC-BLT-BLK', 'Black Leather', 220, 450, ['26-30 (Junior)', '32-36 (Senior)', '38-42 (Adult)'], {
          cbd: 90,
          wst: 60,
          msa: 30,
          ksm: 25,
        }, 20),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod-acc-backpack',
        name: 'Heavy-Duty Waterproof School Bag / Backpack',
        school: 'General Uniform',
        sector: 'ACCESSORIES',
        garmentType: 'School bags',
        category: 'School bags',
        gender: 'UNISEX',
        description: 'Padded shoulder straps, reinforced base, water bottle holders, and 3 zipper compartments.',
        taxCategory: 'VAT_16',
        supplierId: 'sup-04',
        active: true,
        variants: createUniformVariants('acc-bag', 'ACC-BAG-NVY', 'Navy / Black', 750, 1400, ['Standard (25L)'], {
          cbd: 50,
          wst: 35,
          msa: 20,
          ksm: 15,
        }, 10),
        createdAt: now,
        updatedAt: now,
      },
    ];

    // 6. Realistic Sales & Transactions
    const sales: Sale[] = [
      {
        id: 'sale-001',
        receiptNumber: 'RCP-2026-00001',
        branchId: 'branch-nbi-cbd',
        branchName: 'Nairobi CBD Flagship (HQ)',
        cashierId: 'usr-pos-nbi',
        cashierName: 'Faith Muthoni',
        customerId: 'cust-parent-wanjiku',
        customerName: 'Dr. Wanjiku Mwangi (Parent)',
        customerPhone: '+254 722 345 678',
        customerEmail: 'wanjiku.mwangi@gmail.com',
        items: [
          {
            productId: 'prod-kh-skirt',
            variantId: 'var-kh-skirt-28',
            productName: 'Kenya High School Pleated Box Skirt (Sky Blue / Navy)',
            sku: 'KHS-SK-BLU-28',
            school: 'Kenya High School',
            size: '28',
            color: 'Navy / Sky Blue',
            quantity: 2,
            unitPrice: 1350,
            costPrice: 750,
            taxRate: 0.16,
            taxAmount: 372.41,
            discountAmount: 0,
            subtotal: 2327.59,
            total: 2700,
          },
          {
            productId: 'prod-kh-blouse',
            variantId: 'var-kh-blouse-28',
            productName: 'Kenya High School Sky Blue Revere Collar Blouse',
            sku: 'KHS-BL-SKY-28',
            school: 'Kenya High School',
            size: '28',
            color: 'Sky Blue',
            quantity: 3,
            unitPrice: 920,
            costPrice: 520,
            taxRate: 0.16,
            taxAmount: 380.69,
            discountAmount: 0,
            subtotal: 2379.31,
            total: 2760,
          },
          {
            productId: 'prod-gen-socks',
            variantId: 'var-gen-socks-Medium (Shoe 4-7)',
            productName: 'Cotton Rich School Knee-High Socks (3-Pack)',
            sku: 'GEN-SCK-WHT-Medium (Shoe 4-7)',
            school: 'General Uniform',
            size: 'Medium',
            color: 'White / Navy Rib',
            quantity: 2,
            unitPrice: 420,
            costPrice: 180,
            taxRate: 0.16,
            taxAmount: 115.86,
            discountAmount: 0,
            subtotal: 724.14,
            total: 840,
          },
        ],
        subtotal: 5431.04,
        totalTax: 868.96,
        totalDiscount: 0,
        totalAmount: 6300,
        paymentMethod: 'MPESA',
        paymentReference: 'QKJ9283741M',
        amountTendered: 6300,
        changeGiven: 0,
        status: 'COMPLETED',
        kraStatus: 'FISCALIZED',
        cuInvoiceNumber: '013000000000001',
        kraControlCode: 'B48F-72CC-91E0-4491',
        kraQrCodeUrl: 'https://itax.kra.go.ke/KRA-Portal/invoiceChk.htm?actionCode=loadPage&invoiceNo=013000000000001',
        kraSubmissionTimestamp: now,
        createdAt: now,
      },
      {
        id: 'sale-002',
        receiptNumber: 'RCP-2026-00002',
        branchId: 'branch-nbi-west',
        branchName: 'Nairobi Westlands Branch',
        cashierId: 'usr-pos-wst',
        cashierName: 'Brian Kiprop',
        customerName: 'Walk-In Customer (Cash/MPESA)',
        items: [
          {
            productId: 'prod-ns-shirt',
            variantId: 'var-ns-shirt-30',
            productName: 'Nairobi School Official Poplin Shirt (Short Sleeve)',
            sku: 'NS-SH-WHT-30',
            school: 'Nairobi School',
            size: '30',
            color: 'White',
            quantity: 2,
            unitPrice: 950,
            costPrice: 550,
            taxRate: 0.16,
            taxAmount: 262.07,
            discountAmount: 0,
            subtotal: 1637.93,
            total: 1900,
          },
          {
            productId: 'prod-ns-trouser',
            variantId: 'var-ns-trouser-30',
            productName: 'Nairobi School Heavyweight Navy Wool-Blend Trouser',
            sku: 'NS-TR-NVY-30',
            school: 'Nairobi School',
            size: '30',
            color: 'Navy Blue',
            quantity: 1,
            unitPrice: 1450,
            costPrice: 800,
            taxRate: 0.16,
            taxAmount: 200.00,
            discountAmount: 0,
            subtotal: 1250.00,
            total: 1450,
          },
        ],
        subtotal: 2887.93,
        totalTax: 462.07,
        totalDiscount: 0,
        totalAmount: 3350,
        paymentMethod: 'CASH',
        amountTendered: 3500,
        changeGiven: 150,
        status: 'COMPLETED',
        kraStatus: 'FISCALIZED',
        cuInvoiceNumber: '013000000000002',
        kraControlCode: 'C77B-11DA-8291-5502',
        kraQrCodeUrl: 'https://itax.kra.go.ke/KRA-Portal/invoiceChk.htm?actionCode=loadPage&invoiceNo=013000000000002',
        kraSubmissionTimestamp: now,
        createdAt: now,
      },
    ];

    // 7. Quotations
    const quotations: Quotation[] = [
      {
        id: 'quo-001',
        quotationNumber: 'QUO-2026-00001',
        branchId: 'branch-nbi-cbd',
        customerId: 'cust-nairobi-school',
        customerName: 'Nairobi School PTA Association',
        customerEmail: 'pta@nairobischool.ac.ke',
        customerPhone: '+254 20 444 2855',
        schoolOrOrg: 'Nairobi School',
        items: [
          {
            productId: 'prod-ns-blazer',
            variantId: 'var-ns-blazer-32',
            productName: 'Nairobi School Royal Navy Blazer with Braided Crest',
            sku: 'NS-BLZ-NVY-32',
            size: '32',
            quantity: 50,
            unitPrice: 3800,
            taxRate: 0.16,
            taxAmount: 26206.90,
            discountAmount: 10000,
            total: 180000,
          },
          {
            productId: 'prod-ns-sweater',
            variantId: 'var-ns-sweater-32',
            productName: 'Nairobi School V-Neck Knit Sweater with Gold Stripes',
            sku: 'NS-SWT-NVY-32',
            size: '32',
            quantity: 50,
            unitPrice: 1350,
            taxRate: 0.16,
            taxAmount: 9310.34,
            discountAmount: 2500,
            total: 65000,
          },
        ],
        subtotal: 211206.90,
        taxAmount: 35517.24,
        discountAmount: 12500,
        totalAmount: 245000,
        status: 'ACCEPTED',
        validUntil: '2026-11-30',
        terms: 'Payment terms: 50% deposit on order, 50% upon delivery. Prices inclusive of 16% VAT.',
        notes: 'Bulk Form 1 intake replenishment quote.',
        createdBy: 'usr-admin-01',
        createdByName: 'Mercy Chebet',
        createdAt: now,
        updatedAt: now,
      },
    ];

    // 8. Invoices
    const invoices: Invoice[] = [
      {
        id: 'inv-001',
        invoiceNumber: 'INV-2026-00001',
        branchId: 'branch-nbi-cbd',
        branchName: 'Nairobi CBD Flagship (HQ)',
        customerId: 'cust-nairobi-school',
        customerName: 'Nairobi School PTA Association',
        customerEmail: 'pta@nairobischool.ac.ke',
        customerPhone: '+254 20 444 2855',
        customerKraPin: 'P051982736Y',
        items: [
          {
            productId: 'prod-ns-blazer',
            variantId: 'var-ns-blazer-32',
            productName: 'Nairobi School Royal Navy Blazer with Braided Crest',
            sku: 'NS-BLZ-NVY-32',
            size: '32',
            quantity: 50,
            unitPrice: 3800,
            taxRate: 0.16,
            taxAmount: 26206.90,
            discountAmount: 10000,
            total: 180000,
          },
          {
            productId: 'prod-ns-sweater',
            variantId: 'var-ns-sweater-32',
            productName: 'Nairobi School V-Neck Knit Sweater with Gold Stripes',
            sku: 'NS-SWT-NVY-32',
            size: '32',
            quantity: 50,
            unitPrice: 1350,
            taxRate: 0.16,
            taxAmount: 9310.34,
            discountAmount: 2500,
            total: 65000,
          },
        ],
        subtotal: 211206.90,
        taxAmount: 35517.24,
        discountAmount: 12500,
        totalAmount: 245000,
        amountPaid: 120000,
        balanceDue: 125000,
        status: 'PARTIALLY_PAID',
        dueDate: '2026-10-25',
        paymentTerms: 'Net 30 Days',
        notes: 'Converted from Quotation QUO-2026-00001 for Form 1 intake batch.',
        kraStatus: 'FISCALIZED',
        cuInvoiceNumber: '013000000000003',
        kraControlCode: 'D90A-55CC-7112-9901',
        kraQrCodeUrl: 'https://itax.kra.go.ke/KRA-Portal/invoiceChk.htm?actionCode=loadPage&invoiceNo=013000000000003',
        createdBy: 'usr-acc-01',
        createdByName: 'David Omondi',
        createdAt: now,
        updatedAt: now,
      },
    ];

    // 9. Payment Receipts
    const receipts: PaymentReceipt[] = [
      {
        id: 'rcp-001',
        receiptNumber: 'RCP-2026-00001',
        saleId: 'sale-001',
        branchId: 'branch-nbi-cbd',
        branchName: 'Nairobi CBD Flagship (HQ)',
        customerId: 'cust-parent-wanjiku',
        customerName: 'Dr. Wanjiku Mwangi (Parent)',
        amount: 6300,
        paymentMethod: 'MPESA',
        paymentReference: 'QKJ9283741M',
        notes: 'POS Sale Walk-in retail checkout',
        receivedBy: 'usr-pos-nbi',
        receivedByName: 'Faith Muthoni',
        cuNumber: '013000000000001',
        kraQrCodeUrl: 'https://itax.kra.go.ke/KRA-Portal/invoiceChk.htm?actionCode=loadPage&invoiceNo=013000000000001',
        createdAt: now,
      },
      {
        id: 'rcp-002',
        receiptNumber: 'RCP-2026-00003',
        invoiceId: 'inv-001',
        branchId: 'branch-nbi-cbd',
        branchName: 'Nairobi CBD Flagship (HQ)',
        customerId: 'cust-nairobi-school',
        customerName: 'Nairobi School PTA Association',
        amount: 120000,
        paymentMethod: 'BANK_TRANSFER',
        paymentReference: 'EFT-88492019',
        notes: '50% Initial deposit payment against invoice INV-2026-00001',
        receivedBy: 'usr-acc-01',
        receivedByName: 'David Omondi',
        cuNumber: '013000000000004',
        kraQrCodeUrl: 'https://itax.kra.go.ke/KRA-Portal/invoiceChk.htm?actionCode=loadPage&invoiceNo=013000000000004',
        createdAt: now,
      },
    ];

    // 10. Purchases & Goods Received
    const purchases: PurchaseOrder[] = [
      {
        id: 'po-001',
        poNumber: 'PO-2026-00001',
        supplierId: 'sup-01',
        supplierName: 'Rivatex East Africa Ltd',
        branchId: 'branch-nbi-cbd',
        branchName: 'Nairobi CBD Flagship (HQ)',
        items: [
          {
            productId: 'prod-ns-trouser',
            variantId: 'var-ns-trouser-30',
            productName: 'Nairobi School Heavyweight Navy Wool-Blend Trouser',
            sku: 'NS-TR-NVY-30',
            size: '30',
            quantityOrdered: 50,
            quantityReceived: 50,
            unitCost: 800,
            taxAmount: 6400,
            totalCost: 46400,
          },
          {
            productId: 'prod-ns-blazer',
            variantId: 'var-ns-blazer-32',
            productName: 'Nairobi School Royal Navy Blazer with Braided Crest',
            sku: 'NS-BLZ-NVY-32',
            size: '32',
            quantityOrdered: 40,
            quantityReceived: 40,
            unitCost: 2200,
            taxAmount: 14080,
            totalCost: 102080,
          },
        ],
        subtotal: 128000,
        taxAmount: 20480,
        totalAmount: 148480,
        amountPaid: 148480,
        status: 'RECEIVED',
        expectedDate: '2026-10-15',
        notes: 'Pre-season restocking order.',
        receivedAt: now,
        createdBy: 'usr-admin-01',
        createdByName: 'Mercy Chebet',
        createdAt: now,
        updatedAt: now,
      },
    ];

    // 11. Expenses
    const expenses: Expense[] = [
      {
        id: 'exp-001',
        expenseNumber: 'EXP-2026-00001',
        branchId: 'branch-nbi-cbd',
        branchName: 'Nairobi CBD Flagship (HQ)',
        category: 'RENT',
        title: 'Monthly Store Rent - Biashara St Flagship',
        description: 'Payment to Biashara Plaza Management for October 2026 occupancy.',
        amount: 85000,
        paymentMethod: 'BANK_TRANSFER',
        paymentReference: 'RENT-OCT-2026',
        incurredDate: '2026-10-01',
        recordedBy: 'usr-acc-01',
        recordedByName: 'David Omondi',
        createdAt: now,
      },
      {
        id: 'exp-002',
        expenseNumber: 'EXP-2026-00002',
        branchId: 'branch-nbi-west',
        branchName: 'Nairobi Westlands Branch',
        category: 'UTILITIES',
        title: 'Kenya Power Electricity & Internet Bills',
        description: 'Monthly utility settlement for Sarit Centre branch.',
        amount: 14800,
        paymentMethod: 'MPESA',
        paymentReference: 'KPLC-9948201',
        incurredDate: '2026-10-02',
        recordedBy: 'usr-acc-01',
        recordedByName: 'David Omondi',
        createdAt: now,
      },
    ];

    // 12. Stock Transfers
    const stockTransfers: StockTransfer[] = [
      {
        id: 'trf-001',
        transferNumber: 'TRF-2026-00001',
        sourceBranchId: 'branch-nbi-cbd',
        sourceBranchName: 'Nairobi CBD Flagship (HQ)',
        destBranchId: 'branch-msa-nyl',
        destBranchName: 'Mombasa Nyali Branch',
        items: [
          {
            productId: 'prod-kh-skirt',
            variantId: 'var-kh-skirt-28',
            productName: 'Kenya High School Pleated Box Skirt (Sky Blue / Navy)',
            sku: 'KHS-SK-BLU-28',
            size: '28',
            quantity: 10,
          },
          {
            productId: 'prod-gen-socks',
            variantId: 'var-gen-socks-Medium (Shoe 4-7)',
            productName: 'Cotton Rich School Knee-High Socks (3-Pack)',
            sku: 'GEN-SCK-WHT-Medium (Shoe 4-7)',
            size: 'Medium',
            quantity: 20,
          },
        ],
        status: 'RECEIVED',
        notes: 'Urgent transfer to restock Mombasa Nyali branch for coastal term rush.',
        initiatedBy: 'usr-admin-01',
        initiatedByName: 'Mercy Chebet',
        dispatchedAt: now,
        receivedBy: 'usr-pos-msa',
        receivedByName: 'Amina Salim',
        receivedAt: now,
        createdAt: now,
      },
    ];

    // 13. System Settings
    const settings: SystemSettings = {
      companyName: 'Naisia Textiles',
      companyDomain: 'naisiaetextiles.com',
      logoUrl: 'https://plain-eeur-prod-public.komododecks.com/202605/07/1sm3ITZIdJmYjyTcxmiP/image.png',
      companyEmail: 'support@naisiaetextiles.com',
      companyPhone: '0792021496 / 0112264870',
      companyAddress: 'Naisia Textiles Complex, Biashara Street, P.O. Box 48291-00100 Nairobi, Kenya',
      kraPin: 'P051839281Z',
      currency: 'KES',
      taxRateStandard: 0.16,
      taxRateZero: 0.00,
      invoicePrefix: 'INV',
      receiptPrefix: 'RCP',
      quotationPrefix: 'QUO',
      poPrefix: 'PO',
      transferPrefix: 'TRF',
      kraTraderCode: 'NAISIAE-OSCU-01',
      kraOscuSerial: 'KRA-ETIMS-KE-2026-9921',
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
}

export const db = new DatabaseEngine();
