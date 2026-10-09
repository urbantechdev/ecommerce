export type UserRole = 'ADMIN' | 'ACCOUNTANT' | 'STAFF';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  branchId: string;
  branchName?: string;
  phone?: string;
  pin?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
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

export type InventorySectorId =
  | 'PRE_PRIMARY'
  | 'PRIMARY'
  | 'JUNIOR_SECONDARY'
  | 'SECONDARY'
  | 'COLLEGE_UNIVERSITY'
  | 'SERVICE_PROFESSIONAL'
  | 'ACCESSORIES';

export type SkuImageCategory =
  | 'FRONT'
  | 'BACK'
  | 'FABRIC'
  | 'BADGE'
  | 'SIZE_CHART'
  | 'PACKAGING'
  | 'OTHER';

export interface ProductVariant {
  id: string;
  sku: string;
  barcode: string;
  size: string;
  color: string;
  costPrice: number;
  sellingPrice: number;
  branchStock: Record<string, number>;
  reorderLevel: number;
  reorderQuantity: number;
  imageUrl?: string;
  imageCategory?: SkuImageCategory | string;
}

export interface Product {
  id: string;
  name: string;
  school: string;
  sector?: InventorySectorId;
  institutionType?: string;
  professionalDomain?: string;
  garmentType?: string;
  category: string;
  gender: 'BOYS' | 'GIRLS' | 'UNISEX';
  description: string;
  taxCategory: 'VAT_16' | 'ZERO_RATED' | 'EXEMPT';
  supplierId?: string;
  imageUrl?: string;
  imageCategory?: SkuImageCategory | string;
  active: boolean;
  variants: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  productId: string;
  productName: string;
  school: string;
  sector?: InventorySectorId;
  institutionType?: string;
  professionalDomain?: string;
  garmentType?: string;
  category: string;
  variantId: string;
  sku: string;
  barcode: string;
  size: string;
  color: string;
  branchId: string;
  branchName: string;
  currentStock: number;
  reorderLevel: number;
  reorderQuantity: number;
  isLow: boolean;
  costPrice: number;
  sellingPrice: number;
  imageUrl?: string;
  imageCategory?: SkuImageCategory | string;
  totalValuationCost: number;
  totalValuationRetail: number;
}

export interface StockTransferItem {
  productId: string;
  variantId: string;
  productName: string;
  sku: string;
  size: string;
  quantity: number;
}

export interface StockTransfer {
  id: string;
  transferNumber: string;
  sourceBranchId: string;
  sourceBranchName: string;
  destBranchId: string;
  destBranchName: string;
  items: StockTransferItem[];
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
  taxRate: number;
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
  paymentReference?: string;
  amountTendered: number;
  changeGiven: number;
  status: 'COMPLETED' | 'REFUNDED' | 'VOIDED';
  refundReason?: string;
  kraStatus: 'FISCALIZED' | 'PENDING' | 'FAILED';
  cuInvoiceNumber?: string;
  kraControlCode?: string;
  kraQrCodeUrl?: string;
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
  kraStatus: 'FISCALIZED' | 'PENDING' | 'FAILED';
  cuInvoiceNumber?: string;
  kraControlCode?: string;
  kraQrCodeUrl?: string;
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
  action: string;
  entityType: string;
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
  taxRateStandard: number;
  taxRateZero: number;
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

export interface DashboardMetrics {
  todaySales: number;
  totalSalesRevenue: number;
  totalCogs: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  totalInventoryValuationCost: number;
  totalInventoryValuationRetail: number;
  lowStockCount: number;
  outstandingInvoicesAmount: number;
  branchPerformance: {
    branchId: string;
    branchName: string;
    totalSales: number;
  }[];
  recentSales: Sale[];
  pendingRetryKraCount: number;
}
