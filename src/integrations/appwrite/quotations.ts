import { ID, Query } from 'appwrite';
import { databases } from './client';

const DATABASE_ID = 'omnishop_db';
const COLLECTION_ID = 'quotations';

// ============================================================================
// Types
// ============================================================================

export interface QuotationItem {
    productId: string;
    productName: string; // Store name snapshot
    quantity: number;
    price: number;
    unit?: string;
}

export interface Quotation {
    $id: string;
    tenantId: string;
    quotationNumber: string;
    customerId?: string;
    customerName: string;
    customerPhone?: string;
    items: QuotationItem[];
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    status: 'draft' | 'sent' | 'accepted' | 'converted' | 'expired';
    validUntil?: string;
    notes?: string;
    createdBy: string;
    createdAt: string;
}

export interface CreateQuotationData {
    tenantId: string;
    customerId?: string;
    customerName: string;
    customerPhone?: string;
    items: QuotationItem[];
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    notes?: string;
    createdBy: string;
    validUntil?: string;
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Generate a unique quotation number (Simple timestamp based for now, or sequential if we query last)
 * For simplicity and speed: QT-{TimestampSuffix}
 */
function generateQuotationNumber(): string {
    const date = new Date();
    const suffix = date.getTime().toString().slice(-6);
    return `QT-${suffix}`;
}

export async function createQuotation(data: CreateQuotationData): Promise<Quotation> {
    const quotationNumber = generateQuotationNumber();

    const response = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_ID,
        ID.unique(),
        {
            tenantId: data.tenantId,
            quotationNumber: quotationNumber,
            customerId: data.customerId || null,
            customerName: data.customerName,
            customerPhone: data.customerPhone || null,
            items: JSON.stringify(data.items),
            subtotal: data.subtotal,
            tax: data.tax,
            discount: data.discount,
            total: data.total,
            status: 'draft',
            validUntil: data.validUntil || null,
            notes: data.notes || null,
            createdBy: data.createdBy,
            createdAt: new Date().toISOString(),
        }
    );

    return {
        ...response,
        items: JSON.parse(response.items),
    } as unknown as Quotation;
}

export async function getQuotations(tenantId: string): Promise<Quotation[]> {
    const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [
            Query.equal('tenantId', tenantId),
            Query.orderDesc('createdAt'),
        ]
    );

    return response.documents.map(doc => ({
        ...doc,
        items: typeof doc.items === 'string' ? JSON.parse(doc.items) : doc.items,
    })) as unknown as Quotation[];
}

export async function updateQuotationStatus(
    quotationId: string,
    status: 'draft' | 'sent' | 'accepted' | 'converted' | 'expired'
): Promise<void> {
    await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_ID,
        quotationId,
        { status }
    );
}

export async function deleteQuotation(quotationId: string): Promise<void> {
    await databases.deleteDocument(
        DATABASE_ID,
        COLLECTION_ID,
        quotationId
    );
}
