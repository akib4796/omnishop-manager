import { ID, Query } from 'appwrite';
import { databases } from './client';

const DATABASE_ID = 'omnishop_db';
const COLLECTION_ID = 'fiscal_years';

// ============================================================================
// Types
// ============================================================================

export interface FiscalYear {
    $id: string;
    tenantId: string;
    name: string; // "FY 2024-2025"
    startDate: string;
    endDate: string;
    isClosed: boolean;
    lockedDate?: string;
    createdAt: string;
}

export interface CreateFiscalYearData {
    tenantId: string;
    name: string;
    startDate: string;
    endDate: string;
    isClosed?: boolean;
    lockedDate?: string;
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Define a new fiscal year
 */
export async function createFiscalYear(data: CreateFiscalYearData): Promise<FiscalYear> {
    const response = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_ID,
        ID.unique(),
        {
            tenantId: data.tenantId,
            name: data.name,
            startDate: data.startDate,
            endDate: data.endDate,
            isClosed: data.isClosed ?? false,
            lockedDate: data.lockedDate,
            createdAt: new Date().toISOString(),
        }
    );

    return {
        $id: response.$id,
        tenantId: response.tenantId,
        name: response.name,
        startDate: response.startDate,
        endDate: response.endDate,
        isClosed: response.isClosed,
        lockedDate: response.lockedDate,
        createdAt: response.createdAt,
    };
}

/**
 * Get all fiscal years
 */
export async function getFiscalYears(tenantId: string): Promise<FiscalYear[]> {
    const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [
            Query.equal('tenantId', tenantId),
            Query.orderDesc('startDate'),
        ]
    );

    return response.documents.map((doc: any) => ({
        $id: doc.$id,
        tenantId: doc.tenantId,
        name: doc.name,
        startDate: doc.startDate,
        endDate: doc.endDate,
        isClosed: doc.isClosed,
        lockedDate: doc.lockedDate,
        createdAt: doc.createdAt,
    }));
}

/**
 * Get the current active fiscal year based on today's date
 */
export async function getCurrentFiscalYear(tenantId: string): Promise<FiscalYear | null> {
    try {
        const today = new Date().toISOString();
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_ID,
            [
                Query.equal('tenantId', tenantId),
                Query.lessThanEqual('startDate', today),
                Query.greaterThanEqual('endDate', today),
                Query.limit(1),
            ]
        );

        if (response.total === 0) return null;

        const doc = response.documents[0];
        return {
            $id: doc.$id,
            tenantId: doc.tenantId,
            name: doc.name,
            startDate: doc.startDate,
            endDate: doc.endDate,
            isClosed: doc.isClosed,
            lockedDate: doc.lockedDate,
            createdAt: doc.$createdAt,
        };
    } catch (error: any) {
        console.warn("Fiscal years collection not found:", error.message);
        return null; // Return null if collection doesn't exist
    }
}
