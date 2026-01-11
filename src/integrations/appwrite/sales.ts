/**
 * Sales integration layer for Appwrite
 * Handles pending sales for offline-first POS functionality
 */

import { ID, Query } from 'appwrite';
import { databases } from './client';
import { getEntityLedger } from './payments';

const DATABASE_ID = 'omnishop_db';
const COLLECTION_ID = 'pending_sales';

// ============================================================================
// Types
// ============================================================================

export interface SaleItem {
    productId: string;
    name?: string;  // Product name for display in receipt
    quantity: number;
    price: number;
    costPrice?: number; // Purchase price for profit margin calculation
}

export interface SaleData {
    tenantId: string;
    customerId?: string | null;
    customerName?: string;  // Added for display in sales history
    items: SaleItem[];
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    paymentMethod: string;
    notes?: string;
    cashierId: string;
    completedAt: string;
    amountPaid?: number; // Added to JSON blob
}

export interface PendingSale {
    $id: string;
    tenantId: string;
    saleData: SaleData;
    synced: boolean;
    syncedAt?: string;
    createdAt: string;
    amountPaid?: number;  // Amount paid toward this sale (for credit sales)
}

export interface CreatePendingSaleData {
    tenantId: string;
    saleData: SaleData;
    synced?: boolean;
    syncedAt?: string;
    amountPaid?: number;
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new pending sale
 */
export async function createPendingSale(data: CreatePendingSaleData): Promise<PendingSale> {
    const response = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_ID,
        ID.unique(),
        {
            tenantId: data.tenantId,
            saleData: JSON.stringify(data.saleData),
            synced: data.synced ?? false,
            // amountPaid: data.amountPaid || 0, <-- REMOVED due to schema limitation
            // Use null for datetime fields when not set (Appwrite handles $createdAt automatically)
        }
    );

    return {
        $id: response.$id,
        tenantId: response.tenantId,
        saleData: JSON.parse(response.saleData),
        synced: response.synced,
        syncedAt: response.syncedAt,
        createdAt: response.$createdAt,
        amountPaid: response.amountPaid || 0,
    };
}

/**
 * Get all pending sales for a tenant
 */
export async function getPendingSales(tenantId: string): Promise<PendingSale[]> {
    const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [
            Query.equal('tenantId', tenantId),
            Query.orderDesc('createdAt'),
            Query.limit(1000), // Increase limit to ensure we find all sales
        ]
    );

    // Debug: Log raw amountPaid values from Appwrite
    console.log('[Sales] Raw documents amountPaid values:',
        response.documents.map((d: any) => ({ id: d.$id.substring(0, 8), amountPaid: d.amountPaid }))
    );

    return response.documents.map((doc: any) => ({
        $id: doc.$id,
        tenantId: doc.tenantId,
        saleData: typeof doc.saleData === 'string' ? JSON.parse(doc.saleData) : doc.saleData,
        synced: doc.synced,
        syncedAt: doc.syncedAt,
        createdAt: doc.$createdAt,
        amountPaid: doc.amountPaid || 0,  // Include amount paid for FIFO tracking
    }));
}

/**
 * Get unsynced pending sales for a tenant
 */
export async function getUnsyncedSales(tenantId: string): Promise<PendingSale[]> {
    const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [
            Query.equal('tenantId', tenantId),
            Query.equal('synced', false),
            Query.orderAsc('createdAt'),
        ]
    );

    return response.documents.map((doc: any) => ({
        $id: doc.$id,
        tenantId: doc.tenantId,
        saleData: typeof doc.saleData === 'string' ? JSON.parse(doc.saleData) : doc.saleData,
        synced: doc.synced,
        syncedAt: doc.syncedAt,
        createdAt: doc.$createdAt,
        amountPaid: doc.amountPaid || 0,
    }));
}

/**
 * Mark a sale as synced
 */
export async function markSaleAsSynced(saleId: string): Promise<void> {
    await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_ID,
        saleId,
        {
            synced: true,
            syncedAt: new Date().toISOString(),
        }
    );
}

/**
 * Delete a pending sale
 */
export async function deletePendingSale(saleId: string): Promise<void> {
    await databases.deleteDocument(
        DATABASE_ID,
        COLLECTION_ID,
        saleId
    );
}

/**
 * Get total sales count for a tenant
 */
export async function getSalesCount(tenantId: string): Promise<number> {
    const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [
            Query.equal('tenantId', tenantId),
            Query.limit(1),
        ]
    );

    return response.total;
}

/**
 * Get sales for a date range
 */
export async function getSalesInRange(
    tenantId: string,
    startDate: string,
    endDate: string
): Promise<PendingSale[]> {
    const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [
            Query.equal('tenantId', tenantId),
            Query.greaterThanEqual('createdAt', startDate),
            Query.lessThanEqual('createdAt', endDate),
            Query.orderDesc('createdAt'),
        ]
    );

    return response.documents.map((doc: any) => ({
        $id: doc.$id,
        tenantId: doc.tenantId,
        saleData: typeof doc.saleData === 'string' ? JSON.parse(doc.saleData) : doc.saleData,
        synced: doc.synced,
        syncedAt: doc.syncedAt,
        createdAt: doc.createdAt,
        amountPaid: doc.amountPaid || 0,
    }));
}

/**
 * Get sales for a specific customer
 * Returns full sale data including items, total, payment method
 */
export async function getCustomerSales(
    tenantId: string,
    customerId: string,
    matchedSaleIds?: string[],
    fuzzyTransactions?: any[]
): Promise<PendingSale[]> {
    const allSales = await getPendingSales(tenantId);

    console.log('[DEBUG] getCustomerSales', {
        customerId,
        matchedSaleIds,
        fuzzyTransactionsCount: fuzzyTransactions?.length,
        totalSales: allSales.length
    });

    // Filter sales that belong to this customer OR match the provided sale IDs
    const filtered = allSales.filter(sale => {
        // 1. match by ID explicitly (from ledger)
        if (matchedSaleIds && matchedSaleIds.includes(sale.$id)) return true;

        // 2. match by valid customerId in saleData
        if (sale.saleData.customerId === customerId) return true;

        // 3. Fuzzy match: try to link orphan transactions
        if (fuzzyTransactions && fuzzyTransactions.length > 0) {
            // Find a transaction that matches amount (exact) and time (approx)
            const match = fuzzyTransactions.find(t => {
                // If transaction already has a ref ID, ignore fuzzy match for it (it should have matched step 1 if valid)
                if (t.referenceId) return false;

                // Match amount exactly (float safe comparison)
                if (Math.abs(t.amount - sale.saleData.total) > 0.05) return false;

                // Match time (within 5 minutes due to potential clock skew or processing delay)
                const txTime = new Date(t.date).getTime();
                const saleTime = new Date(sale.createdAt).getTime();
                const diffMs = Math.abs(txTime - saleTime);
                return diffMs < 5 * 60 * 1000;
            });

            if (match) return true;
        }

        return false;
    });

    console.log('[DEBUG] filtered sales', { count: filtered.length });
    return filtered;
}

/**
 * Update the amount paid for a specific sale
 * Note: Requires 'amountPaid' attribute in pending_sales collection
 */
export async function updateSaleAmountPaid(saleId: string, amountPaid: number): Promise<void> {
    console.log('[Sales] Updating amountPaid for sale:', saleId, 'to:', amountPaid);
    try {
        const result = await databases.updateDocument(
            DATABASE_ID,
            COLLECTION_ID,
            saleId,
            {
                amountPaid: amountPaid,
            }
        );
        console.log('[Sales] Successfully updated amountPaid. Result:', result.amountPaid);
    } catch (error: any) {
        console.error('[Sales] Error updating amountPaid:', error);
        // Gracefully handle missing attribute error
        if (error?.code === 400 && error?.message?.includes('Unknown attribute')) {
            console.warn('[Sales] amountPaid attribute not found in collection. Payment recorded but FIFO tracking requires adding this attribute to Appwrite.');
        } else {
            throw error;
        }
    }
}

/**
 * Get unpaid/partially paid credit sales for a customer, sorted oldest first
 */
export async function getUnpaidCreditSales(tenantId: string, customerId: string): Promise<PendingSale[]> {
    const customerSales = await getCustomerSales(tenantId, customerId);

    // Filter to credit sales that are not fully paid
    return customerSales
        .filter(sale => {
            // Only credit sales
            if (sale.saleData.paymentMethod !== 'credit') return false;

            // Check if not fully paid
            const paid = sale.amountPaid || 0;
            const total = sale.saleData.total;
            return paid < total;
        })
        // Sort by createdAt ascending (oldest first for FIFO)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

/**
 * Allocate a payment to credit sales using FIFO (oldest first)
 * Returns array of updated sales with their new amountPaid values
 */
export async function allocatePaymentToSales(
    tenantId: string,
    customerId: string,
    paymentAmount: number
): Promise<{ saleId: string; amountApplied: number; newAmountPaid: number; isFullyPaid: boolean }[]> {
    const unpaidSales = await getUnpaidCreditSales(tenantId, customerId);

    let remainingPayment = paymentAmount;
    const allocations: { saleId: string; amountApplied: number; newAmountPaid: number; isFullyPaid: boolean }[] = [];

    for (const sale of unpaidSales) {
        if (remainingPayment <= 0) break;

        const currentPaid = sale.amountPaid || 0;
        const total = sale.saleData.total;
        const outstanding = total - currentPaid;

        // How much can we apply to this sale?
        const amountToApply = Math.min(remainingPayment, outstanding);
        const newAmountPaid = currentPaid + amountToApply;

        // Update the sale in database
        await updateSaleAmountPaid(sale.$id, newAmountPaid);

        allocations.push({
            saleId: sale.$id,
            amountApplied: amountToApply,
            newAmountPaid: newAmountPaid,
            isFullyPaid: newAmountPaid >= total,
        });

        remainingPayment -= amountToApply;
    }

    return allocations;
}

/**
 * Get customer sales statistics (total spent, last visit)
 */
export async function getCustomerSalesStats(
    tenantId: string,
    customerId: string
): Promise<{ totalSpent: number; lastVisit: Date | null; salesCount: number }> {
    try {
        // Use Ledger as source of truth for customer stats
        const transactions = await getEntityLedger(tenantId, customerId);

        // Filter for SALES only
        const sales = transactions.filter(t => t.category === 'SALE');

        if (sales.length === 0) {
            return { totalSpent: 0, lastVisit: null, salesCount: 0 };
        }

        // Calculate total spent (sum of all sales regardless of payment status)
        const totalSpent = sales.reduce((sum, sale) => sum + sale.amount, 0);

        // Get last visit date (transactions are already sorted descendant by getEntityLedger)
        const lastVisit = sales[0] ? new Date(sales[0].date) : null;

        return { totalSpent, lastVisit, salesCount: sales.length };
    } catch (error) {
        console.error('Error getting customer sales stats:', error);
        return { totalSpent: 0, lastVisit: null, salesCount: 0 };
    }
}
