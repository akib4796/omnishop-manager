import { databases, DATABASE_ID, ID, Query } from './client';

const COLLECTION_ID = 'cash_shifts';

// ============================================================================
// Types
// ============================================================================

export interface CashShift {
    $id: string;
    tenantId: string;
    userId: string;
    openingBalance: number;
    closingBalance?: number;
    expectedBalance?: number;
    variance?: number;
    status: 'open' | 'closed';
    closedAt?: string;
    notes?: string;
    $createdAt: string;
    $updatedAt: string;
}

export interface OpenShiftData {
    tenantId: string;
    userId: string;
    openingBalance: number;
}

export interface CloseShiftData {
    closingBalance: number;
    expectedBalance: number;
    variance: number;
    notes?: string;
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Open a new cash shift
 */
export async function openShift(data: OpenShiftData): Promise<CashShift> {
    const response = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_ID,
        ID.unique(),
        {
            tenantId: data.tenantId,
            userId: data.userId,
            openingBalance: data.openingBalance,
            status: 'open',
            closedAt: null,  // Required by Appwrite but null for open shifts
        }
    );

    return response as unknown as CashShift;
}

/**
 * Close an existing shift
 */
export async function closeShift(shiftId: string, data: CloseShiftData): Promise<CashShift> {
    const response = await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_ID,
        shiftId,
        {
            closingBalance: data.closingBalance,
            expectedBalance: data.expectedBalance,
            variance: data.variance,
            status: 'closed',
            closedAt: new Date().toISOString(),
            notes: data.notes || null,
        }
    );

    return response as unknown as CashShift;
}

/**
 * Get the current open shift for a tenant
 */
export async function getActiveShift(tenantId: string): Promise<CashShift | null> {
    const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [
            Query.equal('tenantId', tenantId),
            Query.equal('status', 'open'),
            Query.orderDesc('$createdAt'),
            Query.limit(1),
        ]
    );

    if (response.documents.length === 0) {
        return null;
    }

    return response.documents[0] as unknown as CashShift;
}

/**
 * Get shift history for a tenant
 */
export async function getShiftHistory(
    tenantId: string,
    limit: number = 30
): Promise<CashShift[]> {
    const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [
            Query.equal('tenantId', tenantId),
            Query.orderDesc('$createdAt'),
            Query.limit(limit),
        ]
    );

    return response.documents as unknown as CashShift[];
}

/**
 * Get shifts within a date range
 */
export async function getShiftsInRange(
    tenantId: string,
    startDate: string,
    endDate: string
): Promise<CashShift[]> {
    const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [
            Query.equal('tenantId', tenantId),
            Query.greaterThanEqual('$createdAt', startDate),
            Query.lessThanEqual('$createdAt', endDate),
            Query.orderDesc('$createdAt'),
        ]
    );

    return response.documents as unknown as CashShift[];
}

/**
 * Get a specific shift by ID
 */
export async function getShift(shiftId: string): Promise<CashShift> {
    const response = await databases.getDocument(
        DATABASE_ID,
        COLLECTION_ID,
        shiftId
    );

    return response as unknown as CashShift;
}
