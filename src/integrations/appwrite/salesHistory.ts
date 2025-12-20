/**
 * Sales History integration layer for Appwrite
 * Handles completed sales queries (separate from pending sales)
 */

import { Query } from 'appwrite';
import { databases } from './client';

const DATABASE_ID = 'omnishop_db';
const COLLECTION_ID = 'sales';

// ============================================================================
// Types
// ============================================================================

export interface CompletedSaleItem {
    productId: string;
    name: string;
    qty: number;
    price: number;
}

export interface CompletedSale {
    $id: string;
    tenantId: string;
    customerId?: string;
    customerName?: string;
    items: CompletedSaleItem[];
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    totalAmount: number;
    paymentMethod: string;
    cashierId: string;
    cashierName?: string;
    createdAt: string;
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Get all completed sales for a tenant
 */
export async function getCompletedSales(tenantId: string): Promise<CompletedSale[]> {
    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_ID,
            [
                Query.equal('tenantId', tenantId),
                Query.orderDesc('createdAt'),
                Query.limit(500),
            ]
        );

        return response.documents.map((doc: any) => {
            // Parse items if stored as JSON string
            let items = doc.items;
            if (typeof items === 'string') {
                try {
                    items = JSON.parse(items);
                } catch {
                    items = [];
                }
            }

            return {
                $id: doc.$id,
                tenantId: doc.tenantId,
                customerId: doc.customerId,
                customerName: doc.customerName,
                items,
                subtotal: doc.subtotal || 0,
                discountAmount: doc.discountAmount || 0,
                taxAmount: doc.taxAmount || 0,
                totalAmount: doc.totalAmount || 0,
                paymentMethod: doc.paymentMethod,
                cashierId: doc.cashierId,
                cashierName: doc.cashierName,
                createdAt: doc.createdAt || doc.$createdAt,
            };
        });
    } catch (error) {
        console.error('Error fetching completed sales:', error);
        // If collection doesn't exist, return empty array
        return [];
    }
}

/**
 * Get completed sales for a specific date range
 */
export async function getCompletedSalesInRange(
    tenantId: string,
    startDate: string,
    endDate: string
): Promise<CompletedSale[]> {
    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_ID,
            [
                Query.equal('tenantId', tenantId),
                Query.greaterThanEqual('createdAt', startDate),
                Query.lessThanEqual('createdAt', endDate),
                Query.orderDesc('createdAt'),
                Query.limit(500),
            ]
        );

        return response.documents.map((doc: any) => {
            let items = doc.items;
            if (typeof items === 'string') {
                try {
                    items = JSON.parse(items);
                } catch {
                    items = [];
                }
            }

            return {
                $id: doc.$id,
                tenantId: doc.tenantId,
                customerId: doc.customerId,
                customerName: doc.customerName,
                items,
                subtotal: doc.subtotal || 0,
                discountAmount: doc.discountAmount || 0,
                taxAmount: doc.taxAmount || 0,
                totalAmount: doc.totalAmount || 0,
                paymentMethod: doc.paymentMethod,
                cashierId: doc.cashierId,
                cashierName: doc.cashierName,
                createdAt: doc.createdAt || doc.$createdAt,
            };
        });
    } catch (error) {
        console.error('Error fetching completed sales in range:', error);
        return [];
    }
}

/**
 * Get a single completed sale by ID
 */
export async function getCompletedSaleById(saleId: string): Promise<CompletedSale | null> {
    try {
        const doc = await databases.getDocument(
            DATABASE_ID,
            COLLECTION_ID,
            saleId
        );

        let items = doc.items;
        if (typeof items === 'string') {
            try {
                items = JSON.parse(items);
            } catch {
                items = [];
            }
        }

        return {
            $id: doc.$id,
            tenantId: doc.tenantId as string,
            customerId: doc.customerId as string | undefined,
            customerName: doc.customerName as string | undefined,
            items,
            subtotal: (doc.subtotal || 0) as number,
            discountAmount: (doc.discountAmount || 0) as number,
            taxAmount: (doc.taxAmount || 0) as number,
            totalAmount: (doc.totalAmount || 0) as number,
            paymentMethod: doc.paymentMethod as string,
            cashierId: doc.cashierId as string,
            cashierName: doc.cashierName as string | undefined,
            createdAt: (doc.createdAt || doc.$createdAt) as string,
        };
    } catch (error) {
        console.error('Error fetching completed sale:', error);
        return null;
    }
}

/**
 * Get daily completed sales total
 */
export async function getDailyCompletedSalesTotal(tenantId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sales = await getCompletedSalesInRange(
        tenantId,
        today.toISOString(),
        tomorrow.toISOString()
    );

    return sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
}
