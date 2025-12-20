import { ID, Query } from 'appwrite';
import { databases } from './client';

const DATABASE_ID = 'omnishop_db';
const COLLECTION_ID = 'payments';

// ============================================================================
// Types
// ============================================================================

export type PaymentType = 'IN' | 'OUT';
export type PaymentCategory =
    | 'SALE'
    | 'PURCHASE'
    | 'EXPENSE'
    | 'CUSTOMER_PAYMENT' // Customer paying off debt
    | 'SUPPLIER_PAYMENT' // We paying off supplier debt
    | 'TRANSFER' // Internal transfer
    | 'ADJUSTMENT'; // Manual fix

export interface Payment {
    $id: string;
    tenantId: string;
    type: PaymentType;
    category: PaymentCategory;
    entityId?: string; // CustomerId or SupplierId
    amount: number;
    method: string; // Cash, Card, Bank, Credit (for unpaid)
    referenceId?: string; // SaleID, PO_ID
    date: string;
    createdAt: string;
}

export interface CreatePaymentData {
    tenantId: string;
    type: PaymentType;
    category: PaymentCategory;
    entityId?: string;
    amount: number;
    method: string;
    referenceId?: string;
    // date is auto-set by Appwrite $createdAt
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Record a new payment/transaction in the ledger
 */
export async function createPayment(data: CreatePaymentData): Promise<Payment> {
    console.log("[Payments] Creating payment:", data);

    try {
        const response = await databases.createDocument(
            DATABASE_ID,
            COLLECTION_ID,
            ID.unique(),
            {
                tenantId: data.tenantId,
                type: data.type,
                category: data.category,
                entityId: data.entityId || null,
                amount: data.amount,
                method: data.method || 'Cash',
                referenceId: data.referenceId || null,
                // date uses Appwrite's built-in $createdAt
            }
        );

        console.log("[Payments] Payment created successfully:", response.$id);

        return {
            $id: response.$id,
            tenantId: response.tenantId,
            type: response.type as PaymentType,
            category: response.category as PaymentCategory,
            entityId: response.entityId,
            amount: response.amount,
            method: response.method,
            referenceId: response.referenceId,
            date: response.$createdAt,
            createdAt: response.$createdAt,
        };
    } catch (error: any) {
        console.error("[Payments] Failed to create payment:", error.message, error);
        throw error; // Re-throw so the caller can handle it
    }
}

/**
 * Get payments (Ledger) for a specific entity (Customer/Supplier)
 */
export async function getEntityLedger(
    tenantId: string,
    entityId: string
): Promise<Payment[]> {
    const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [
            Query.equal('tenantId', tenantId),
            Query.equal('entityId', entityId),
            Query.orderDesc('$createdAt'),
        ]
    );

    return response.documents.map((doc: any) => ({
        $id: doc.$id,
        tenantId: doc.tenantId,
        type: doc.type,
        category: doc.category,
        entityId: doc.entityId,
        amount: doc.amount,
        method: doc.method,
        referenceId: doc.referenceId,
        date: doc.$createdAt,
        createdAt: doc.$createdAt,
    }));
}

/**
 * Get all ledger entries with optional filters
 */
export async function getLedgerEntries(
    tenantId: string,
    filters?: {
        startDate?: string;
        endDate?: string;
        category?: string;
        type?: PaymentType;
    }
): Promise<Payment[]> {
    try {
        const query = [
            Query.equal('tenantId', tenantId),
            Query.orderDesc('$createdAt'),
        ];

        if (filters?.startDate) {
            query.push(Query.greaterThanEqual('$createdAt', filters.startDate));
        }
        if (filters?.endDate) {
            query.push(Query.lessThanEqual('$createdAt', filters.endDate));
        }
        if (filters?.category) {
            query.push(Query.equal('category', filters.category));
        }
        if (filters?.type) {
            query.push(Query.equal('type', filters.type));
        }

        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_ID,
            query
        );

        console.log("[Payments] Fetched", response.documents.length, "ledger entries");

        return response.documents.map((doc: any) => ({
            $id: doc.$id,
            tenantId: doc.tenantId,
            type: doc.type,
            category: doc.category,
            entityId: doc.entityId,
            amount: doc.amount,
            method: doc.method,
            referenceId: doc.referenceId,
            date: doc.$createdAt,
            createdAt: doc.$createdAt,
        }));
    } catch (error: any) {
        console.warn("Payments collection not found or query failed:", error.message);
        return []; // Return empty array if collection doesn't exist
    }
}

/**
 * Calculate outstanding balance for an entity
 * For Customer: Total Sales (Credit) - Total Payments = Balance
 * For Supplier: Total Purchases (Credit) - Total Payments = Balance
 */
export async function getEntityBalance(
    tenantId: string,
    entityId: string,
    entityType: 'CUSTOMER' | 'SUPPLIER'
): Promise<number> {
    const ledger = await getEntityLedger(tenantId, entityId);

    // Simple calculation: 
    // If Customer: Balance = Debits (Sales) - Credits (Payments)
    // If Supplier: Balance = Credits (Purchases) - Debits (Payments)
    // Adjust logic based on how we record records.

    // Assumption: 
    // Customer Sale (Credit) -> Type: IN (Revenue recognized), Method: Credit.
    // Customer Payment -> Type: IN (Cash recognized), Method: Cash.

    // Wait, this is tricky. 
    // Let's rely on Category:
    // Customer: Bal = Sum(SALE where method='Credit') - Sum(CUSTOMER_PAYMENT)

    let balance = 0;

    if (entityType === 'CUSTOMER') {
        const creditSales = ledger
            .filter(p => p.category === 'SALE' && p.method === 'Credit')
            .reduce((sum, p) => sum + p.amount, 0);

        const payments = ledger
            .filter(p => p.category === 'CUSTOMER_PAYMENT')
            .reduce((sum, p) => sum + p.amount, 0);

        balance = creditSales - payments;
    } else {
        // Supplier
        const creditPurchases = ledger
            .filter(p => p.category === 'PURCHASE' && p.method === 'Credit')
            .reduce((sum, p) => sum + p.amount, 0);

        const payments = ledger
            .filter(p => p.category === 'SUPPLIER_PAYMENT')
            .reduce((sum, p) => sum + p.amount, 0);

        balance = creditPurchases - payments;
    }

    return balance;
}
