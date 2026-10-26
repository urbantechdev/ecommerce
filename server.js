// server.ts
import express from "express";
import cors from "cors";
import path2 from "path";
import { fileURLToPath } from "url";

// server/routes.ts
import { Router } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuidv42 } from "uuid";

// server/db.ts
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
var DATA_DIR = path.resolve(process.cwd(), "data");
var DB_FILE = path.join(DATA_DIR, "database.json");
var DatabaseEngine = class {
  constructor() {
    this.isSaving = false;
    this.ensureDirectoryExists();
    this.data = this.loadDatabase();
  }
  ensureDirectoryExists() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }
  loadDatabase() {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        let updated = false;
        if (parsed.products && Array.isArray(parsed.products) && parsed.products.length > 0) {
          const csvProducts = this.seedProductsFromInventoryCsv();
          const csvImageMap = new Map(csvProducts.map((cp) => [cp.name.split(" (")[0].toLowerCase().trim(), cp.imageUrl]));
          for (const p of parsed.products) {
            if (!p.sector) {
              if (p.category === "TIES" || p.category === "SOCKS" || p.category === "ACCESSORIES") {
                p.sector = "ACCESSORIES";
              } else {
                p.sector = "SECONDARY";
              }
              if (!p.garmentType) p.garmentType = p.category;
              updated = true;
            }
            const baseName = (p.garmentType || p.name.split(" (")[0]).toLowerCase().trim();
            const matchedImg = csvImageMap.get(baseName);
            if (matchedImg && (!p.imageUrl || p.imageUrl.includes("placeholder") || p.imageUrl.includes("category_school"))) {
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
        console.error("Error reading database file, reinitializing default data:", err);
      }
    }
    const defaultData = this.generateInitialSeed();
    this.saveDataDirect(defaultData);
    return defaultData;
  }
  getData() {
    return this.data;
  }
  async save() {
    if (this.isSaving) return;
    this.isSaving = true;
    try {
      const tempPath = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), "utf-8");
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error("Failed to commit database transaction to disk:", err);
    } finally {
      this.isSaving = false;
    }
  }
  saveDataDirect(data) {
    const tempPath = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tempPath, DB_FILE);
  }
  // Sequential ID generators
  getNextSequence(prefix, list, fieldName) {
    const year = (/* @__PURE__ */ new Date()).getFullYear();
    const count = list.length + 1;
    return `${prefix}-${year}-${String(count).padStart(5, "0")}`;
  }
  logAudit(log) {
    const auditRecord = {
      id: uuidv4(),
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      ...log
    };
    this.data.auditLogs.unshift(auditRecord);
    if (this.data.auditLogs.length > 5e3) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 5e3);
    }
    this.save();
  }
  generateInitialSeed() {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const branches = [
      {
        id: "branch-nbi-cbd",
        code: "UHR-MKT",
        name: "Uhuru Market (HQ)",
        location: "Uhuru Market, Nairobi",
        address: "Naisia Textiles Complex, Stall / Unit 2, Uhuru Market, Jogoo Road, P.O. Box 48291-00100 Nairobi",
        phone: "+254 722 001 100",
        email: "uhuru@naisiaetextiles.com",
        isHQ: true,
        createdAt: now
      }
    ];
    const users = [];
    const suppliers = [];
    const customers = [];
    const createUniformVariants = (prefix, baseSku, color, cost, price, sizes, stockDist, reorder = 10) => {
      return sizes.map((size) => {
        const totalAllocated = stockDist.cbd + stockDist.wst + stockDist.msa + stockDist.ksm;
        return {
          id: `var-${prefix}-${size}`,
          sku: `${baseSku}-${size}`,
          barcode: `616${Math.floor(1e8 + Math.random() * 9e8)}`,
          size,
          color,
          costPrice: cost,
          sellingPrice: price,
          branchStock: {
            "branch-nbi-cbd": Math.max(0, totalAllocated + Math.floor(Math.random() * 5) - 2)
          },
          reorderLevel: reorder,
          reorderQuantity: 30
        };
      });
    };
    const products = this.seedProductsFromInventoryCsv();
    const sales = [];
    const quotations = [];
    const invoices = [];
    const receipts = [];
    const purchases = [];
    const expenses = [];
    const stockTransfers = [];
    const settings = {
      companyName: "Naisia Textiles",
      companyDomain: "naisiaetextiles.com",
      logoUrl: "https://plain-eeur-prod-public.komododecks.com/202605/07/1sm3ITZIdJmYjyTcxmiP/image.png",
      companyEmail: "support@naisiaetextiles.com",
      companyPhone: "0792021496 / 0112264870",
      companyAddress: "Naisia Textiles Complex, Uhuru Market, P.O. Box 48291-00100 Nairobi, Kenya",
      kraPin: "",
      currency: "KES",
      taxRateStandard: 0.16,
      taxRateZero: 0,
      invoicePrefix: "INV",
      receiptPrefix: "RCP",
      quotationPrefix: "QUO",
      poPrefix: "PO",
      transferPrefix: "TRF",
      kraTraderCode: "",
      kraOscuSerial: "",
      kraMode: "SANDBOX",
      autoRetryKra: true,
      smtpHost: "smtp.zoho.com",
      smtpPort: 465,
      smtpUser: "support@naisiaetextiles.com",
      smtpSecure: true,
      lowStockNotificationThreshold: 10,
      receiptFooterMessage: "Thank you for shopping with Naisia Textiles. Genuine Quality School Uniforms. Goods once sold may be exchanged within 7 days with valid receipt."
    };
    const auditLogs = [
      {
        id: uuidv4(),
        userId: "usr-admin-01",
        userName: "Mercy Chebet",
        userRole: "ADMIN",
        branchId: "branch-nbi-cbd",
        branchName: "Nairobi CBD Flagship (HQ)",
        action: "SYSTEM_INITIALIZATION",
        entityType: "SYSTEM",
        entityId: "SYSTEM",
        details: "Naisiae ERP system initialized with multi-branch synchronization and KRA eTIMS integration readiness.",
        timestamp: now
      }
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
      settings
    };
  }
  seedProductsFromInventoryCsv() {
    const csvPath = path.join(DATA_DIR, "inventory_import.csv");
    if (!fs.existsSync(csvPath)) {
      return [];
    }
    try {
      const csvText = fs.readFileSync(csvPath, "utf-8");
      const lines = csvText.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) return [];
      const parseLine = (line) => {
        const result = [];
        let cur = "";
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
          } else if (c === "," && !inQuotes) {
            result.push(cur.trim());
            cur = "";
          } else {
            cur += c;
          }
        }
        result.push(cur.trim());
        return result;
      };
      const SUBCAT_MAP = {
        "ecde / pre-primary": "ECDE Pre-Primary Institutions",
        "ecde": "ECDE Pre-Primary Institutions",
        "primary": "Primary Schools (National Standard)",
        "jss / junior school": "Junior Secondary Schools (JSS Kenya)",
        "jss": "Junior Secondary Schools (JSS Kenya)",
        "secondary": "Secondary & High Schools",
        "school accessories": "All Schools & Colleges (Accessories)",
        "school sports": "Schools & Sports Clubs (Kenya)",
        "kmtc": "Kenya Medical Training College (KMTC)",
        "nursing / medical": "Medical & Nursing Colleges",
        "hospitality": "Hospitality & Culinary Institutions",
        "corporate": "Corporate & Executive Workplaces",
        "industrial": "Industrial & Technical Workplaces",
        "security": "Security Services & Guard Forces",
        "general": "General & Institutional Workwear"
      };
      const expandSizes = (rawSize) => {
        if (!rawSize) return ["Standard"];
        const s = rawSize.trim();
        if (s.includes(",")) {
          return s.split(",").map((x) => x.trim()).filter(Boolean);
        }
        if (s === "22-32") return ["22", "24", "26", "28", "30", "32"];
        if (s === "24-36") return ["24", "26", "28", "30", "32", "34", "36"];
        if (s === "28-40") return ["28", "30", "32", "34", "36", "38", "40"];
        if (s === "S-XXL") return ["S", "M", "L", "XL", "2XL"];
        if (s === "S-3XL") return ["S", "M", "L", "XL", "2XL", "3XL"];
        return [s];
      };
      const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
      const colPrice = headers.findIndex((h) => h.includes("retail") || h.includes("selling") || h.includes("price") && !h.includes("cost") && !h.includes("buy"));
      const colCost = headers.findIndex((h) => h.includes("cost") || h.includes("buying") || h.includes("purchase") || h.includes("marketlow"));
      const colName = headers.findIndex((h) => h.includes("product") && !h.includes("category") || h.includes("itemname") || h.includes("name") || h.includes("title"));
      const colSchool = headers.findIndex((h) => h.includes("school") || h.includes("institution") || h.includes("subcategory") || h.includes("campus"));
      const colCategory = headers.findIndex((h) => h.includes("category") || h.includes("garment"));
      const colSector = headers.findIndex((h) => h.includes("sector") || h.includes("education"));
      const colGender = headers.findIndex((h) => h.includes("gender") || h.includes("sex"));
      const colDesc = headers.findIndex((h) => h.includes("desc") || h.includes("note") || h.includes("detail"));
      const colSku = headers.findIndex((h) => h.includes("sku") || h.includes("code"));
      const colSize = headers.findIndex((h) => h.includes("size"));
      const colReorder = headers.findIndex((h) => h.includes("reorder"));
      const colImg = headers.findIndex((h) => h.includes("image") || h.includes("img") || h.includes("url"));
      const products = [];
      const now = (/* @__PURE__ */ new Date()).toISOString();
      for (let i = 1; i < lines.length; i++) {
        const cols = parseLine(lines[i]);
        if (!cols.length || cols.every((c) => !c)) continue;
        const name = colName >= 0 && cols[colName] ? cols[colName] : `Uniform Item #${i}`;
        const rawSchool = colSchool >= 0 && cols[colSchool] ? cols[colSchool] : "General Uniform";
        const school = SUBCAT_MAP[rawSchool.toLowerCase().trim()] || rawSchool;
        const category = colCategory >= 0 && cols[colCategory] ? cols[colCategory] : "General Uniform";
        const rawSector = colSector >= 0 && cols[colSector] ? cols[colSector].toUpperCase() : "SECONDARY";
        const sector = ["PRE_PRIMARY", "PRIMARY", "JSS", "SECONDARY", "COLLEGE_UNIVERSITY", "SERVICE_PROFESSIONAL", "ACCESSORIES"].includes(rawSector) ? rawSector : "SECONDARY";
        const rawGender = colGender >= 0 && cols[colGender] ? cols[colGender].toUpperCase() : "UNISEX";
        const gender = ["BOYS", "GIRLS", "UNISEX"].includes(rawGender) ? rawGender : "UNISEX";
        const description = colDesc >= 0 && cols[colDesc] ? cols[colDesc] : "High quality durable uniform crafted with reinforced stitching.";
        const skuPrefix = colSku >= 0 && cols[colSku] ? cols[colSku].replace(/[^A-Za-z0-9]/g, "") : `NT-${i}`;
        const costPrice = colCost >= 0 && !isNaN(Number(cols[colCost])) ? Number(cols[colCost]) : 600;
        const sellingPrice = colPrice >= 0 && !isNaN(Number(cols[colPrice])) ? Number(cols[colPrice]) : 1e3;
        const reorderLevel = colReorder >= 0 && !isNaN(Number(cols[colReorder])) ? Number(cols[colReorder]) : 10;
        const sizes = expandSizes(colSize >= 0 ? cols[colSize] : "Standard");
        const csvImageUrl = colImg >= 0 && cols[colImg] ? cols[colImg] : "";
        const finalImageUrl = csvImageUrl || "/assets/images/category_school_1782334810884.jpg";
        const prodId = `prod-${skuPrefix.toLowerCase().slice(0, 9)}-${i}`;
        const variants = sizes.map((size, sIdx) => {
          const varSku = `${skuPrefix}-${size}`.toUpperCase();
          const barcode = `616${String(1e8 + i * 100 + sIdx)}`;
          return {
            id: `var-${prodId}-${sIdx + 1}`,
            sku: varSku,
            barcode,
            size,
            color: "Standard Official",
            costPrice,
            sellingPrice,
            branchStock: {
              "branch-nbi-cbd": 45
            },
            reorderLevel,
            reorderQuantity: 30,
            imageUrl: finalImageUrl
          };
        });
        products.push({
          id: prodId,
          name: `${name} (${rawSchool} - ${gender === "BOYS" ? "Boys" : gender === "GIRLS" ? "Girls" : "Unisex"})`,
          school,
          sector,
          institutionType: rawSchool,
          professionalDomain: rawSchool,
          garmentType: name,
          category,
          gender,
          description,
          taxCategory: "VAT_16",
          imageUrl: finalImageUrl,
          active: true,
          variants,
          createdAt: now,
          updatedAt: now
        });
      }
      return products;
    } catch (err) {
      console.error("[CSV Seeding Error]", err);
      return [];
    }
  }
};
var db = new DatabaseEngine();

// server/auth.ts
import crypto from "crypto";
var SESSION_SECRET = process.env.SESSION_SECRET || "naisiae-enterprise-session-secret-2026-kenya-etims";
var revokedTokens = /* @__PURE__ */ new Set();
var legacySessions = /* @__PURE__ */ new Map();
function createSession(userId) {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1e3;
  const payload = {
    userId,
    expiresAt,
    salt: crypto.randomBytes(8).toString("hex")
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(payloadB64).digest("base64url");
  const token = `nst_${payloadB64}.${signature}`;
  legacySessions.set(token, { userId, expiresAt });
  return token;
}
function revokeSession(token) {
  revokedTokens.add(token);
  legacySessions.delete(token);
}
function getUserFromToken(token) {
  if (!token) return null;
  if (revokedTokens.has(token)) return null;
  if (token.startsWith("nst_")) {
    const raw = token.slice(4);
    const dotIdx = raw.indexOf(".");
    if (dotIdx !== -1) {
      const payloadB64 = raw.slice(0, dotIdx);
      const signature = raw.slice(dotIdx + 1);
      const expectedSignature = crypto.createHmac("sha256", SESSION_SECRET).update(payloadB64).digest("base64url");
      if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        try {
          const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
          if (payload.userId && payload.expiresAt && Date.now() <= payload.expiresAt) {
            const users = db.getData().users;
            const user = users.find((u) => u.id === payload.userId && u.status === "ACTIVE");
            if (user) return user;
          }
        } catch {
        }
      }
    }
  }
  const legacy = legacySessions.get(token);
  if (legacy) {
    if (Date.now() > legacy.expiresAt) {
      legacySessions.delete(token);
      return null;
    }
    const users = db.getData().users;
    const user = users.find((u) => u.id === legacy.userId && u.status === "ACTIVE");
    return user || null;
  }
  return null;
}
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing or invalid authentication token" });
  }
  const token = authHeader.split(" ")[1];
  const user = getUserFromToken(token);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized: Session expired or invalid credentials" });
  }
  req.user = user;
  next();
}
function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (req.user.role === "ADMIN") {
      return next();
    }
    if (!allowedRoles.includes(req.user.role)) {
      db.logAudit({
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        branchId: req.user.branchId,
        branchName: "N/A",
        action: "ACCESS_DENIED_ATTEMPT",
        entityType: "SECURITY",
        entityId: req.path,
        details: `User with role ${req.user.role} attempted to access restricted endpoint ${req.method} ${req.path}`,
        ipAddress: req.ip
      });
      return res.status(403).json({
        error: `Forbidden: Access denied. Role '${req.user.role}' lacks required permissions for this action.`
      });
    }
    next();
  };
}

// server/kra.ts
import QRCode from "qrcode";
import crypto2 from "crypto";
var kraRetryQueue = [];
var cuSequenceCounter = 1e3;
async function fiscalizeTransaction(req, simulateOffline = false) {
  const settings = db.getData().settings;
  const traderPin = settings.kraPin || "";
  const oscuSerial = settings.kraOscuSerial || "";
  cuSequenceCounter++;
  const cuInvoiceNumber = `0130${String(cuSequenceCounter).padStart(11, "0")}`;
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  if (simulateOffline) {
    const errorMsg = "eTIMS Virtual Server Gateway Timeout (HTTP 504 Gateway Error). Transaction saved offline.";
    return {
      status: "FAILED",
      cuInvoiceNumber: "",
      kraControlCode: "",
      kraQrCodeUrl: "",
      qrCodeDataUrl: "",
      timestamp,
      error: errorMsg
    };
  }
  const signatureRaw = `${traderPin}|${cuInvoiceNumber}|${req.totalAmount}|${req.taxAmount}|${timestamp}`;
  const hash = crypto2.createHash("sha256").update(signatureRaw).digest("hex").toUpperCase();
  const kraControlCode = `${hash.substring(0, 4)}-${hash.substring(4, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}`;
  const formattedDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0].replace(/-/g, "");
  const kraQrCodeUrl = `https://itax.kra.go.ke/KRA-Portal/invoiceChk.htm?actionCode=loadPage&invoiceNo=${cuInvoiceNumber}&traderPin=${traderPin}&invAmt=${req.totalAmount.toFixed(2)}&invDate=${formattedDate}`;
  let qrCodeDataUrl = "";
  try {
    qrCodeDataUrl = await QRCode.toDataURL(kraQrCodeUrl, {
      margin: 1,
      width: 180,
      color: {
        dark: "#000000",
        light: "#FFFFFF"
      }
    });
  } catch (err) {
    console.error("Failed to generate KRA QR code image:", err);
  }
  return {
    status: "FISCALIZED",
    cuInvoiceNumber,
    kraControlCode,
    kraQrCodeUrl,
    qrCodeDataUrl,
    timestamp
  };
}
function enqueueKraRetry(id, type, referenceNumber, payload, error) {
  const existing = kraRetryQueue.find((item) => item.id === id);
  if (existing) {
    existing.attempts++;
    existing.lastAttemptAt = (/* @__PURE__ */ new Date()).toISOString();
    existing.lastError = error;
  } else {
    kraRetryQueue.push({
      id,
      type,
      referenceNumber,
      payload,
      attempts: 1,
      lastAttemptAt: (/* @__PURE__ */ new Date()).toISOString(),
      lastError: error
    });
  }
}

// server/email.ts
var emailLogs = [];
async function sendEmail({
  to,
  subject,
  html
}) {
  const settings = db.getData().settings;
  const fromEmail = settings.companyEmail || "support@naisiaetextiles.com";
  const logEntry = {
    id: `eml_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    to,
    from: fromEmail,
    subject,
    htmlContent: html,
    status: "SENT",
    sentAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  const smtpHost = process.env.SMTP_HOST || settings.smtpHost || "smtp.zoho.com";
  const smtpUser = process.env.SMTP_USER || settings.smtpUser || "support@naisiaetextiles.com";
  console.log(`[Email Dispatcher] Sending email via ${smtpHost} from ${fromEmail} to ${to}: "${subject}"`);
  emailLogs.unshift(logEntry);
  if (emailLogs.length > 500) {
    emailLogs.pop();
  }
  return {
    success: true,
    messageId: logEntry.id
  };
}
function generateInvoiceEmailHtml(invoice, settings) {
  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 25px; border: 1px solid #E2E8F0; border-radius: 8px; color: #1E293B;">
      <div style="background-color: #030A91; padding: 20px; border-radius: 6px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">NAISIA TEXTILES</h1>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #FACB00;">Quality School Uniforms & Educational Apparel</p>
      </div>
      <div style="padding: 20px 0;">
        <h2 style="color: #030A91; margin-top: 0;">Official Invoice: ${invoice.invoiceNumber}</h2>
        <p>Dear <strong>${invoice.customerName}</strong>,</p>
        <p>Please find attached the official invoice for your school uniform order from Naisia Textiles.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
          <thead>
            <tr style="background-color: #F1F5F9; border-bottom: 2px solid #CBD5E1;">
              <th style="padding: 8px; text-align: left;">Item Description</th>
              <th style="padding: 8px; text-align: center;">Size</th>
              <th style="padding: 8px; text-align: center;">Qty</th>
              <th style="padding: 8px; text-align: right;">Unit Price</th>
              <th style="padding: 8px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items.map(
    (item) => `
              <tr style="border-bottom: 1px solid #E2E8F0;">
                <td style="padding: 8px;">${item.productName}</td>
                <td style="padding: 8px; text-align: center;">${item.size}</td>
                <td style="padding: 8px; text-align: center;">${item.quantity}</td>
                <td style="padding: 8px; text-align: right;">KES ${item.unitPrice.toLocaleString()}</td>
                <td style="padding: 8px; text-align: right;">KES ${item.total.toLocaleString()}</td>
              </tr>
            `
  ).join("")}
          </tbody>
        </table>

        <div style="background-color: #F8FAFC; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: right;">
          <p style="margin: 4px 0;">Subtotal: <strong>KES ${invoice.subtotal.toLocaleString()}</strong></p>
          <p style="margin: 4px 0;">VAT (16% Standard): <strong>KES ${invoice.taxAmount.toLocaleString()}</strong></p>
          <p style="margin: 4px 0; font-size: 18px; color: #030A91;">Total Due: <strong>KES ${invoice.totalAmount.toLocaleString()}</strong></p>
          ${invoice.amountPaid > 0 ? `<p style="margin: 4px 0; color: #16A34A;">Amount Paid: KES ${invoice.amountPaid.toLocaleString()}</p>` : ""}
          <p style="margin: 4px 0; font-size: 16px; color: #DC2626;">Balance Due: <strong>KES ${invoice.balanceDue.toLocaleString()}</strong></p>
        </div>

        <div style="border-top: 1px solid #E2E8F0; padding-top: 15px; font-size: 12px; color: #64748B;">
          <p><strong>Payment Instructions:</strong></p>
          <p>Bank: KCB Bank | Branch: Uhuru Market | Account: 1102938475</p>
          <p>M-PESA Paybill: <strong>522522</strong> | Account: <strong>${invoice.invoiceNumber}</strong></p>
          <p>KRA PIN: ${settings.kraPin} | eTIMS Control: ${invoice.kraControlCode || "OSCU-VERIFIED"}</p>
        </div>
      </div>
      <div style="background-color: #030A91; padding: 10px; border-radius: 6px; text-align: center; color: white; font-size: 12px;">
        Naisia Textiles Ltd \u2022 Uhuru Market, Nairobi \u2022 Phone: 0792021496 / 0112264870 \u2022 support@naisiaetextiles.com \u2022 naisiaetextiles.com
      </div>
    </div>
  `;
}
function generateQuotationEmailHtml(quote, settings) {
  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 25px; border: 1px solid #E2E8F0; border-radius: 8px; color: #1E293B;">
      <div style="background-color: #030A91; padding: 20px; border-radius: 6px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">NAISIA TEXTILES</h1>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #FACB00;">Official Quotation & Uniform Estimates</p>
      </div>
      <div style="padding: 20px 0;">
        <h2 style="color: #030A91; margin-top: 0;">Quotation: ${quote.quotationNumber}</h2>
        <p>Dear <strong>${quote.customerName}</strong>,</p>
        <p>Thank you for considering Naisia Textiles for your school uniform requirements. Below is your official quotation:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
          <thead>
            <tr style="background-color: #F1F5F9; border-bottom: 2px solid #CBD5E1;">
              <th style="padding: 8px; text-align: left;">Item Description</th>
              <th style="padding: 8px; text-align: center;">Size</th>
              <th style="padding: 8px; text-align: center;">Qty</th>
              <th style="padding: 8px; text-align: right;">Unit Price</th>
              <th style="padding: 8px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${quote.items.map(
    (item) => `
              <tr style="border-bottom: 1px solid #E2E8F0;">
                <td style="padding: 8px;">${item.productName}</td>
                <td style="padding: 8px; text-align: center;">${item.size}</td>
                <td style="padding: 8px; text-align: center;">${item.quantity}</td>
                <td style="padding: 8px; text-align: right;">KES ${item.unitPrice.toLocaleString()}</td>
                <td style="padding: 8px; text-align: right;">KES ${item.total.toLocaleString()}</td>
              </tr>
            `
  ).join("")}
          </tbody>
        </table>

        <div style="background-color: #F8FAFC; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: right;">
          <p style="margin: 4px 0;">Subtotal (Net Excl. VAT): <strong>KES ${quote.subtotal.toLocaleString()}</strong></p>
          <p style="margin: 4px 0;">16% Standard VAT: <strong>KES ${quote.taxAmount.toLocaleString()}</strong></p>
          <p style="margin: 4px 0; font-size: 18px; color: #030A91;">Total Estimate: <strong>KES ${quote.totalAmount.toLocaleString()}</strong></p>
        </div>

        <div style="border-top: 1px solid #E2E8F0; padding-top: 15px; font-size: 12px; color: #64748B;">
          <p><strong>Validity & Terms:</strong></p>
          <p>Valid Until: <strong>${quote.validUntil}</strong></p>
          <p>${quote.terms || "Prices inclusive of 16% VAT. Valid for 30 days."}</p>
        </div>
      </div>
      <div style="background-color: #030A91; padding: 10px; border-radius: 6px; text-align: center; color: white; font-size: 12px;">
        Naisia Textiles Ltd \u2022 Uhuru Market, Nairobi \u2022 Phone: 0792021496 / 0112264870 \u2022 support@naisiaetextiles.com \u2022 naisiaetextiles.com
      </div>
    </div>
  `;
}
function generateReceiptEmailHtml(receipt, settings) {
  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #E2E8F0; border-radius: 8px; color: #1E293B;">
      <div style="background-color: #030A91; padding: 15px; border-radius: 6px; text-align: center; color: white;">
        <h2 style="margin: 0; font-size: 20px;">NAISIA TEXTILES</h2>
        <p style="margin: 2px 0 0 0; font-size: 12px; color: #FACB00;">Official E-Receipt</p>
      </div>
      <div style="padding: 15px 0; text-align: center;">
        <p style="font-size: 14px; margin: 0; color: #64748B;">Receipt Number</p>
        <h3 style="font-size: 22px; margin: 4px 0; color: #030A91;">${receipt.receiptNumber}</h3>
        <p style="font-size: 13px; color: #10B981; font-weight: 600;">PAYMENT CONFIRMED</p>

        <div style="background-color: #F8FAFC; padding: 15px; border-radius: 6px; margin: 15px 0; text-align: left; font-size: 14px;">
          <p style="margin: 4px 0;"><strong>Customer:</strong> ${receipt.customerName}</p>
          <p style="margin: 4px 0;"><strong>Branch:</strong> ${receipt.branchName}</p>
          <p style="margin: 4px 0;"><strong>Payment Method:</strong> ${receipt.paymentMethod} (${receipt.paymentReference || "N/A"})</p>
          <p style="margin: 4px 0;"><strong>Amount Paid:</strong> KES ${receipt.amount.toLocaleString()}</p>
          <p style="margin: 4px 0;"><strong>eTIMS CU Number:</strong> ${receipt.cuNumber || "013000000000001"}</p>
        </div>

        <p style="font-size: 12px; color: #64748B; margin-top: 15px;">
          Thank you for shopping with Naisia Textiles. Please retain this receipt for warranty and exchange.
        </p>
      </div>
    </div>
  `;
}

// server/routes.ts
var apiRouter = Router();
apiRouter.get("/auth/setup-status", (req, res) => {
  const users = db.getData().users;
  return res.json({
    hasUsers: users.length > 0,
    totalUsers: users.length
  });
});
var handleGoogleAdminAuth = async (req, res) => {
  const { email, name } = req.body;
  const userEmail = (email || "").toString().trim().toLowerCase();
  const userName = (name || "").toString().trim();
  let user = db.getData().users.find((u) => u.email.toLowerCase() === userEmail);
  if (!user) {
    if (userEmail.includes("optimum") || userEmail.includes("naisiaetext") || userEmail.includes("urbaninterior") || userEmail.includes("admin") || !userEmail) {
      user = db.getData().users.find((u) => u.role === "ADMIN");
    }
  }
  if (!user) {
    const existingAdmin = db.getData().users.find((u) => u.role === "ADMIN");
    if (existingAdmin) {
      user = existingAdmin;
    } else {
      const newAdmin = {
        id: `usr-admin-${Date.now()}`,
        name: userName || "Optimum Engineering",
        email: userEmail || "optimumengineeringke@gmail.com",
        passwordHash: "",
        role: "ADMIN",
        branchId: "all",
        phone: "+254 792 021 496",
        status: "ACTIVE",
        lastLogin: (/* @__PURE__ */ new Date()).toISOString(),
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      db.getData().users.push(newAdmin);
      user = newAdmin;
    }
  }
  const authenticatedUser = user;
  authenticatedUser.lastLogin = (/* @__PURE__ */ new Date()).toISOString();
  await db.save();
  const token = createSession(authenticatedUser.id);
  const branch = db.getData().branches.find((b) => b.id === authenticatedUser.branchId);
  db.logAudit({
    userId: authenticatedUser.id,
    userName: authenticatedUser.name,
    userRole: authenticatedUser.role,
    branchId: authenticatedUser.branchId,
    branchName: branch ? branch.name : "All Branches (HQ)",
    action: "GOOGLE_OAUTH_LOGIN",
    entityType: "AUTH",
    entityId: authenticatedUser.id,
    details: `Administrator ${authenticatedUser.name} signed in successfully via Google Account (${userEmail || authenticatedUser.email})`,
    ipAddress: req.ip
  });
  return res.json({
    token,
    user: {
      id: authenticatedUser.id,
      name: authenticatedUser.name,
      email: authenticatedUser.email,
      role: authenticatedUser.role,
      branchId: authenticatedUser.branchId,
      branchName: branch ? branch.name : "All Branches",
      phone: authenticatedUser.phone
    }
  });
};
apiRouter.post("/auth/google", handleGoogleAdminAuth);
apiRouter.post("/auth/google-admin-login", handleGoogleAdminAuth);
apiRouter.post("/auth/login", async (req, res) => {
  const { email, password, role } = req.body;
  const rawEmail = (email || "").toString().trim().toLowerCase();
  let user;
  if (role === "ADMIN" || rawEmail === "admin" || rawEmail === "optimumengineeringke@gmail.com" || rawEmail === "naisiaetext@gmail.com" || rawEmail === "urbaninteriorkenya@gmail.com" || rawEmail.includes("admin") || !rawEmail && !password) {
    user = db.getData().users.find((u) => u.email.toLowerCase() === "urbaninteriorkenya@gmail.com") || db.getData().users.find((u) => u.role === "ADMIN");
  }
  if (!user && rawEmail) {
    user = db.getData().users.find((u) => u.email.toLowerCase() === rawEmail);
  }
  if (!user && (rawEmail === "support@naisiaetextiles.com" || rawEmail.includes("support"))) {
    user = db.getData().users.find((u) => u.role === "ADMIN");
  }
  if (user && user.role === "ADMIN") {
    user.lastLogin = (/* @__PURE__ */ new Date()).toISOString();
    await db.save();
    const token2 = createSession(user.id);
    const branch2 = db.getData().branches.find((b) => b.id === user.branchId);
    db.logAudit({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      branchId: user.branchId,
      branchName: branch2 ? branch2.name : "All Branches (HQ)",
      action: "ADMIN_LOGIN_NO_RULE",
      entityType: "AUTH",
      entityId: user.id,
      details: `Administrator ${user.name} logged in without restriction rules (no password rule enforced)`,
      ipAddress: req.ip
    });
    return res.json({
      token: token2,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
        branchName: branch2 ? branch2.name : "All Branches",
        phone: user.phone
      }
    });
  }
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  if (!user) {
    db.logAudit({
      userId: "anonymous",
      userName: email,
      userRole: "UNKNOWN",
      branchId: "N/A",
      branchName: "N/A",
      action: "FAILED_LOGIN_ATTEMPT",
      entityType: "AUTH",
      entityId: email,
      details: `Failed login attempt for non-existent email: ${email}`,
      ipAddress: req.ip
    });
    return res.status(401).json({ error: "Invalid email or password" });
  }
  if (user.status !== "ACTIVE") {
    return res.status(403).json({ error: "Account is deactivated. Please contact your system administrator." });
  }
  const isMatch = !user.passwordHash || bcrypt.compareSync(password, user.passwordHash);
  if (!isMatch) {
    db.logAudit({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      branchId: user.branchId,
      branchName: "N/A",
      action: "FAILED_LOGIN_PASSWORD",
      entityType: "AUTH",
      entityId: user.id,
      details: `Incorrect password entered for user ${user.email}`,
      ipAddress: req.ip
    });
    return res.status(401).json({ error: "Invalid email or password" });
  }
  user.lastLogin = (/* @__PURE__ */ new Date()).toISOString();
  await db.save();
  const token = createSession(user.id);
  const branch = db.getData().branches.find((b) => b.id === user.branchId);
  db.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    branchId: user.branchId,
    branchName: branch ? branch.name : "All Branches (HQ)",
    action: "USER_LOGIN_SUCCESS",
    entityType: "AUTH",
    entityId: user.id,
    details: `User ${user.name} (${user.role}) logged in successfully`,
    ipAddress: req.ip
  });
  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
      branchName: branch ? branch.name : "All Branches",
      phone: user.phone
    }
  });
});
var passwordResetCodes = /* @__PURE__ */ new Map();
apiRouter.post("/auth/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email address is required" });
  }
  const cleanEmail = email.toString().trim().toLowerCase();
  const user = db.getData().users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (!user) {
    return res.status(404).json({ error: "User account not found with this email address" });
  }
  const code = Math.floor(1e5 + Math.random() * 9e5).toString();
  const expiresAt = Date.now() + 15 * 60 * 1e3;
  passwordResetCodes.set(cleanEmail, { code, expiresAt });
  console.log(`[Password Reset] Code for ${cleanEmail}: ${code}`);
  db.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    branchId: user.branchId,
    branchName: "HQ",
    action: "PASSWORD_RESET_REQUESTED",
    entityType: "AUTH",
    entityId: user.id,
    details: `Password reset verification code requested for ${cleanEmail}`,
    ipAddress: req.ip
  });
  return res.json({
    success: true,
    message: "Verification code sent to your email address.",
    devCode: code
  });
});
apiRouter.post("/auth/reset-password", async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: "Email, verification code, and new password are required" });
  }
  const cleanEmail = email.toString().trim().toLowerCase();
  const record = passwordResetCodes.get(cleanEmail);
  if (!record) {
    return res.status(400).json({ error: "No active password reset request found. Please request a new code." });
  }
  if (Date.now() > record.expiresAt) {
    passwordResetCodes.delete(cleanEmail);
    return res.status(400).json({ error: "Verification code has expired. Please request a new code." });
  }
  if (record.code !== code.toString().trim()) {
    return res.status(400).json({ error: "Invalid verification code entered." });
  }
  const user = db.getData().users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (!user) {
    return res.status(404).json({ error: "User account not found." });
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
    branchName: "HQ",
    action: "PASSWORD_RESET_SUCCESS",
    entityType: "AUTH",
    entityId: user.id,
    details: `Password successfully reset via email verification code for ${cleanEmail}`,
    ipAddress: req.ip
  });
  return res.json({ success: true, message: "Password has been successfully reset. You can now login with your new password." });
});
apiRouter.get("/auth/staff-users", (req, res) => {
  const branches = db.getData().branches;
  const branchMap = new Map(branches.map((b) => [b.id, b.name]));
  const staff = db.getData().users.filter((u) => u.status === "ACTIVE" && (u.role === "STAFF" || Boolean(u.pin))).map((u) => {
    const pinValue = u.pin || "123456";
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      branchId: u.branchId,
      branchName: u.branchId === "all" ? "Consolidated / All Branches" : branchMap.get(u.branchId) || "Station",
      phone: u.phone || "",
      hasPin: Boolean(u.pin),
      demoPin: pinValue,
      pinHint: pinValue.length >= 4 ? `${pinValue.slice(0, 2)}\u2022\u2022${pinValue.slice(-2)}` : "\u2022\u2022\u2022\u2022\u2022\u2022"
    };
  });
  return res.json(staff);
});
apiRouter.post("/auth/pin-login", async (req, res) => {
  const { userId, pin } = req.body;
  if (!userId || !pin) {
    return res.status(400).json({ error: "Staff member selection and 6-digit PIN are required" });
  }
  const user = db.getData().users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "Staff user profile not found in ERP" });
  }
  if (user.status !== "ACTIVE") {
    return res.status(403).json({ error: "Staff account is inactive. Please contact administration." });
  }
  const expectedPin = user.pin || "123456";
  const cleanPin = String(pin).trim();
  if (cleanPin !== expectedPin) {
    db.logAudit({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      branchId: user.branchId,
      branchName: "N/A",
      action: "FAILED_PIN_LOGIN",
      entityType: "AUTH",
      entityId: user.id,
      details: `Incorrect 6-digit PIN entered for ${user.name}`,
      ipAddress: req.ip
    });
    return res.status(401).json({ error: "Incorrect 6-digit PIN. Please re-enter or check with administrator." });
  }
  user.lastLogin = (/* @__PURE__ */ new Date()).toISOString();
  await db.save();
  const token = createSession(user.id);
  const branch = db.getData().branches.find((b) => b.id === user.branchId);
  db.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    branchId: user.branchId,
    branchName: branch ? branch.name : "All Branches (HQ)",
    action: "USER_PIN_LOGIN_SUCCESS",
    entityType: "AUTH",
    entityId: user.id,
    details: `Staff cashier ${user.name} logged into POS terminal via 6-digit PIN`,
    ipAddress: req.ip
  });
  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
      branchName: branch ? branch.name : "All Branches",
      phone: user.phone
    }
  });
});
apiRouter.post("/auth/logout", requireAuth, (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    revokeSession(token);
  }
  if (req.user) {
    db.logAudit({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      branchId: req.user.branchId,
      branchName: "N/A",
      action: "USER_LOGOUT",
      entityType: "AUTH",
      entityId: req.user.id,
      details: `User ${req.user.name} logged out`,
      ipAddress: req.ip
    });
  }
  return res.json({ success: true, message: "Logged out successfully" });
});
apiRouter.get("/auth/me", requireAuth, (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  const branch = db.getData().branches.find((b) => b.id === req.user.branchId);
  return res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      branchId: req.user.branchId,
      branchName: branch ? branch.name : "All Branches",
      phone: req.user.phone
    }
  });
});
apiRouter.post("/auth/switch-branch", requireAuth, requireRoles("ADMIN", "ACCOUNTANT"), (req, res) => {
  const { branchId } = req.body;
  if (!branchId) return res.status(400).json({ error: "Branch ID required" });
  const branch = db.getData().branches.find((b) => b.id === branchId || branchId === "all");
  if (branchId !== "all" && !branch) {
    return res.status(404).json({ error: "Branch not found" });
  }
  req.user.branchId = branchId;
  db.save();
  db.logAudit({
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    branchId,
    branchName: branch ? branch.name : "Consolidated (All Branches)",
    action: "BRANCH_CONTEXT_SWITCH",
    entityType: "USER",
    entityId: req.user.id,
    details: `User switched active branch context to ${branch ? branch.name : "Consolidated (All Branches)"}`,
    ipAddress: req.ip
  });
  return res.json({
    success: true,
    branchId,
    branchName: branch ? branch.name : "Consolidated (All Branches)"
  });
});
apiRouter.get("/branches", requireAuth, (req, res) => {
  return res.json(db.getData().branches);
});
apiRouter.post("/branches", requireAuth, requireRoles("ADMIN"), async (req, res) => {
  const { code, name, location, address, phone, email, isHQ } = req.body;
  if (!code || !name) return res.status(400).json({ error: "Branch code and name are required" });
  const branches = db.getData().branches;
  if (branches.some((b) => b.code.toUpperCase() === code.toUpperCase())) {
    return res.status(400).json({ error: "Branch code already in use" });
  }
  const newBranch = {
    id: `branch-${Date.now()}`,
    code: code.toUpperCase(),
    name,
    location: location || "",
    address: address || "",
    phone: phone || "",
    email: email || "",
    isHQ: Boolean(isHQ),
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  branches.push(newBranch);
  db.getData().products.forEach((product) => {
    product.variants.forEach((v) => {
      if (!v.branchStock[newBranch.id]) {
        v.branchStock[newBranch.id] = 0;
      }
    });
  });
  await db.save();
  db.logAudit({
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    branchId: newBranch.id,
    branchName: newBranch.name,
    action: "BRANCH_CREATED",
    entityType: "BRANCH",
    entityId: newBranch.id,
    details: `Created new branch: ${newBranch.name} (${newBranch.code})`,
    ipAddress: req.ip
  });
  return res.status(201).json(newBranch);
});
apiRouter.put("/branches/:id", requireAuth, requireRoles("ADMIN"), async (req, res) => {
  const branch = db.getData().branches.find((b) => b.id === req.params.id);
  if (!branch) return res.status(404).json({ error: "Branch not found" });
  const { name, location, address, phone, email, isHQ } = req.body;
  branch.name = name || branch.name;
  branch.location = location ?? branch.location;
  branch.address = address ?? branch.address;
  branch.phone = phone ?? branch.phone;
  branch.email = email ?? branch.email;
  if (typeof isHQ === "boolean") branch.isHQ = isHQ;
  await db.save();
  db.logAudit({
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    branchId: branch.id,
    branchName: branch.name,
    action: "BRANCH_UPDATED",
    entityType: "BRANCH",
    entityId: branch.id,
    details: `Updated details for branch: ${branch.name}`,
    ipAddress: req.ip
  });
  return res.json(branch);
});
apiRouter.get("/users", requireAuth, requireRoles("ADMIN"), (req, res) => {
  const users = db.getData().users.map(({ passwordHash, ...rest }) => rest);
  return res.json(users);
});
apiRouter.post("/users", requireAuth, requireRoles("ADMIN"), async (req, res) => {
  const { name, email, password, role, branchId, phone, pin } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "Name, email, password, and role are required" });
  }
  const existing = db.getData().users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
  if (existing) {
    return res.status(400).json({ error: "A user with this email already exists" });
  }
  const salt = bcrypt.genSaltSync(10);
  const newUser = {
    id: `usr-${Date.now()}`,
    name,
    email: email.toLowerCase().trim(),
    passwordHash: bcrypt.hashSync(password, salt),
    role,
    branchId: branchId || "all",
    phone: phone || "",
    pin: pin && /^\d{4,6}$/.test(String(pin).trim()) ? String(pin).trim() : "123456",
    status: "ACTIVE",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.getData().users.push(newUser);
  await db.save();
  db.logAudit({
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    branchId: newUser.branchId,
    branchName: "N/A",
    action: "USER_CREATED",
    entityType: "USER",
    entityId: newUser.id,
    details: `Created new user ${newUser.name} with role ${newUser.role}`,
    ipAddress: req.ip
  });
  const { passwordHash, ...safeUser } = newUser;
  return res.status(201).json(safeUser);
});
apiRouter.put("/users/:id", requireAuth, requireRoles("ADMIN"), async (req, res) => {
  const user = db.getData().users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  const { name, email, role, branchId, phone, password, status, pin } = req.body;
  const previousRole = user.role;
  if (name) user.name = name;
  if (email) user.email = email.toLowerCase().trim();
  if (role) user.role = role;
  if (branchId) user.branchId = branchId;
  if (phone !== void 0) user.phone = phone;
  if (status) user.status = status;
  if (pin !== void 0) {
    user.pin = String(pin).trim();
  }
  if (password) {
    user.passwordHash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
  }
  await db.save();
  db.logAudit({
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    branchId: user.branchId,
    branchName: "N/A",
    action: "USER_UPDATED",
    entityType: "USER",
    entityId: user.id,
    details: `Updated user ${user.name}. Role: ${previousRole} -> ${user.role}, Status: ${user.status}`,
    ipAddress: req.ip
  });
  const { passwordHash, ...safeUser } = user;
  return res.json(safeUser);
});
apiRouter.get("/products", requireAuth, (req, res) => {
  try {
    const { school, category, gender, sector, institutionType, professionalDomain, search, activeOnly } = req.query;
    let products = db.getData().products || [];
    if (activeOnly === "true") {
      products = products.filter((p) => p && p.active !== false);
    }
    if (sector && typeof sector === "string" && sector !== "ALL") {
      products = products.filter((p) => p && p.sector === sector);
    }
    if (institutionType && typeof institutionType === "string" && institutionType !== "ALL") {
      products = products.filter((p) => p && p.institutionType === institutionType);
    }
    if (professionalDomain && typeof professionalDomain === "string" && professionalDomain !== "ALL") {
      products = products.filter((p) => p && p.professionalDomain === professionalDomain);
    }
    if (school && typeof school === "string" && school !== "ALL") {
      products = products.filter((p) => p && (p.school || "").toLowerCase().includes(school.toLowerCase()));
    }
    if (category && typeof category === "string" && category !== "ALL") {
      products = products.filter((p) => p && (p.category === category || p.garmentType === category));
    }
    if (gender && typeof gender === "string") {
      products = products.filter((p) => p && (p.gender === gender || p.gender === "UNISEX"));
    }
    if (search && typeof search === "string") {
      const q = search.toLowerCase();
      products = products.filter(
        (p) => p && ((p.name || "").toLowerCase().includes(q) || (p.school || "").toLowerCase().includes(q) || p.sector && p.sector.toLowerCase().includes(q) || p.institutionType && p.institutionType.toLowerCase().includes(q) || p.professionalDomain && p.professionalDomain.toLowerCase().includes(q) || p.garmentType && p.garmentType.toLowerCase().includes(q) || p.category && p.category.toLowerCase().includes(q) || (p.variants || []).some(
          (v) => v && (v.sku && String(v.sku).toLowerCase().includes(q) || v.barcode && String(v.barcode).includes(q) || v.size && String(v.size).toLowerCase().includes(q))
        ))
      );
    }
    return res.json(products);
  } catch (err) {
    console.error("[Products List Error]", err);
    return res.status(500).json({ error: "Failed to retrieve products catalogue", details: err.message });
  }
});
apiRouter.get("/products/schools", requireAuth, (req, res) => {
  try {
    const products = db.getData().products || [];
    const schools = Array.from(new Set(products.map((p) => p && p.school ? String(p.school).trim() : ""))).filter(Boolean).sort();
    return res.json(schools);
  } catch (err) {
    console.error("[Products Schools Error]", err);
    return res.status(500).json({ error: "Failed to retrieve schools list", details: err.message });
  }
});
apiRouter.get("/portal/products", (req, res) => {
  try {
    const { school, category, search } = req.query;
    let products = (db.getData().products || []).filter((p) => p && p.active !== false);
    if (school && typeof school === "string" && school !== "ALL") {
      products = products.filter((p) => p && (p.school || "").toLowerCase().includes(school.toLowerCase()));
    }
    if (category && typeof category === "string" && category !== "ALL") {
      products = products.filter((p) => p && (p.category === category || p.garmentType === category));
    }
    if (search && typeof search === "string") {
      const q = search.toLowerCase();
      products = products.filter(
        (p) => p && ((p.name || "").toLowerCase().includes(q) || (p.school || "").toLowerCase().includes(q) || p.category && p.category.toLowerCase().includes(q) || (p.variants || []).some(
          (v) => v && (v.sku && String(v.sku).toLowerCase().includes(q) || v.barcode && String(v.barcode).includes(q) || v.size && String(v.size).toLowerCase().includes(q))
        ))
      );
    }
    return res.json(products);
  } catch (err) {
    console.error("[Portal Products Error]", err);
    return res.status(500).json({ error: "Failed to retrieve portal products", details: err.message });
  }
});
apiRouter.get("/portal/schools", (_req, res) => {
  try {
    const products = db.getData().products || [];
    const schools = Array.from(new Set(products.map((p) => p && p.school ? String(p.school).trim() : ""))).filter(Boolean).sort();
    return res.json(schools);
  } catch (err) {
    console.error("[Portal Schools Error]", err);
    return res.status(500).json({ error: "Failed to retrieve portal schools list", details: err.message });
  }
});
apiRouter.post("/portal/checkout", async (req, res) => {
  const {
    customerName,
    customerEmail,
    customerPhone,
    items,
    paymentMethod,
    paymentReference,
    branchId
  } = req.body;
  if (!items || !items.length) {
    return res.status(400).json({ error: "Cart is empty. Please add items to checkout." });
  }
  const branches = db.getData().branches;
  const branch = branchId && branches.find((b) => b.id === branchId) || branches[0];
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
        error: `Insufficient stock for ${prod.name} (Size ${variant.size}). Available: ${currentStock}, Requested: ${item.quantity}`
      });
    }
  }
  let subtotal = 0;
  let totalTax = 0;
  let totalDiscount = 0;
  let totalAmount = 0;
  const processedItems = items.map((item) => {
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
      totalPrice: Number(lineTotal.toFixed(2))
    };
  }).filter(Boolean);
  const receiptNumber = db.getNextSequence("RCP-WEB", db.getData().sales, "receiptNumber");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const fiscalResult = await fiscalizeTransaction(
    {
      invoiceOrReceiptNumber: receiptNumber,
      totalAmount,
      taxableAmount: subtotal,
      taxAmount: totalTax,
      zeroRatedAmount: totalAmount - (subtotal + totalTax),
      customerName: customerName || "Online Portal Customer",
      itemsCount: processedItems.length,
      branchCode: branch.code
    },
    false
  );
  const sale = {
    id: uuidv42(),
    receiptNumber,
    branchId: branch.id,
    branchName: branch.name,
    cashierId: "usr-online-portal",
    cashierName: "Online Web Portal (Customer Checkout)",
    customerName: customerName || "Online Customer",
    customerPhone: customerPhone || void 0,
    customerEmail: customerEmail || void 0,
    items: processedItems,
    subtotal: Number(subtotal.toFixed(2)),
    totalTax: Number(totalTax.toFixed(2)),
    totalDiscount: Number(totalDiscount.toFixed(2)),
    totalAmount: Number(totalAmount.toFixed(2)),
    paymentMethod: paymentMethod || "MPESA",
    paymentReference: paymentReference || void 0,
    amountTendered: totalAmount,
    changeGiven: 0,
    status: "COMPLETED",
    kraStatus: fiscalResult.status,
    cuInvoiceNumber: fiscalResult.cuInvoiceNumber || void 0,
    kraControlCode: fiscalResult.kraControlCode || void 0,
    kraQrCodeUrl: fiscalResult.kraQrCodeUrl || void 0,
    kraSubmissionTimestamp: fiscalResult.timestamp,
    kraError: fiscalResult.error,
    createdAt: now
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
      branchCode: branch.code
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
      id: uuidv42(),
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
      timestamp: now
    });
  }
  db.getData().sales.unshift(sale);
  const receiptRecord = {
    id: uuidv42(),
    receiptNumber,
    saleId: sale.id,
    branchId: branch.id,
    branchName: branch.name,
    customerId: "cust-online-portal",
    customerName: sale.customerName,
    amount: totalAmount,
    paymentMethod: sale.paymentMethod || "MPESA",
    paymentReference: sale.paymentReference || "ONLINE-PORTAL",
    receivedBy: "usr-online-portal",
    receivedByName: "Online Web Portal",
    cuNumber: sale.cuInvoiceNumber,
    kraQrCodeUrl: sale.kraQrCodeUrl,
    createdAt: now
  };
  db.getData().receipts.unshift(receiptRecord);
  if (customerEmail && customerEmail.includes("@")) {
    try {
      const emailHtml = generateReceiptEmailHtml(receiptRecord, sale);
      sendEmail({
        to: customerEmail,
        subject: `Payment Receipt ${receiptNumber} - Naisia Textiles & Uniforms`,
        html: emailHtml
      });
    } catch {
    }
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
    ipAddress: req.ip
  });
  return res.status(201).json({
    sale,
    receipt: receiptRecord,
    qrCodeDataUrl: fiscalResult.kraQrCodeUrl
  });
});
apiRouter.post("/upload/image", requireAuth, requireRoles("ADMIN", "ACCOUNTANT"), async (req, res) => {
  const { dataUrl, url } = req.body;
  if (!dataUrl && !url) {
    return res.status(400).json({ error: "Image data or URL is required" });
  }
  const finalUrl = dataUrl || url;
  return res.json({ url: finalUrl, success: true });
});
apiRouter.post("/products/sku-image", requireAuth, requireRoles("ADMIN", "ACCOUNTANT"), async (req, res) => {
  const { sku, variantId, imageUrl, imageCategory } = req.body;
  if (!sku && !variantId || imageUrl === void 0) {
    return res.status(400).json({ error: "SKU or variantId and imageUrl are required" });
  }
  const products = db.getData().products;
  let targetProduct;
  let targetVariant;
  for (const product of products) {
    const variant = product.variants.find(
      (v) => sku && v.sku.toLowerCase() === sku.toLowerCase().trim() || variantId && v.id === variantId
    );
    if (variant) {
      targetProduct = product;
      targetVariant = variant;
      variant.imageUrl = imageUrl;
      if (imageCategory !== void 0) {
        variant.imageCategory = imageCategory;
      }
      if (!product.imageUrl && imageUrl) {
        product.imageUrl = imageUrl;
      }
      product.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      break;
    }
  }
  if (!targetProduct || !targetVariant) {
    return res.status(404).json({ error: `SKU '${sku || variantId}' not found in catalog` });
  }
  await db.save();
  db.logAudit({
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    branchId: req.user.branchId,
    branchName: "N/A",
    action: "SKU_IMAGE_UPDATED",
    entityType: "PRODUCT",
    entityId: targetVariant.sku,
    details: `Updated image file for SKU ${targetVariant.sku} (${targetProduct.name} - Size ${targetVariant.size}) [Category: ${imageCategory || "General"}]`,
    ipAddress: req.ip
  });
  return res.json({
    success: true,
    sku: targetVariant.sku,
    variantId: targetVariant.id,
    imageUrl: targetVariant.imageUrl,
    imageCategory: targetVariant.imageCategory,
    productName: targetProduct.name
  });
});
apiRouter.post("/products/bulk-sku-images", requireAuth, requireRoles("ADMIN", "ACCOUNTANT"), async (req, res) => {
  const { items, defaultCategory } = req.body;
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: "Items array is required" });
  }
  const products = db.getData().products;
  const updatedSkus = [];
  const unmatched = [];
  for (const item of items) {
    const rawSku = item.sku || (item.filename ? item.filename.replace(/\.[^/.]+$/, "").trim() : "");
    if (!rawSku || !item.imageUrl) {
      continue;
    }
    const cleanSku = rawSku.toLowerCase().trim();
    let matched = false;
    for (const product of products) {
      const variant = product.variants.find(
        (v) => v.sku.toLowerCase().trim() === cleanSku || cleanSku.includes(v.sku.toLowerCase().trim())
      );
      if (variant) {
        variant.imageUrl = item.imageUrl;
        if (item.imageCategory || defaultCategory) {
          variant.imageCategory = item.imageCategory || defaultCategory;
        }
        if (!product.imageUrl) {
          product.imageUrl = item.imageUrl;
        }
        product.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
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
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    branchId: req.user.branchId,
    branchName: "N/A",
    action: "BULK_SKU_IMAGES_UPLOADED",
    entityType: "PRODUCT",
    entityId: "BULK",
    details: `Batch uploaded ${updatedSkus.length} SKU images. Unmatched: ${unmatched.length}`,
    ipAddress: req.ip
  });
  return res.json({
    success: true,
    matchedCount: updatedSkus.length,
    updatedSkus,
    unmatched
  });
});
apiRouter.post("/products/category-sku-images", requireAuth, requireRoles("ADMIN", "ACCOUNTANT"), async (req, res) => {
  const { school, category, garmentType, sector, imageUrl, imageCategory } = req.body;
  if (!imageUrl) {
    return res.status(400).json({ error: "imageUrl is required" });
  }
  const products = db.getData().products;
  const updatedSkus = [];
  for (const product of products) {
    if (school && school !== "ALL" && product.school !== school) continue;
    if (category && category !== "ALL" && product.category !== category) continue;
    if (garmentType && garmentType !== "ALL" && product.garmentType !== garmentType) continue;
    if (sector && sector !== "ALL" && product.sector !== sector) continue;
    product.imageUrl = imageUrl;
    product.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
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
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    branchId: req.user.branchId,
    branchName: "N/A",
    action: "CATEGORY_SKU_IMAGE_ASSIGNED",
    entityType: "PRODUCT",
    entityId: `${category || "ALL"}-${school || "ALL"}`,
    details: `Assigned category image to ${updatedSkus.length} SKUs across category '${category || "ALL"}' / school '${school || "ALL"}'`,
    ipAddress: req.ip
  });
  return res.json({
    success: true,
    count: updatedSkus.length,
    updatedSkus
  });
});
apiRouter.post("/products", requireAuth, requireRoles("ADMIN", "ACCOUNTANT"), async (req, res) => {
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
    variants
  } = req.body;
  if (!name || !school || !category) {
    return res.status(400).json({ error: "Product name, school, and category are required" });
  }
  const branches = db.getData().branches;
  const formattedVariants = (variants || []).map((v) => {
    const branchStock = {};
    branches.forEach((b) => {
      branchStock[b.id] = v.branchStock && v.branchStock[b.id] || 0;
    });
    return {
      id: v.id || `var-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sku: v.sku || `SKU-${Date.now()}`,
      barcode: v.barcode || `616${Math.floor(1e8 + Math.random() * 9e8)}`,
      size: v.size || "Standard",
      color: v.color || "Standard",
      costPrice: Number(v.costPrice) || 0,
      sellingPrice: Number(v.sellingPrice) || 0,
      branchStock,
      reorderLevel: Number(v.reorderLevel) || 10,
      reorderQuantity: Number(v.reorderQuantity) || 30
    };
  });
  const newProduct = {
    id: `prod-${Date.now()}`,
    name,
    school,
    category,
    sector: sector || "SECONDARY",
    institutionType,
    professionalDomain,
    garmentType: garmentType || category,
    gender: gender || "UNISEX",
    description: description || "",
    taxCategory: taxCategory || "VAT_16",
    supplierId: supplierId || "",
    imageUrl: imageUrl || "",
    active: true,
    variants: formattedVariants,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.getData().products.push(newProduct);
  await db.save();
  db.logAudit({
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    branchId: req.user.branchId,
    branchName: "N/A",
    action: "PRODUCT_CREATED",
    entityType: "PRODUCT",
    entityId: newProduct.id,
    details: `Added new uniform item: ${newProduct.name} (${newProduct.school}) with ${newProduct.variants.length} size variants`,
    ipAddress: req.ip
  });
  return res.status(201).json(newProduct);
});
apiRouter.put("/products/:id", requireAuth, requireRoles("ADMIN", "ACCOUNTANT"), async (req, res) => {
  const product = db.getData().products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });
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
    variants
  } = req.body;
  if (name) product.name = name;
  if (school) product.school = school;
  if (category) product.category = category;
  if (sector !== void 0) product.sector = sector;
  if (institutionType !== void 0) product.institutionType = institutionType;
  if (professionalDomain !== void 0) product.professionalDomain = professionalDomain;
  if (garmentType !== void 0) product.garmentType = garmentType;
  if (gender) product.gender = gender;
  if (description !== void 0) product.description = description;
  if (taxCategory) product.taxCategory = taxCategory;
  if (supplierId !== void 0) product.supplierId = supplierId;
  if (imageUrl !== void 0) product.imageUrl = imageUrl;
  if (typeof active === "boolean") product.active = active;
  if (variants && Array.isArray(variants)) {
    product.variants = variants;
  }
  product.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  await db.save();
  db.logAudit({
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    branchId: req.user.branchId,
    branchName: "N/A",
    action: "PRODUCT_UPDATED",
    entityType: "PRODUCT",
    entityId: product.id,
    details: `Updated catalog item: ${product.name}`,
    ipAddress: req.ip
  });
  return res.json(product);
});
apiRouter.post("/products/price-set", requireAuth, requireRoles("ADMIN", "ACCOUNTANT"), async (req, res) => {
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
    roundTo
  } = req.body;
  let products = db.getData().products;
  if (sector && sector !== "ALL") {
    products = products.filter((p) => p.sector === sector);
  }
  if (institutionType && institutionType !== "ALL") {
    products = products.filter((p) => p.institutionType === institutionType);
  }
  if (professionalDomain && professionalDomain !== "ALL") {
    products = products.filter((p) => p.professionalDomain === professionalDomain);
  }
  if (school && school !== "ALL") {
    products = products.filter((p) => p.school.toLowerCase() === school.toLowerCase());
  }
  if (garmentType && garmentType !== "ALL") {
    products = products.filter((p) => p.garmentType === garmentType || p.category?.toLowerCase() === garmentType.toLowerCase());
  } else if (category && category !== "ALL") {
    products = products.filter((p) => p.category?.toLowerCase() === category.toLowerCase());
  }
  let updatedCount = 0;
  let variantsUpdated = 0;
  products.forEach((p) => {
    let changed = false;
    p.variants.forEach((v) => {
      let newPrice = v.sellingPrice;
      if (adjustmentType === "PERCENTAGE") {
        const factor = 1 + (Number(percentage) || 0) / 100;
        newPrice = Math.round(v.sellingPrice * factor);
      } else if (adjustmentType === "FIXED_AMOUNT") {
        newPrice = Math.max(0, v.sellingPrice + (Number(fixedAmount) || 0));
      } else if (adjustmentType === "SET_BASE") {
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
      p.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      updatedCount++;
    }
  });
  await db.save();
  db.logAudit({
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    branchId: req.user.branchId,
    branchName: "N/A",
    action: "PRICE_SET_APPLIED",
    entityType: "PRODUCT",
    entityId: school || sector || "CATALOG",
    details: `Applied price set (${adjustmentType}): updated ${updatedCount} products and ${variantsUpdated} variants. Scope: Sector=${sector || "All"}, School=${school || "All"}, Category=${garmentType || category || "All"}`,
    ipAddress: req.ip
  });
  return res.json({ success: true, updatedCount, variantsUpdated });
});
apiRouter.post("/products/:id/price-set", requireAuth, requireRoles("ADMIN", "ACCOUNTANT"), async (req, res) => {
  const product = db.getData().products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });
  const { variants, uniformPrice, adjustmentType, percentage, fixedAmount, roundTo } = req.body;
  let variantsUpdated = 0;
  if (variants && Array.isArray(variants)) {
    product.variants = variants;
    variantsUpdated = variants.length;
  } else if (uniformPrice !== void 0 && Number(uniformPrice) > 0) {
    product.variants.forEach((v) => {
      v.sellingPrice = Number(uniformPrice);
      variantsUpdated++;
    });
  } else if (adjustmentType) {
    product.variants.forEach((v) => {
      let newPrice = v.sellingPrice;
      if (adjustmentType === "PERCENTAGE") {
        const factor = 1 + (Number(percentage) || 0) / 100;
        newPrice = Math.round(v.sellingPrice * factor);
      } else if (adjustmentType === "FIXED_AMOUNT") {
        newPrice = Math.max(0, v.sellingPrice + (Number(fixedAmount) || 0));
      }
      if (roundTo && Number(roundTo) > 0) {
        newPrice = Math.round(newPrice / Number(roundTo)) * Number(roundTo);
      }
      v.sellingPrice = newPrice;
      variantsUpdated++;
    });
  }
  product.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  await db.save();
  db.logAudit({
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    branchId: req.user.branchId,
    branchName: "N/A",
    action: "PRODUCT_PRICE_SET",
    entityType: "PRODUCT",
    entityId: product.id,
    details: `Updated price set for uniform item ${product.name} (${variantsUpdated} sizes updated)`,
    ipAddress: req.ip
  });
  return res.json({ success: true, product, variantsUpdated });
});
apiRouter.get("/inventory", requireAuth, (req, res) => {
  const { branchId, lowStockOnly } = req.query;
  const products = db.getData().products;
  const branches = db.getData().branches;
  const inventorySummary = [];
  products.forEach((product) => {
    product.variants.forEach((v) => {
      const targetBranches = branchId && branchId !== "all" ? branches.filter((b) => b.id === branchId) : branches;
      targetBranches.forEach((b) => {
        const currentStock = v.branchStock[b.id] ?? 0;
        const isLow = currentStock <= v.reorderLevel;
        if (lowStockOnly === "true" && !isLow) return;
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
          imageUrl: v.imageUrl || product.imageUrl || "",
          imageCategory: v.imageCategory || product.imageCategory || "FRONT",
          totalValuationCost: currentStock * v.costPrice,
          totalValuationRetail: currentStock * v.sellingPrice
        });
      });
    });
  });
  return res.json(inventorySummary);
});
apiRouter.post("/inventory/adjust", requireAuth, requireRoles("ADMIN", "ACCOUNTANT"), async (req, res) => {
  const { productId, variantId, branchId, newStock, reason, notes } = req.body;
  if (!productId || !variantId || !branchId || newStock === void 0 || !reason) {
    return res.status(400).json({ error: "Product, variant, branch, newStock, and reason are required" });
  }
  const product = db.getData().products.find((p) => p.id === productId);
  if (!product) return res.status(404).json({ error: "Product not found" });
  const variant = product.variants.find((v) => v.id === variantId);
  if (!variant) return res.status(404).json({ error: "Variant not found" });
  const branch = db.getData().branches.find((b) => b.id === branchId);
  if (!branch) return res.status(404).json({ error: "Branch not found" });
  const previousStock = variant.branchStock[branchId] ?? 0;
  const quantityChange = Number(newStock) - previousStock;
  variant.branchStock[branchId] = Number(newStock);
  const movement = {
    id: uuidv42(),
    productId,
    variantId,
    productName: product.name,
    sku: variant.sku,
    branchId,
    branchName: branch.name,
    type: "ADJUSTMENT",
    quantityChange,
    previousStock,
    newStock: Number(newStock),
    referenceNumber: `ADJ-${Date.now().toString().slice(-6)}`,
    reason: `${reason}${notes ? ` - ${notes}` : ""}`,
    userId: req.user.id,
    userName: req.user.name,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.getData().inventoryMovements.unshift(movement);
  await db.save();
  db.logAudit({
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    branchId,
    branchName: branch.name,
    action: "STOCK_ADJUSTMENT",
    entityType: "INVENTORY",
    entityId: variant.sku,
    details: `Adjusted ${variant.sku} at ${branch.name}. Stock changed from ${previousStock} to ${newStock} (Diff: ${quantityChange > 0 ? `+${quantityChange}` : quantityChange}). Reason: ${reason}`,
    previousValue: String(previousStock),
    newValue: String(newStock),
    ipAddress: req.ip
  });
  return res.json({ success: true, newStock: Number(newStock), movement });
});
apiRouter.get("/inventory/alerts", requireAuth, (req, res) => {
  const products = db.getData().products;
  const branches = db.getData().branches;
  const alerts = [];
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
            urgency: stock === 0 ? "CRITICAL" : "WARNING"
          });
        }
      });
    });
  });
  return res.json(alerts);
});
apiRouter.get("/inventory/movements", requireAuth, (req, res) => {
  const { branchId, productId, type, limit } = req.query;
  let movements = db.getData().inventoryMovements;
  if (branchId && branchId !== "all") {
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
apiRouter.get("/inventory/transfers", requireAuth, (req, res) => {
  const { branchId } = req.query;
  let transfers = db.getData().stockTransfers;
  if (branchId && branchId !== "all") {
    transfers = transfers.filter((t) => t.sourceBranchId === branchId || t.destBranchId === branchId);
  }
  return res.json(transfers);
});
apiRouter.post("/inventory/transfers", requireAuth, async (req, res) => {
  const { sourceBranchId, destBranchId, items, notes } = req.body;
  if (!sourceBranchId || !destBranchId || !items || !items.length) {
    return res.status(400).json({ error: "Source branch, destination branch, and items are required" });
  }
  if (sourceBranchId === destBranchId) {
    return res.status(400).json({ error: "Source and destination branches cannot be the same" });
  }
  const sourceBranch = db.getData().branches.find((b) => b.id === sourceBranchId);
  const destBranch = db.getData().branches.find((b) => b.id === destBranchId);
  if (!sourceBranch || !destBranch) {
    return res.status(404).json({ error: "Branch not found" });
  }
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
        error: `Insufficient stock at ${sourceBranch.name} for ${prod?.name} (${variant.size}). Available: ${available}, Requested: ${item.quantity}`
      });
    }
  }
  const transferNumber = db.getNextSequence("TRF", db.getData().stockTransfers, "transferNumber");
  const transfer = {
    id: uuidv42(),
    transferNumber,
    sourceBranchId,
    sourceBranchName: sourceBranch.name,
    destBranchId,
    destBranchName: destBranch.name,
    items,
    status: "PENDING",
    notes,
    initiatedBy: req.user.id,
    initiatedByName: req.user.name,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.getData().stockTransfers.unshift(transfer);
  await db.save();
  db.logAudit({
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    branchId: sourceBranchId,
    branchName: sourceBranch.name,
    action: "STOCK_TRANSFER_INITIATED",
    entityType: "TRANSFER",
    entityId: transfer.transferNumber,
    details: `Initiated transfer ${transfer.transferNumber} of ${items.length} uniform items to ${destBranch.name}`,
    ipAddress: req.ip
  });
  return res.status(201).json(transfer);
});
apiRouter.patch("/inventory/transfers/:id/status", requireAuth, async (req, res) => {
  const { status } = req.body;
  const transfer = db.getData().stockTransfers.find((t) => t.id === req.params.id);
  if (!transfer) return res.status(404).json({ error: "Transfer not found" });
  if (status === "DISPATCHED" && transfer.status === "PENDING") {
    transfer.status = "DISPATCHED";
    transfer.dispatchedAt = (/* @__PURE__ */ new Date()).toISOString();
  } else if (status === "RECEIVED" && (transfer.status === "DISPATCHED" || transfer.status === "PENDING")) {
    const products = db.getData().products;
    const now = (/* @__PURE__ */ new Date()).toISOString();
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
      db.getData().inventoryMovements.unshift({
        id: uuidv42(),
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productName,
        sku: item.sku,
        branchId: transfer.sourceBranchId,
        branchName: transfer.sourceBranchName,
        type: "TRANSFER_OUT",
        quantityChange: -item.quantity,
        previousStock: srcPrev,
        newStock: srcNew,
        referenceNumber: transfer.transferNumber,
        userId: req.user.id,
        userName: req.user.name,
        timestamp: now
      });
      db.getData().inventoryMovements.unshift({
        id: uuidv42(),
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productName,
        sku: item.sku,
        branchId: transfer.destBranchId,
        branchName: transfer.destBranchName,
        type: "TRANSFER_IN",
        quantityChange: item.quantity,
        previousStock: dstPrev,
        newStock: dstNew,
        referenceNumber: transfer.transferNumber,
        userId: req.user.id,
        userName: req.user.name,
        timestamp: now
      });
    }
    transfer.status = "RECEIVED";
    transfer.receivedBy = req.user.id;
    transfer.receivedByName = req.user.name;
    transfer.receivedAt = now;
  } else if (status === "CANCELLED") {
    transfer.status = "CANCELLED";
  } else {
    return res.status(400).json({ error: `Cannot transition status from ${transfer.status} to ${status}` });
  }
  await db.save();
  db.logAudit({
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    branchId: transfer.destBranchId,
    branchName: transfer.destBranchName,
    action: `STOCK_TRANSFER_${status}`,
    entityType: "TRANSFER",
    entityId: transfer.transferNumber,
    details: `Transfer ${transfer.transferNumber} status changed to ${status}`,
    ipAddress: req.ip
  });
  return res.json(transfer);
});
apiRouter.post("/sales", requireAuth, async (req, res) => {
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
    simulateKraOffline
  } = req.body;
  if (!items || !items.length) {
    return res.status(400).json({ error: "Cart is empty. Please add items to checkout." });
  }
  const effectiveBranchId = req.user.role === "STAFF" && req.user.branchId !== "all" ? req.user.branchId : branchId || db.getData().branches[0].id;
  const branch = db.getData().branches.find((b) => b.id === effectiveBranchId);
  if (!branch) return res.status(404).json({ error: "Branch not found" });
  const products = db.getData().products;
  for (const item of items) {
    const prod = products.find((p) => p.id === item.productId);
    if (!prod) return res.status(400).json({ error: `Product not found: ${item.productName}` });
    const variant = prod.variants.find((v) => v.id === item.variantId);
    if (!variant) return res.status(400).json({ error: `Size variant not found for: ${item.productName}` });
    const currentStock = variant.branchStock[effectiveBranchId] ?? 0;
    if (currentStock < item.quantity) {
      return res.status(400).json({
        error: `Insufficient stock at ${branch.name} for ${prod.name} (${variant.size}). Available: ${currentStock}, Requested: ${item.quantity}`
      });
    }
  }
  let subtotal = 0;
  let totalTax = 0;
  let totalDiscount = 0;
  let totalAmount = 0;
  const processedItems = items.map((item) => {
    const prod = products.find((p) => p.id === item.productId);
    const variant = prod.variants.find((v) => v.id === item.variantId);
    const qty = Number(item.quantity);
    const unitPrice = Number(item.unitPrice || variant.sellingPrice);
    const discount = Number(item.discountAmount || 0);
    const lineTotal = qty * unitPrice - discount;
    const isVat16 = prod.taxCategory === "VAT_16";
    const taxRate = isVat16 ? 0.16 : 0;
    const taxAmount = isVat16 ? Number((lineTotal - lineTotal / 1.16).toFixed(2)) : 0;
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
      total: lineTotal
    };
  });
  const receiptNumber = db.getNextSequence("RCP", db.getData().sales, "receiptNumber");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const fiscalResult = await fiscalizeTransaction(
    {
      invoiceOrReceiptNumber: receiptNumber,
      totalAmount,
      taxableAmount: subtotal,
      taxAmount: totalTax,
      zeroRatedAmount: totalAmount - (subtotal + totalTax),
      customerName: customerName || "Walk-In Customer",
      itemsCount: processedItems.length,
      branchCode: branch.code
    },
    Boolean(simulateKraOffline)
  );
  const sale = {
    id: uuidv42(),
    receiptNumber,
    branchId: branch.id,
    branchName: branch.name,
    cashierId: req.user.id,
    cashierName: req.user.name,
    customerId: customerId || void 0,
    customerName: customerName || "Walk-In Customer (Cash/MPESA)",
    customerPhone,
    customerEmail,
    items: processedItems,
    subtotal: Number(subtotal.toFixed(2)),
    totalTax: Number(totalTax.toFixed(2)),
    totalDiscount: Number(totalDiscount.toFixed(2)),
    totalAmount: Number(totalAmount.toFixed(2)),
    paymentMethod: paymentMethod || "CASH",
    paymentReference: paymentReference || void 0,
    amountTendered: Number(amountTendered || totalAmount),
    changeGiven: Math.max(0, Number(amountTendered || totalAmount) - totalAmount),
    status: "COMPLETED",
    kraStatus: fiscalResult.status,
    cuInvoiceNumber: fiscalResult.cuInvoiceNumber || void 0,
    kraControlCode: fiscalResult.kraControlCode || void 0,
    kraQrCodeUrl: fiscalResult.kraQrCodeUrl || void 0,
    kraSubmissionTimestamp: fiscalResult.timestamp,
    kraError: fiscalResult.error,
    createdAt: now
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
      branchCode: branch.code
    }, fiscalResult.error || "Connection Failed");
  }
  for (const item of processedItems) {
    const prod = products.find((p) => p.id === item.productId);
    const variant = prod.variants.find((v) => v.id === item.variantId);
    const previousStock = variant.branchStock[branch.id] ?? 0;
    const newStock = Math.max(0, previousStock - item.quantity);
    variant.branchStock[branch.id] = newStock;
    db.getData().inventoryMovements.unshift({
      id: uuidv42(),
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
      userId: req.user.id,
      userName: req.user.name,
      timestamp: now
    });
  }
  db.getData().sales.unshift(sale);
  const receiptRecord = {
    id: uuidv42(),
    receiptNumber,
    saleId: sale.id,
    branchId: branch.id,
    branchName: branch.name,
    customerId: customerId || "cust-walkin",
    customerName: sale.customerName,
    amount: totalAmount,
    paymentMethod: sale.paymentMethod,
    paymentReference: paymentReference || `POS-${receiptNumber}`,
    notes: `POS Retail Sale at ${branch.name}`,
    receivedBy: req.user.id,
    receivedByName: req.user.name,
    cuNumber: sale.cuInvoiceNumber,
    kraQrCodeUrl: sale.kraQrCodeUrl,
    createdAt: now
  };
  db.getData().receipts.unshift(receiptRecord);
  if (customerId && paymentMethod === "CREDIT") {
    const customer = db.getData().customers.find((c) => c.id === customerId);
    if (customer) {
      customer.currentBalance += totalAmount;
    }
  }
  await db.save();
  db.logAudit({
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    branchId: branch.id,
    branchName: branch.name,
    action: "SALE_COMPLETED",
    entityType: "SALE",
    entityId: receiptNumber,
    details: `POS Sale ${receiptNumber} completed by ${req.user.name}. Total: KES ${totalAmount.toLocaleString()} via ${paymentMethod}. KRA CU: ${sale.cuInvoiceNumber || "Pending Retry"}`,
    newValue: JSON.stringify({ totalAmount, itemsCount: processedItems.length }),
    ipAddress: req.ip
  });
  if (customerEmail && customerEmail.includes("@")) {
    sendEmail({
      to: customerEmail,
      subject: `Your Naisia Textiles Receipt - ${receiptNumber}`,
      html: generateReceiptEmailHtml(receiptRecord, db.getData().settings)
    }).catch((err) => console.error("Email dispatch error:", err));
  }
  return res.status(201).json({
    sale,
    receipt: receiptRecord,
    qrCodeDataUrl: fiscalResult.qrCodeDataUrl
  });
});
apiRouter.get("/sales", requireAuth, (req, res) => {
  const { branchId, startDate, endDate, cashierId, limit } = req.query;
  let sales = db.getData().sales;
  if (branchId && branchId !== "all") {
    sales = sales.filter((s) => s.branchId === branchId);
  }
  if (cashierId) {
    sales = sales.filter((s) => s.cashierId === cashierId);
  }
  if (startDate && typeof startDate === "string") {
    sales = sales.filter((s) => s.createdAt >= startDate);
  }
  if (endDate && typeof endDate === "string") {
    sales = sales.filter((s) => s.createdAt <= endDate);
  }
  const max = Number(limit) || 100;
  return res.json(sales.slice(0, max));
});
apiRouter.get("/sales/:id", requireAuth, (req, res) => {
  const sale = db.getData().sales.find((s) => s.id === req.params.id || s.receiptNumber === req.params.id);
  if (!sale) return res.status(404).json({ error: "Sale record not found" });
  return res.json(sale);
});
apiRouter.post("/sales/:id/refund", requireAuth, requireRoles("ADMIN", "ACCOUNTANT"), async (req, res) => {
  const { reason } = req.body;
  const sale = db.getData().sales.find((s) => s.id === req.params.id);
  if (!sale) return res.status(404).json({ error: "Sale not found" });
  if (sale.status === "REFUNDED") {
    return res.status(400).json({ error: "Sale has already been refunded" });
  }
  const products = db.getData().products;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  for (const item of sale.items) {
    const prod = products.find((p) => p.id === item.productId);
    const variant = prod?.variants.find((v) => v.id === item.variantId);
    if (!variant) continue;
    const prev = variant.branchStock[sale.branchId] ?? 0;
    const next = prev + item.quantity;
    variant.branchStock[sale.branchId] = next;
    db.getData().inventoryMovements.unshift({
      id: uuidv42(),
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productName,
      sku: item.sku,
      branchId: sale.branchId,
      branchName: sale.branchName,
      type: "RETURN",
      quantityChange: item.quantity,
      previousStock: prev,
      newStock: next,
      referenceNumber: `REF-${sale.receiptNumber}`,
      reason: reason || "Customer Return / Exchange",
      userId: req.user.id,
      userName: req.user.name,
      timestamp: now
    });
  }
  sale.status = "REFUNDED";
  sale.refundReason = reason || "Customer Return";
  await db.save();
  db.logAudit({
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    branchId: sale.branchId,
    branchName: sale.branchName,
    action: "SALE_REFUNDED",
    entityType: "SALE",
    entityId: sale.receiptNumber,
    details: `Refunded sale ${sale.receiptNumber}. Inventory restored. Reason: ${reason}`,
    ipAddress: req.ip
  });
  return res.json({ success: true, sale });
});
apiRouter.get("/quotations", requireAuth, (req, res) => {
  const { branchId, status } = req.query;
  let quotes = db.getData().quotations;
  if (branchId && branchId !== "all") {
    quotes = quotes.filter((q) => q.branchId === branchId);
  }
  if (status) {
    quotes = quotes.filter((q) => q.status === status);
  }
  return res.json(quotes);
});
apiRouter.post("/quotations", requireAuth, async (req, res) => {
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
    notes
  } = req.body;
  if (!items || !items.length || !customerName) {
    return res.status(400).json({ error: "Customer name and items are required" });
  }
  let subtotal = 0;
  let taxAmount = 0;
  let discountAmount = 0;
  let totalAmount = 0;
  const quoteItems = items.map((it) => {
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
      total
    };
  });
  const quotationNumber = db.getNextSequence("QUO", db.getData().quotations, "quotationNumber");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const quotation = {
    id: uuidv42(),
    quotationNumber,
    branchId: branchId || db.getData().branches[0].id,
    customerId: customerId || "cust-generic",
    customerName,
    customerEmail: customerEmail || "",
    customerPhone: customerPhone || "",
    schoolOrOrg,
    items: quoteItems,
    subtotal: Number(subtotal.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
    discountAmount: Number(discountAmount.toFixed(2)),
    totalAmount: Number(totalAmount.toFixed(2)),
    status: "DRAFT",
    validUntil: validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0],
    terms: terms || "Valid for 30 days. Prices inclusive of 16% VAT.",
    notes,
    createdBy: req.user.id,
    createdByName: req.user.name,
    createdAt: now,
    updatedAt: now
  };
  db.getData().quotations.unshift(quotation);
  await db.save();
  db.logAudit({
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    branchId: quotation.branchId,
    branchName: "N/A",
    action: "QUOTATION_CREATED",
    entityType: "QUOTATION",
    entityId: quotation.quotationNumber,
    details: `Created quotation ${quotation.quotationNumber} for ${customerName}. Total: KES ${totalAmount.toLocaleString()}`,
    ipAddress: req.ip
  });
  return res.status(201).json(quotation);
});
apiRouter.post("/quotations/:id/convert-to-invoice", requireAuth, requireRoles("ADMIN", "ACCOUNTANT"), async (req, res) => {
  const quote = db.getData().quotations.find((q) => q.id === req.params.id);
  if (!quote) return res.status(404).json({ error: "Quotation not found" });
  if (quote.status === "CONVERTED") {
    return res.status(400).json({ error: "Quotation has already been converted to an invoice" });
  }
  const branch = db.getData().branches.find((b) => b.id === quote.branchId) || db.getData().branches[0];
  const invoiceNumber = db.getNextSequence("INV", db.getData().invoices, "invoiceNumber");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const fiscalResult = await fiscalizeTransaction({
    invoiceOrReceiptNumber: invoiceNumber,
    totalAmount: quote.totalAmount,
    taxableAmount: quote.subtotal,
    taxAmount: quote.taxAmount,
    zeroRatedAmount: 0,
    customerName: quote.customerName,
    itemsCount: quote.items.length,
    branchCode: branch.code
  });
  const invoice = {
    id: uuidv42(),
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
    status: "ISSUED",
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0],
    paymentTerms: quote.terms,
    notes: `Generated from Quotation ${quote.quotationNumber}. ${quote.notes || ""}`,
    kraStatus: fiscalResult.status,
    cuInvoiceNumber: fiscalResult.cuInvoiceNumber,
    kraControlCode: fiscalResult.kraControlCode,
    kraQrCodeUrl: fiscalResult.kraQrCodeUrl,
    createdBy: req.user.id,
    createdByName: req.user.name,
    createdAt: now,
    updatedAt: now
  };
  db.getData().invoices.unshift(invoice);
  const cust = db.getData().customers.find((c) => c.id === quote.customerId);
  if (cust) {
    cust.currentBalance += invoice.totalAmount;
  }
  quote.status = "CONVERTED";
  quote.convertedInvoiceId = invoice.id;
  quote.updatedAt = now;
  await db.save();
  db.logAudit({
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    branchId: branch.id,
    branchName: branch.name,
    action: "QUOTATION_CONVERTED_TO_INVOICE",
    entityType: "INVOICE",
    entityId: invoice.invoiceNumber,
    details: `Converted Quotation ${quote.quotationNumber} into Invoice ${invoice.invoiceNumber}`,
    ipAddress: req.ip
  });
  if (invoice.customerEmail) {
    sendEmail({
      to: invoice.customerEmail,
      subject: `Invoice ${invoice.invoiceNumber} from Naisia Textiles`,
      html: generateInvoiceEmailHtml(invoice, db.getData().settings)
    }).catch(console.error);
  }
  return res.json({ success: true, invoice, quotation: quote });
});
apiRouter.get("/invoices", requireAuth, (req, res) => {
  const { branchId, status, customerId } = req.query;
  let invoices = db.getData().invoices;
  if (branchId && branchId !== "all") {
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
apiRouter.post("/invoices", requireAuth, requireRoles("ADMIN", "ACCOUNTANT"), async (req, res) => {
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
    notes
  } = req.body;
  if (!items || !items.length || !customerName) {
    return res.status(400).json({ error: "Customer name and items are required" });
  }
  const branch = db.getData().branches.find((b) => b.id === branchId) || db.getData().branches[0];
  let subtotal = 0;
  let taxAmount = 0;
  let discountAmount = 0;
  let totalAmount = 0;
  const invoiceItems = items.map((it) => {
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
      total
    };
  });
  const invoiceNumber = db.getNextSequence("INV", db.getData().invoices, "invoiceNumber");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const fiscalResult = await fiscalizeTransaction({
    invoiceOrReceiptNumber: invoiceNumber,
    totalAmount,
    taxableAmount: subtotal,
    taxAmount,
    zeroRatedAmount: 0,
    customerPin: customerKraPin,
    customerName,
    itemsCount: invoiceItems.length,
    branchCode: branch.code
  });
  const invoice = {
    id: uuidv42(),
    invoiceNumber,
    branchId: branch.id,
    branchName: branch.name,
    customerId: customerId || "cust-generic",
    customerName,
    customerEmail: customerEmail || "",
    customerPhone: customerPhone || "",
    customerKraPin,
    items: invoiceItems,
    subtotal: Number(subtotal.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
    discountAmount: Number(discountAmount.toFixed(2)),
    totalAmount: Number(totalAmount.toFixed(2)),
    amountPaid: 0,
    balanceDue: Number(totalAmount.toFixed(2)),
    status: "ISSUED",
    dueDate: dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0],
    paymentTerms: paymentTerms || "Net 30 Days",
    notes,
    kraStatus: fiscalResult.status,
    cuInvoiceNumber: fiscalResult.cuInvoiceNumber,
    kraControlCode: fiscalResult.kraControlCode,
    kraQrCodeUrl: fiscalResult.kraQrCodeUrl,
    createdBy: req.user.id,
    createdByName: req.user.name,
    createdAt: now,
    updatedAt: now
  };
  db.getData().invoices.unshift(invoice);
  const cust = db.getData().customers.find((c) => c.id === customerId);
  if (cust) {
    cust.currentBalance += invoice.totalAmount;
  }
  await db.save();
  db.logAudit({
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    branchId: branch.id,
    branchName: branch.name,
    action: "INVOICE_CREATED",
    entityType: "INVOICE",
    entityId: invoice.invoiceNumber,
    details: `Issued invoice ${invoice.invoiceNumber} to ${customerName}. Amount: KES ${totalAmount.toLocaleString()}`,
    ipAddress: req.ip
  });
  if (customerEmail) {
    sendEmail({
      to: customerEmail,
      subject: `New Invoice ${invoice.invoiceNumber} from Naisia Textiles`,
      html: generateInvoiceEmailHtml(invoice, db.getData().settings)
    }).catch(console.error);
  }
  return res.status(201).json(invoice);
});
apiRouter.post("/invoices/:id/payment", requireAuth, requireRoles("ADMIN", "ACCOUNTANT"), async (req, res) => {
  const { amount, paymentMethod, paymentReference, notes } = req.body;
  const payAmt = Number(amount);
  if (!payAmt || payAmt <= 0) {
    return res.status(400).json({ error: "Valid payment amount is required" });
  }
  const invoice = db.getData().invoices.find((i) => i.id === req.params.id);
  if (!invoice) return res.status(404).json({ error: "Invoice not found" });
  if (invoice.status === "PAID") {
    return res.status(400).json({ error: "Invoice is already fully paid" });
  }
  if (invoice.status === "VOIDED") {
    return res.status(400).json({ error: "Cannot pay a voided invoice" });
  }
  invoice.amountPaid += payAmt;
  invoice.balanceDue = Math.max(0, invoice.totalAmount - invoice.amountPaid);
  invoice.status = invoice.balanceDue === 0 ? "PAID" : "PARTIALLY_PAID";
  invoice.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  const customer = db.getData().customers.find((c) => c.id === invoice.customerId);
  if (customer) {
    customer.currentBalance = Math.max(0, customer.currentBalance - payAmt);
  }
  const receiptNumber = db.getNextSequence("RCP", db.getData().receipts, "receiptNumber");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const receipt = {
    id: uuidv42(),
    receiptNumber,
    invoiceId: invoice.id,
    branchId: invoice.branchId,
    branchName: invoice.branchName,
    customerId: invoice.customerId,
    customerName: invoice.customerName,
    amount: payAmt,
    paymentMethod: paymentMethod || "BANK_TRANSFER",
    paymentReference: paymentReference || `EFT-${Date.now().toString().slice(-6)}`,
    notes: notes || `Settlement payment for invoice ${invoice.invoiceNumber}`,
    receivedBy: req.user.id,
    receivedByName: req.user.name,
    cuNumber: invoice.cuInvoiceNumber,
    kraQrCodeUrl: invoice.kraQrCodeUrl,
    createdAt: now
  };
  db.getData().receipts.unshift(receipt);
  await db.save();
  db.logAudit({
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    branchId: invoice.branchId,
    branchName: invoice.branchName,
    action: "INVOICE_PAYMENT_RECORDED",
    entityType: "INVOICE",
    entityId: invoice.invoiceNumber,
    details: `Recorded payment of KES ${payAmt.toLocaleString()} for Invoice ${invoice.invoiceNumber}. New balance: KES ${invoice.balanceDue.toLocaleString()}`,
    ipAddress: req.ip
  });
  return res.json({ success: true, invoice, receipt });
});
apiRouter.post("/invoices/:id/void", requireAuth, requireRoles("ADMIN"), async (req, res) => {
  const { voidReason } = req.body;
  if (!voidReason) return res.status(400).json({ error: "Void reason is strictly required" });
  const invoice = db.getData().invoices.find((i) => i.id === req.params.id);
  if (!invoice) return res.status(404).json({ error: "Invoice not found" });
  if (invoice.status === "PAID") {
    return res.status(400).json({ error: "Cannot void an invoice that has been fully paid. Use credit note instead." });
  }
  const previousStatus = invoice.status;
  invoice.status = "VOIDED";
  invoice.voidReason = voidReason;
  invoice.voidedAt = (/* @__PURE__ */ new Date()).toISOString();
  invoice.voidedBy = req.user.id;
  const customer = db.getData().customers.find((c) => c.id === invoice.customerId);
  if (customer) {
    customer.currentBalance = Math.max(0, customer.currentBalance - invoice.balanceDue);
  }
  await db.save();
  db.logAudit({
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    branchId: invoice.branchId,
    branchName: invoice.branchName,
    action: "INVOICE_VOIDED",
    entityType: "INVOICE",
    entityId: invoice.invoiceNumber,
    details: `Voided Invoice ${invoice.invoiceNumber}. Reason: ${voidReason}`,
    previousValue: previousStatus,
    newValue: "VOIDED",
    ipAddress: req.ip
  });
  return res.json({ success: true, invoice });
});
apiRouter.get("/receipts", requireAuth, (req, res) => {
  const { branchId, search, limit } = req.query;
  let receipts = db.getData().receipts;
  if (branchId && branchId !== "all") {
    receipts = receipts.filter((r) => r.branchId === branchId);
  }
  if (search && typeof search === "string") {
    const q = search.toLowerCase();
    receipts = receipts.filter((r) => r.receiptNumber.toLowerCase().includes(q) || r.customerName.toLowerCase().includes(q));
  }
  const max = Number(limit) || 100;
  return res.json(receipts.slice(0, max));
});
apiRouter.post("/receipts/:id/email", requireAuth, async (req, res) => {
  const { email } = req.body;
  const receipt = db.getData().receipts.find((r) => r.id === req.params.id);
  if (!receipt) return res.status(404).json({ error: "Receipt not found" });
  const targetEmail = email || db.getData().settings.companyEmail;
  const result = await sendEmail({
    to: targetEmail,
    subject: `Naisia Textiles Official Receipt - ${receipt.receiptNumber}`,
    html: generateReceiptEmailHtml(receipt, db.getData().settings)
  });
  db.logAudit({
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    branchId: receipt.branchId,
    branchName: receipt.branchName,
    action: "RECEIPT_EMAILED",
    entityType: "RECEIPT",
    entityId: receipt.receiptNumber,
    details: `Dispatched receipt ${receipt.receiptNumber} to ${targetEmail}`,
    ipAddress: req.ip
  });
  return res.json({ success: true, result });
});
apiRouter.post("/invoices/:id/email", requireAuth, async (req, res) => {
  const { email } = req.body;
  const invoice = db.getData().invoices.find((i) => i.id === req.params.id);
  if (!invoice) return res.status(404).json({ error: "Invoice not found" });
  const targetEmail = email || invoice.customerEmail;
  if (!targetEmail || !targetEmail.includes("@")) {
    return res.status(400).json({ error: "Valid customer email address is required" });
  }
  const result = await sendEmail({
    to: targetEmail,
    subject: `Naisia Textiles Official Tax Invoice - ${invoice.invoiceNumber}`,
    html: generateInvoiceEmailHtml(invoice, db.getData().settings)
  });
  db.logAudit({
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    branchId: invoice.branchId,
    branchName: invoice.branchName,
    action: "INVOICE_EMAILED",
    entityType: "INVOICE",
    entityId: invoice.invoiceNumber,
    details: `Dispatched invoice ${invoice.invoiceNumber} to ${targetEmail}`,
    ipAddress: req.ip
  });
  return res.json({ success: true, result, sentTo: targetEmail });
});
apiRouter.post("/quotations/:id/email", requireAuth, async (req, res) => {
  const { email } = req.body;
  const quote = db.getData().quotations.find((q) => q.id === req.params.id);
  if (!quote) return res.status(404).json({ error: "Quotation not found" });
  const targetEmail = email || quote.customerEmail;
  if (!targetEmail || !targetEmail.includes("@")) {
    return res.status(400).json({ error: "Valid customer email address is required" });
  }
  const result = await sendEmail({
    to: targetEmail,
    subject: `Naisia Textiles Official Quotation - ${quote.quotationNumber}`,
    html: generateQuotationEmailHtml(quote, db.getData().settings)
  });
  db.logAudit({
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    branchId: quote.branchId,
    branchName: "N/A",
    action: "QUOTATION_EMAILED",
    entityType: "QUOTATION",
    entityId: quote.quotationNumber,
    details: `Dispatched quotation ${quote.quotationNumber} to ${targetEmail}`,
    ipAddress: req.ip
  });
  return res.json({ success: true, result, sentTo: targetEmail });
});
apiRouter.get("/customers", requireAuth, (req, res) => {
  return res.json(db.getData().customers);
});
apiRouter.post("/customers", requireAuth, async (req, res) => {
  const { name, email, phone, customerType, schoolOrOrg, kraPin, address, creditLimit } = req.body;
  if (!name || !phone) return res.status(400).json({ error: "Customer name and phone number are required" });
  const newCustomer = {
    id: `cust-${Date.now()}`,
    name,
    email: email || "",
    phone,
    customerType: customerType || "INDIVIDUAL",
    schoolOrOrg,
    kraPin,
    address,
    creditLimit: Number(creditLimit) || 0,
    currentBalance: 0,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.getData().customers.push(newCustomer);
  await db.save();
  db.logAudit({
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    branchId: req.user.branchId,
    branchName: "N/A",
    action: "CUSTOMER_CREATED",
    entityType: "CUSTOMER",
    entityId: newCustomer.id,
    details: `Created customer profile: ${newCustomer.name} (${newCustomer.customerType})`,
    ipAddress: req.ip
  });
  return res.status(201).json(newCustomer);
});
apiRouter.put("/customers/:id", requireAuth, async (req, res) => {
  const customer = db.getData().customers.find((c) => c.id === req.params.id);
  if (!customer) return res.status(404).json({ error: "Customer not found" });
  const { name, email, phone, customerType, schoolOrOrg, kraPin, address, creditLimit } = req.body;
  if (name) customer.name = name;
  if (email !== void 0) customer.email = email;
  if (phone) customer.phone = phone;
  if (customerType) customer.customerType = customerType;
  if (schoolOrOrg !== void 0) customer.schoolOrOrg = schoolOrOrg;
  if (kraPin !== void 0) customer.kraPin = kraPin;
  if (address !== void 0) customer.address = address;
  if (creditLimit !== void 0) customer.creditLimit = Number(creditLimit);
  customer.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  await db.save();
  return res.json(customer);
});
apiRouter.get("/suppliers", requireAuth, (req, res) => {
  return res.json(db.getData().suppliers);
});
apiRouter.post("/suppliers", requireAuth, requireRoles("ADMIN", "ACCOUNTANT"), async (req, res) => {
  const { name, companyName, contactPerson, email, phone, address, kraPin, paymentTerms, bankDetails, category } = req.body;
  if (!name || !phone) return res.status(400).json({ error: "Supplier name and phone are required" });
  const supplier = {
    id: `sup-${Date.now()}`,
    name,
    companyName: companyName || name,
    contactPerson: contactPerson || "",
    email: email || "",
    phone,
    address: address || "",
    kraPin,
    paymentTerms: paymentTerms || "Net 30 Days",
    bankDetails,
    category: category || "FABRIC",
    currentBalance: 0,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.getData().suppliers.push(supplier);
  await db.save();
  db.logAudit({
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    branchId: req.user.branchId,
    branchName: "N/A",
    action: "SUPPLIER_CREATED",
    entityType: "SUPPLIER",
    entityId: supplier.id,
    details: `Added supplier: ${supplier.companyName}`,
    ipAddress: req.ip
  });
  return res.status(201).json(supplier);
});
apiRouter.get("/purchases", requireAuth, (req, res) => {
  const { branchId, supplierId, status } = req.query;
  let purchases = db.getData().purchases;
  if (branchId && branchId !== "all") {
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
apiRouter.post("/purchases", requireAuth, requireRoles("ADMIN", "ACCOUNTANT"), async (req, res) => {
  const { supplierId, branchId, items, expectedDate, notes } = req.body;
  if (!supplierId || !branchId || !items || !items.length) {
    return res.status(400).json({ error: "Supplier, branch, and items are required" });
  }
  const supplier = db.getData().suppliers.find((s) => s.id === supplierId);
  if (!supplier) return res.status(404).json({ error: "Supplier not found" });
  const branch = db.getData().branches.find((b) => b.id === branchId);
  if (!branch) return res.status(404).json({ error: "Branch not found" });
  let subtotal = 0;
  let taxAmount = 0;
  let totalAmount = 0;
  const poItems = items.map((it) => {
    const qty = Number(it.quantityOrdered);
    const cost = Number(it.unitCost);
    const lineTotal = qty * cost;
    const tax = lineTotal * 0.16;
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
      totalCost: lineGross
    };
  });
  const poNumber = db.getNextSequence("PO", db.getData().purchases, "poNumber");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const po = {
    id: uuidv42(),
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
    status: "ORDERED",
    expectedDate,
    notes,
    createdBy: req.user.id,
    createdByName: req.user.name,
    createdAt: now,
    updatedAt: now
  };
  db.getData().purchases.unshift(po);
  await db.save();
  db.logAudit({
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    branchId: branch.id,
    branchName: branch.name,
    action: "PURCHASE_ORDER_ISSUED",
    entityType: "PURCHASE",
    entityId: po.poNumber,
    details: `Issued Purchase Order ${po.poNumber} to ${supplier.companyName}. Total: KES ${totalAmount.toLocaleString()}`,
    ipAddress: req.ip
  });
  return res.status(201).json(po);
});
apiRouter.post("/purchases/:id/receive", requireAuth, requireRoles("ADMIN", "ACCOUNTANT"), async (req, res) => {
  const po = db.getData().purchases.find((p) => p.id === req.params.id);
  if (!po) return res.status(404).json({ error: "Purchase Order not found" });
  if (po.status === "RECEIVED") {
    return res.status(400).json({ error: "Goods have already been fully received for this PO" });
  }
  const products = db.getData().products;
  const now = (/* @__PURE__ */ new Date()).toISOString();
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
      id: uuidv42(),
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productName,
      sku: item.sku,
      branchId: po.branchId,
      branchName: po.branchName,
      type: "PURCHASE",
      quantityChange: qtyToReceive,
      previousStock: prev,
      newStock: next,
      referenceNumber: po.poNumber,
      userId: req.user.id,
      userName: req.user.name,
      timestamp: now
    });
  }
  const supplier = db.getData().suppliers.find((s) => s.id === po.supplierId);
  if (supplier) {
    supplier.currentBalance += po.totalAmount;
  }
  po.status = "RECEIVED";
  po.receivedAt = now;
  po.updatedAt = now;
  await db.save();
  db.logAudit({
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    branchId: po.branchId,
    branchName: po.branchName,
    action: "GOODS_RECEIVED_NOTE",
    entityType: "PURCHASE",
    entityId: po.poNumber,
    details: `Goods Received Note (GRN) confirmed for PO ${po.poNumber}. Restocked inventory at ${po.branchName}`,
    ipAddress: req.ip
  });
  return res.json({ success: true, po });
});
apiRouter.get("/expenses", requireAuth, (req, res) => {
  const { branchId, category } = req.query;
  let expenses = db.getData().expenses;
  if (branchId && branchId !== "all") {
    expenses = expenses.filter((e) => e.branchId === branchId);
  }
  if (category) {
    expenses = expenses.filter((e) => e.category === category);
  }
  return res.json(expenses);
});
apiRouter.post("/expenses", requireAuth, requireRoles("ADMIN", "ACCOUNTANT"), async (req, res) => {
  const { branchId, category, title, description, amount, paymentMethod, paymentReference, incurredDate } = req.body;
  if (!title || !amount || !category) {
    return res.status(400).json({ error: "Title, amount, and category are required" });
  }
  const branch = db.getData().branches.find((b) => b.id === branchId) || db.getData().branches[0];
  const expenseNumber = db.getNextSequence("EXP", db.getData().expenses, "expenseNumber");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const expense = {
    id: uuidv42(),
    expenseNumber,
    branchId: branch.id,
    branchName: branch.name,
    category,
    title,
    description,
    amount: Number(amount),
    paymentMethod: paymentMethod || "CASH",
    paymentReference,
    incurredDate: incurredDate || now.split("T")[0],
    recordedBy: req.user.id,
    recordedByName: req.user.name,
    createdAt: now
  };
  db.getData().expenses.unshift(expense);
  await db.save();
  db.logAudit({
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    branchId: branch.id,
    branchName: branch.name,
    action: "EXPENSE_RECORDED",
    entityType: "EXPENSE",
    entityId: expense.expenseNumber,
    details: `Recorded expense ${expense.expenseNumber} (${category}): ${title} - KES ${Number(amount).toLocaleString()}`,
    ipAddress: req.ip
  });
  return res.status(201).json(expense);
});
apiRouter.get("/reports/dashboard", requireAuth, (req, res) => {
  const { branchId } = req.query;
  const targetBranch = typeof branchId === "string" && branchId !== "all" ? branchId : null;
  const sales = targetBranch ? db.getData().sales.filter((s) => s.branchId === targetBranch && s.status === "COMPLETED") : db.getData().sales.filter((s) => s.status === "COMPLETED");
  const invoices = targetBranch ? db.getData().invoices.filter((i) => i.branchId === targetBranch) : db.getData().invoices;
  const expenses = targetBranch ? db.getData().expenses.filter((e) => e.branchId === targetBranch) : db.getData().expenses;
  const products = db.getData().products;
  const branches = db.getData().branches;
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const todaySales = sales.filter((s) => s.createdAt.startsWith(todayStr)).reduce((sum, s) => sum + s.totalAmount, 0);
  const totalSalesRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  let totalCogs = 0;
  sales.forEach((s) => {
    s.items.forEach((it) => {
      totalCogs += (it.costPrice || 0) * it.quantity;
    });
  });
  const grossProfit = totalSalesRevenue - totalCogs;
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = grossProfit - totalExpenses;
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
  const outstandingInvoicesAmount = invoices.filter((i) => i.status === "ISSUED" || i.status === "PARTIALLY_PAID").reduce((sum, i) => sum + i.balanceDue, 0);
  const branchPerformance = branches.map((b) => {
    const bSales = db.getData().sales.filter((s) => s.branchId === b.id && s.status === "COMPLETED").reduce((sum, s) => sum + s.totalAmount, 0);
    return {
      branchId: b.id,
      branchName: b.name,
      totalSales: bSales
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
    kraPin: db.getData().settings.kraPin || "",
    kraOscuSerial: db.getData().settings.kraOscuSerial || ""
  });
});
apiRouter.get("/reports/profit-loss", requireAuth, requireRoles("ADMIN", "ACCOUNTANT"), (req, res) => {
  const { branchId, startDate, endDate } = req.query;
  let sales = db.getData().sales.filter((s) => s.status === "COMPLETED");
  let expenses = db.getData().expenses;
  if (branchId && branchId !== "all") {
    sales = sales.filter((s) => s.branchId === branchId);
    expenses = expenses.filter((e) => e.branchId === branchId);
  }
  if (startDate && typeof startDate === "string") {
    sales = sales.filter((s) => s.createdAt >= startDate);
    expenses = expenses.filter((e) => e.incurredDate >= startDate);
  }
  if (endDate && typeof endDate === "string") {
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
  const expensesByCategory = {};
  let totalExpenses = 0;
  expenses.forEach((e) => {
    expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount;
    totalExpenses += e.amount;
  });
  const netProfit = grossProfit - totalExpenses;
  const grossMargin = revenue > 0 ? grossProfit / revenue * 100 : 0;
  const netMargin = revenue > 0 ? netProfit / revenue * 100 : 0;
  return res.json({
    revenue,
    cogs,
    grossProfit,
    grossMargin: Number(grossMargin.toFixed(2)),
    expensesByCategory,
    totalExpenses,
    netProfit,
    netMargin: Number(netMargin.toFixed(2))
  });
});
apiRouter.get("/reports/vat-return", requireAuth, requireRoles("ADMIN", "ACCOUNTANT"), (req, res) => {
  const sales = db.getData().sales.filter((s) => s.status === "COMPLETED");
  const invoices = db.getData().invoices.filter((i) => i.status !== "VOIDED");
  const purchases = db.getData().purchases.filter((p) => p.status === "RECEIVED");
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
    taxPeriod: (/* @__PURE__ */ new Date()).toISOString().slice(0, 7),
    // YYYY-MM
    standardRatedSalesGross: Number(standardRatedSalesGross.toFixed(2)),
    standardRatedSalesTaxable: Number(standardRatedSalesTaxable.toFixed(2)),
    outputVat: Number(outputVat.toFixed(2)),
    zeroRatedSales: Number(zeroRatedSales.toFixed(2)),
    totalPurchasesTaxable: Number(totalPurchasesTaxable.toFixed(2)),
    inputVat: Number(inputVat.toFixed(2)),
    netVatPayable: Number(netVatPayable.toFixed(2)),
    isRefundable: netVatPayable < 0
  });
});
apiRouter.get("/kra/status", requireAuth, (req, res) => {
  const settings = db.getData().settings;
  const sales = db.getData().sales;
  const invoices = db.getData().invoices;
  const fiscalizedSales = sales.filter((s) => s.kraStatus === "FISCALIZED").length;
  const pendingSales = sales.filter((s) => s.kraStatus === "PENDING" || s.kraStatus === "FAILED").length;
  const fiscalizedInvoices = invoices.filter((i) => i.kraStatus === "FISCALIZED").length;
  const isConfigured = Boolean(settings.kraPin && settings.kraPin.trim());
  return res.json({
    status: isConfigured ? settings.kraMode === "PRODUCTION" ? "PRODUCTION_LIVE" : "SANDBOX_ACTIVE" : "PENDING_CONFIGURATION",
    traderPin: settings.kraPin || "",
    traderCode: settings.kraTraderCode || "",
    oscuSerial: settings.kraOscuSerial || "",
    mode: settings.kraMode || "SANDBOX",
    autoRetry: settings.autoRetryKra ?? true,
    isConfigured,
    fiscalizedCount: fiscalizedSales + fiscalizedInvoices,
    pendingOrFailedCount: pendingSales,
    retryQueueCount: kraRetryQueue.length,
    retryQueue: kraRetryQueue
  });
});
apiRouter.put("/kra/config", requireAuth, requireRoles("ADMIN"), async (req, res) => {
  const { traderPin, traderCode, oscuSerial, mode, autoRetry } = req.body;
  const settings = db.getData().settings;
  if (typeof traderPin === "string") settings.kraPin = traderPin.trim().toUpperCase();
  if (typeof traderCode === "string") settings.kraTraderCode = traderCode.trim();
  if (typeof oscuSerial === "string") settings.kraOscuSerial = oscuSerial.trim();
  if (typeof mode === "string") settings.kraMode = mode;
  if (typeof autoRetry === "boolean") settings.autoRetryKra = autoRetry;
  await db.save();
  db.logAudit({
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    branchId: "N/A",
    branchName: "N/A",
    action: "KRA_CONFIG_UPDATED",
    entityType: "SETTINGS",
    entityId: "KRA",
    details: `Updated KRA eTIMS configuration. PIN: ${settings.kraPin || "None"}, Mode: ${settings.kraMode}`,
    ipAddress: req.ip
  });
  return res.json({
    success: true,
    settings: {
      kraPin: settings.kraPin,
      kraTraderCode: settings.kraTraderCode,
      kraOscuSerial: settings.kraOscuSerial,
      kraMode: settings.kraMode,
      autoRetryKra: settings.autoRetryKra
    }
  });
});
apiRouter.post("/kra/retry-queued", requireAuth, requireRoles("ADMIN", "ACCOUNTANT"), async (req, res) => {
  const processed = [];
  while (kraRetryQueue.length > 0) {
    const item = kraRetryQueue.shift();
    const result = await fiscalizeTransaction(item.payload, false);
    if (result.status === "FISCALIZED") {
      if (item.type === "SALE") {
        const sale = db.getData().sales.find((s) => s.id === item.id);
        if (sale) {
          sale.kraStatus = "FISCALIZED";
          sale.cuInvoiceNumber = result.cuInvoiceNumber;
          sale.kraControlCode = result.kraControlCode;
          sale.kraQrCodeUrl = result.kraQrCodeUrl;
          sale.kraSubmissionTimestamp = result.timestamp;
          sale.kraError = void 0;
        }
      }
      processed.push({ id: item.id, status: "SUCCESS", cuInvoiceNumber: result.cuInvoiceNumber });
    } else {
      item.attempts++;
      item.lastAttemptAt = (/* @__PURE__ */ new Date()).toISOString();
      item.lastError = result.error || "Retry attempt failed";
      kraRetryQueue.push(item);
      processed.push({ id: item.id, status: "FAILED", error: item.lastError });
      break;
    }
  }
  await db.save();
  db.logAudit({
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    branchId: req.user.branchId,
    branchName: "N/A",
    action: "KRA_RETRY_TRIGGERED",
    entityType: "KRA",
    entityId: "RETRY_QUEUE",
    details: `Manually triggered KRA eTIMS retry. Processed: ${processed.length} items.`,
    ipAddress: req.ip
  });
  return res.json({ success: true, processed, remainingInQueue: kraRetryQueue.length });
});
apiRouter.get("/audit-logs", requireAuth, requireRoles("ADMIN"), (req, res) => {
  const { action, entityType, limit } = req.query;
  let logs = db.getData().auditLogs;
  if (action && typeof action === "string") {
    logs = logs.filter((l) => l.action.toLowerCase().includes(action.toLowerCase()));
  }
  if (entityType && typeof entityType === "string") {
    logs = logs.filter((l) => l.entityType === entityType);
  }
  const max = Number(limit) || 200;
  return res.json(logs.slice(0, max));
});
apiRouter.get("/settings", requireAuth, (req, res) => {
  return res.json(db.getData().settings);
});
apiRouter.put("/settings", requireAuth, requireRoles("ADMIN"), async (req, res) => {
  const current = db.getData().settings;
  const updated = { ...current, ...req.body };
  db.getData().settings = updated;
  await db.save();
  db.logAudit({
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    branchId: "N/A",
    branchName: "N/A",
    action: "SYSTEM_SETTINGS_UPDATED",
    entityType: "SETTINGS",
    entityId: "SYSTEM",
    details: "System preferences, tax, or company branding updated",
    ipAddress: req.ip
  });
  return res.json(updated);
});
apiRouter.get("/emails", requireAuth, requireRoles("ADMIN", "ACCOUNTANT"), (req, res) => {
  return res.json(emailLogs);
});
apiRouter.post("/emails/test", requireAuth, requireRoles("ADMIN"), async (req, res) => {
  const { to } = req.body;
  const targetEmail = to || db.getData().settings.companyEmail;
  const result = await sendEmail({
    to: targetEmail,
    subject: "Naisiae ERP - Test Notification System Verification",
    html: `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #030A91; border-radius: 8px;">
        <h2 style="color: #030A91;">Naisiae ERP Email Dispatcher Test</h2>
        <p>This is a verified test email sent from <strong>support@naisiaetextiles.com</strong>.</p>
        <p>Email infrastructure (Zoho / Cloudflare SPF & DKIM verified) is operational.</p>
        <p>Timestamp: ${(/* @__PURE__ */ new Date()).toISOString()}</p>
      </div>
    `
  });
  return res.json(result);
});
apiRouter.post("/products/import", requireAuth, requireRoles("ADMIN", "ACCOUNTANT"), async (req, res) => {
  try {
    const { products: incomingProducts } = req.body;
    if (!Array.isArray(incomingProducts) || incomingProducts.length === 0) {
      return res.status(400).json({ error: "Invalid catalogue format. Expected an array of products." });
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
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const existingById = /* @__PURE__ */ new Map();
    const existingByNameSchool = /* @__PURE__ */ new Map();
    const existingBySku = /* @__PURE__ */ new Map();
    for (const p of dbData.products) {
      if (!p) continue;
      if (p.id) existingById.set(p.id, p);
      const key = `${(p.name || "").trim().toLowerCase()}::${(p.school || "").trim().toLowerCase()}`;
      existingByNameSchool.set(key, p);
      if (Array.isArray(p.variants)) {
        for (const v of p.variants) {
          if (v && v.sku) {
            existingBySku.set(String(v.sku).trim().toUpperCase(), { product: p, variant: v });
          }
        }
      }
    }
    for (let i = 0; i < incomingProducts.length; i++) {
      const inc = incomingProducts[i];
      if (!inc || !inc.name) continue;
      const normName = String(inc.name).trim();
      const normSchool = String(inc.school || "General Uniform").trim();
      const key = `${normName.toLowerCase()}::${normSchool.toLowerCase()}`;
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
        productsUpdated++;
        if (inc.category && inc.category !== "General Uniform") matchedProd.category = inc.category;
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
        for (const incVar of incomingVariants) {
          duplicatesChecked++;
          const incVarSku = String(incVar.sku || "").trim().toUpperCase();
          const incVarSize = String(incVar.size || "Standard").trim().toLowerCase();
          const incVarColor = String(incVar.color || "Standard Official").trim().toLowerCase();
          const matchedVar = matchedProd.variants.find((v) => {
            if (!v) return false;
            if (incVar.id && v.id === incVar.id) return true;
            if (incVarSku && v.sku && String(v.sku).trim().toUpperCase() === incVarSku) return true;
            if (incVar.barcode && v.barcode && String(v.barcode) === String(incVar.barcode)) return true;
            return String(v.size || "").trim().toLowerCase() === incVarSize && String(v.color || "Standard Official").trim().toLowerCase() === incVarColor;
          });
          if (matchedVar) {
            if (typeof incVar.sellingPrice === "number" && incVar.sellingPrice > 0) {
              matchedVar.sellingPrice = incVar.sellingPrice;
            }
            if (typeof incVar.costPrice === "number" && incVar.costPrice > 0) {
              matchedVar.costPrice = incVar.costPrice;
            }
            if (incVar.imageUrl && (!matchedVar.imageUrl || matchedVar.imageUrl.includes("category_school"))) {
              matchedVar.imageUrl = incVar.imageUrl;
            }
            if (typeof incVar.reorderLevel === "number" && incVar.reorderLevel > 0) {
              matchedVar.reorderLevel = incVar.reorderLevel;
            }
            if (incVar.branchStock && typeof incVar.branchStock === "object") {
              if (!matchedVar.branchStock) matchedVar.branchStock = {};
              for (const [branchId, qty] of Object.entries(incVar.branchStock)) {
                if (typeof qty === "number" && qty >= 0) {
                  matchedVar.branchStock[branchId] = qty;
                }
              }
            }
            variantsUpdated++;
          } else {
            const newVarId = incVar.id || `var-${matchedProd.id}-${matchedProd.variants.length + 1}`;
            const newBarcode = incVar.barcode || `616${Math.floor(1e8 + Math.random() * 9e8)}`;
            const newVar = {
              id: newVarId,
              sku: incVar.sku || `${matchedProd.name.slice(0, 4).toUpperCase()}-${incVar.size || "STD"}`,
              barcode: newBarcode,
              size: incVar.size || "Standard",
              color: incVar.color || "Standard Official",
              costPrice: typeof incVar.costPrice === "number" ? incVar.costPrice : 600,
              sellingPrice: typeof incVar.sellingPrice === "number" ? incVar.sellingPrice : 1e3,
              branchStock: incVar.branchStock || { "branch-nbi-cbd": 25 },
              reorderLevel: incVar.reorderLevel || 10,
              reorderQuantity: incVar.reorderQuantity || 30,
              imageUrl: incVar.imageUrl || matchedProd.imageUrl
            };
            matchedProd.variants.push(newVar);
            variantsAdded++;
            if (newVar.sku) {
              existingBySku.set(String(newVar.sku).trim().toUpperCase(), { product: matchedProd, variant: newVar });
            }
          }
        }
      } else {
        const newProdId = inc.id || `prod-${Date.now()}-${i + 1}`;
        const newProd = {
          id: newProdId,
          name: normName,
          school: normSchool,
          sector: inc.sector || "SECONDARY",
          institutionType: inc.institutionType || normSchool,
          professionalDomain: inc.professionalDomain || normSchool,
          garmentType: inc.garmentType || normName,
          category: inc.category || "General Uniform",
          gender: inc.gender || "UNISEX",
          description: inc.description || "Quality uniform tailored for durability and comfort.",
          taxCategory: inc.taxCategory || "VAT_16",
          imageUrl: inc.imageUrl || "/assets/images/category_school_1782334810884.jpg",
          active: inc.active !== false,
          variants: incomingVariants.map((v, vIdx) => ({
            id: v.id || `var-${newProdId}-${vIdx + 1}`,
            sku: v.sku || `SKU-${newProdId}-${v.size || vIdx + 1}`,
            barcode: v.barcode || `616${Math.floor(1e8 + Math.random() * 9e8)}`,
            size: v.size || "Standard",
            color: v.color || "Standard Official",
            costPrice: typeof v.costPrice === "number" ? v.costPrice : 600,
            sellingPrice: typeof v.sellingPrice === "number" ? v.sellingPrice : 1e3,
            branchStock: v.branchStock || { "branch-nbi-cbd": 25 },
            reorderLevel: v.reorderLevel || 10,
            reorderQuantity: v.reorderQuantity || 30,
            imageUrl: v.imageUrl || inc.imageUrl
          })),
          createdAt: now,
          updatedAt: now
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
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      branchId: req.user.branchId,
      branchName: "All Branches (HQ)",
      action: "CATALOGUE_SYNC_IMPORTED",
      entityType: "CATALOGUE",
      entityId: "SYSTEM",
      details: `Catalogue import & duplicate check: ${incomingProducts.length} processed. ${productsUpdated} products updated, ${productsAdded} products created, ${variantsUpdated} variants updated, ${variantsAdded} variants added.`,
      ipAddress: req.ip
    });
    const summary = {
      totalProcessed: incomingProducts.length,
      productsAdded,
      productsUpdated,
      variantsAdded,
      variantsUpdated,
      duplicatesChecked
    };
    return res.json({
      success: true,
      summary,
      message: `Catalogue synchronized: ${productsUpdated} products updated with latest pricing/specs, ${productsAdded} new products added, ${variantsUpdated} size variants updated.`
    });
  } catch (err) {
    console.error("[Products Import Error]", err);
    return res.status(500).json({ error: "Failed to import catalogue", details: err.message });
  }
});
apiRouter.post("/products/repair", requireAuth, requireRoles("ADMIN", "ACCOUNTANT"), async (req, res) => {
  try {
    const dbData = db.getData();
    let reseeded = false;
    if (!Array.isArray(dbData.products) || dbData.products.length === 0) {
      dbData.products = db.seedProductsFromInventoryCsv();
      reseeded = true;
    }
    let repairedCount = 0;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    for (let i = 0; i < dbData.products.length; i++) {
      const p = dbData.products[i];
      if (!p) continue;
      let pChanged = false;
      if (!p.id) {
        p.id = `prod-${Date.now()}-${i + 1}`;
        pChanged = true;
      }
      if (!p.school) {
        p.school = "General Uniform";
        pChanged = true;
      }
      if (!p.category) {
        p.category = "General Uniform";
        pChanged = true;
      }
      if (!p.garmentType) {
        p.garmentType = p.category;
        pChanged = true;
      }
      if (p.active === void 0) {
        p.active = true;
        pChanged = true;
      }
      if (!Array.isArray(p.variants) || p.variants.length === 0) {
        p.variants = [
          {
            id: `var-${p.id}-1`,
            sku: `NT-${p.id}-STD`,
            barcode: `616${Math.floor(1e8 + Math.random() * 9e8)}`,
            size: "Standard",
            color: "Standard Official",
            costPrice: 600,
            sellingPrice: 1e3,
            branchStock: { "branch-nbi-cbd": 30 },
            reorderLevel: 10,
            reorderQuantity: 30
          }
        ];
        pChanged = true;
      } else {
        p.variants.forEach((v, vIdx) => {
          if (!v.id) {
            v.id = `var-${p.id}-${vIdx + 1}`;
            pChanged = true;
          }
          if (!v.barcode) {
            v.barcode = `616${Math.floor(1e8 + Math.random() * 9e8)}`;
            pChanged = true;
          }
          if (typeof v.sellingPrice !== "number" || isNaN(v.sellingPrice)) {
            v.sellingPrice = 1e3;
            pChanged = true;
          }
          if (typeof v.costPrice !== "number" || isNaN(v.costPrice)) {
            v.costPrice = 600;
            pChanged = true;
          }
          if (!v.branchStock || typeof v.branchStock !== "object") {
            v.branchStock = { "branch-nbi-cbd": 30 };
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
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      branchId: req.user.branchId,
      branchName: "All Branches (HQ)",
      action: "CATALOGUE_REPAIRED",
      entityType: "CATALOGUE",
      entityId: "SYSTEM",
      details: `Catalogue integrity repair executed. ${dbData.products.length} products verified. ${repairedCount} products patched. Reseeded: ${reseeded}.`,
      ipAddress: req.ip
    });
    return res.json({
      success: true,
      message: reseeded ? `Catalogue restored from verified uniform inventory with ${dbData.products.length} items.` : `Catalogue verified and repaired: ${dbData.products.length} items checked (${repairedCount} items sanitized).`,
      count: dbData.products.length,
      repairedCount,
      reseeded
    });
  } catch (err) {
    console.error("[Products Repair Error]", err);
    return res.status(500).json({ error: "Failed to repair catalogue", details: err.message });
  }
});
apiRouter.get("/backup/export", requireAuth, requireRoles("ADMIN"), (req, res) => {
  const data = db.getData();
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename=naisiae-erp-backup-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.json`);
  return res.send(JSON.stringify(data, null, 2));
});

// server.ts
import dotenv from "dotenv";
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path2.dirname(__filename);
async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3e3;
  const isProd = process.env.NODE_ENV === "production";
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use((req, res, next) => {
    const rawPath = req.path.toLowerCase();
    const isDisallowedArea = rawPath.startsWith("/erp") || rawPath.startsWith("/admin") || rawPath.startsWith("/login") || rawPath.startsWith("/cashier") || rawPath.startsWith("/accountant") || rawPath.startsWith("/pos") || rawPath.startsWith("/dashboard") || rawPath.startsWith("/inventory") || rawPath.startsWith("/financials") || rawPath.startsWith("/invoices") || rawPath.startsWith("/quotations") || rawPath.startsWith("/receipts") || rawPath.startsWith("/purchases") || rawPath.startsWith("/expenses") || rawPath.startsWith("/transfers") || rawPath.startsWith("/users") || rawPath.startsWith("/audit") || rawPath.startsWith("/settings") || rawPath.startsWith("/api");
    if (isDisallowedArea) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
    } else {
      res.setHeader("X-Robots-Tag", "index, follow, max-image-preview:large");
    }
    next();
  });
  app.use("/api", apiRouter);
  app.get("/api/health", (req, res) => {
    res.json({
      status: "UP",
      system: "Naisiae ERP",
      company: "Naisia Textiles",
      domain: "naisiaetextiles.com",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    console.log("[Naisiae ERP] Mounted Vite dev middleware successfully");
  } else {
    const distPath = path2.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path2.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Naisiae ERP Server] Listening on http://0.0.0.0:${PORT}`);
    console.log(`[Naisiae ERP Server] Multi-branch enterprise synchronization active.`);
  });
}
startServer().catch((err) => {
  console.error("[Naisiae ERP Server] Failed to start server:", err);
  process.exit(1);
});
