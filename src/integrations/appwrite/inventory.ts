/**
 * Inventory integration layer for Appwrite
 * Handles purchase orders, stock adjustments, and suppliers
 */

import { ID, Query } from 'appwrite';
import { databases } from './client';

const DATABASE_ID = 'omnishop_db';

// ============================================================================
// Types
// ============================================================================

export interface Supplier {
    $id: string;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    tenantId: string;
    createdAt?: string;
}

export interface CreateSupplierData {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    tenantId: string;
}

export interface StockAdjustment {
    $id: string;
    productId: string;
    productName?: string;
    adjustmentType: 'in' | 'out' | 'damage' | 'correction';
    quantity: number;
    reason?: string;
    tenantId: string;
    createdBy: string;
    createdAt: string;
}

export interface CreateStockAdjustmentData {
    productId: string;
    adjustmentType: 'in' | 'out' | 'damage' | 'correction';
    quantity: number;
    reason?: string;
    tenantId: string;
    createdBy: string;
}

export interface PurchaseOrderItem {
    productId: string;
    productName?: string;
    quantity: number;
    unitPrice: number;
}

export type PaymentStatus = 'not_paid' | 'partially_paid' | 'paid';
export type PurchaseOrderSource = 'manual' | 'pos_refill';

export interface PurchaseOrder {
    $id: string;
    orderNumber: string;
    supplierId: string;
    supplierName?: string;
    status: 'pending' | 'received' | 'cancelled';
    items: PurchaseOrderItem[];
    totalAmount: number;
    notes?: string;
    tenantId: string;
    createdBy: string;
    createdAt: string;
    receivedAt?: string;
    // Payment tracking
    paymentStatus: PaymentStatus;
    amountPaid: number;
    source: PurchaseOrderSource;
}

export interface CreatePurchaseOrderData {
    supplierId: string;
    supplierName?: string;
    items: PurchaseOrderItem[];
    totalAmount: number;
    notes?: string;
    tenantId: string;
    createdBy: string;
    // Payment tracking
    paymentStatus?: PaymentStatus;
    amountPaid?: number;
    source?: PurchaseOrderSource;
}

// ============================================================================
// Suppliers
// ============================================================================

export async function getSuppliers(tenantId: string): Promise<Supplier[]> {
    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            'suppliers',
            [
                Query.equal('tenantId', tenantId),
                Query.orderDesc('createdDate'),
                Query.limit(500),
            ]
        );

        return response.documents.map((doc: any) => ({
            $id: doc.$id,
            name: doc.name,
            phone: doc.phone,
            email: doc.email,
            address: doc.address,
            tenantId: doc.tenantId,
            createdAt: doc.$createdAt,
        }));
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        return [];
    }
}


export async function createSupplier(data: CreateSupplierData): Promise<Supplier> {
    const response = await databases.createDocument(
        DATABASE_ID,
        'suppliers',
        ID.unique(),
        {
            name: data.name,
            phone: data.phone ?? null,
            email: data.email ?? null,
            address: data.address ?? null,
            tenantId: data.tenantId,
            createdDate: new Date().toISOString(),
        }
    );

    return {
        $id: response.$id,
        name: response.name,
        phone: response.phone,
        email: response.email,
        address: response.address,
        tenantId: response.tenantId,
        createdAt: response.createdDate || response.$createdAt,
    };
}


// ============================================================================
// Stock Adjustments
// ============================================================================

export async function getStockAdjustments(tenantId: string): Promise<StockAdjustment[]> {
    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            'stock_adjustments',
            [
                Query.equal('tenantId', tenantId),
                Query.orderDesc('createdAt'),
                Query.limit(500),
            ]
        );

        return response.documents.map((doc: any) => ({
            $id: doc.$id,
            productId: doc.productId,
            productName: doc.productName,
            adjustmentType: doc.adjustmentType,
            quantity: doc.quantity,
            reason: doc.reason,
            tenantId: doc.tenantId,
            createdBy: doc.createdBy,
            createdAt: doc.createdAt || doc.$createdAt,
        }));
    } catch (error) {
        console.error('Error fetching stock adjustments:', error);
        return [];
    }
}

export async function createStockAdjustment(data: CreateStockAdjustmentData): Promise<StockAdjustment> {
    const response = await databases.createDocument(
        DATABASE_ID,
        'stock_adjustments',
        ID.unique(),
        {
            productId: data.productId,
            adjustmentType: data.adjustmentType,
            quantity: data.quantity,
            reason: data.reason ?? null,
            tenantId: data.tenantId,
            createdBy: data.createdBy,
            createdAt: new Date().toISOString(),
        }
    );

    return {
        $id: response.$id,
        productId: response.productId,
        productName: response.productName,
        adjustmentType: response.adjustmentType,
        quantity: response.quantity,
        reason: response.reason,
        tenantId: response.tenantId,
        createdBy: response.createdBy,
        createdAt: response.createdAt,
    };
}

// ============================================================================
// Purchase Orders
// ============================================================================

export async function getPurchaseOrders(tenantId: string): Promise<PurchaseOrder[]> {
    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            'purchase_orders',
            [
                Query.equal('tenantId', tenantId),
                Query.orderDesc('$createdAt'),
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
                orderNumber: doc.orderNumber || doc.$id,
                supplierId: doc.supplierId,
                supplierName: doc.supplierName,
                status: doc.status,
                items,
                totalAmount: doc.totalAmount,
                notes: doc.notes,
                tenantId: doc.tenantId,
                createdBy: doc.createdBy,
                createdAt: doc.$createdAt,
                receivedAt: doc.receivedAt,
                // Payment tracking (with defaults for backward compatibility)
                paymentStatus: doc.paymentStatus || 'not_paid',
                amountPaid: doc.amountPaid || 0,
                source: doc.source || 'manual',
            };
        });
    } catch (error) {
        console.error('Error fetching purchase orders:', error);
        return [];
    }
}

export async function createPurchaseOrder(data: CreatePurchaseOrderData): Promise<PurchaseOrder> {
    const response = await databases.createDocument(
        DATABASE_ID,
        'purchase_orders',
        ID.unique(),
        {
            supplierId: data.supplierId,
            status: 'received', // Auto-received for POS refills
            items: JSON.stringify(data.items),
            totalAmount: data.totalAmount,
            tenantId: data.tenantId,
            // Payment tracking
            paymentStatus: data.paymentStatus || 'not_paid',
            amountPaid: data.amountPaid || 0,
            source: data.source || 'manual',
        }
    );

    return {
        $id: response.$id,
        orderNumber: response.orderNumber || response.$id,
        supplierId: response.supplierId,
        supplierName: response.supplierName,
        status: response.status,
        items: data.items,
        totalAmount: response.totalAmount,
        notes: response.notes,
        tenantId: response.tenantId,
        createdBy: response.createdBy,
        createdAt: response.createdDate || response.$createdAt,
        receivedAt: response.receivedAt,
        // Payment tracking
        paymentStatus: response.paymentStatus || data.paymentStatus || 'not_paid',
        amountPaid: response.amountPaid || data.amountPaid || 0,
        source: response.source || data.source || 'manual',
    };
}

export async function updatePurchaseOrderStatus(
    orderId: string,
    status: 'pending' | 'received' | 'cancelled'
): Promise<void> {
    await databases.updateDocument(
        DATABASE_ID,
        'purchase_orders',
        orderId,
        {
            status,
            receivedAt: status === 'received' ? new Date().toISOString() : null,
        }
    );
}

export async function getPurchaseOrderItems(orderId: string): Promise<PurchaseOrderItem[]> {
    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            'purchase_order_items',
            [
                Query.equal('orderId', orderId),
                Query.limit(100),
            ]
        );

        return response.documents.map((doc: any) => ({
            productId: doc.productId,
            productName: doc.productName,
            quantity: doc.quantity,
            unitPrice: doc.unitPrice,
        }));
    } catch (error) {
        console.error('Error fetching purchase order items:', error);
        return [];
    }
}

// ============================================================================
// Update Payment Status
// ============================================================================

export async function updatePaymentStatus(
    orderId: string,
    amountPaid: number,
    totalAmount: number
): Promise<void> {
    // Auto-calculate payment status based on amount
    let paymentStatus: PaymentStatus = 'not_paid';
    if (amountPaid >= totalAmount) {
        paymentStatus = 'paid';
    } else if (amountPaid > 0) {
        paymentStatus = 'partially_paid';
    }

    await databases.updateDocument(
        DATABASE_ID,
        'purchase_orders',
        orderId,
        {
            paymentStatus,
            amountPaid,
        }
    );
}
