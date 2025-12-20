/**
 * Cash Session / Cash Drawer management for Z-Report
 * Handles shift open/close and cash reconciliation
 */

import { ID, Query } from 'appwrite';
import { databases } from './client';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'omnishop_db';
const COLLECTION_ID = 'cash_sessions';

// ============================================================================
// Types
// ============================================================================

export interface CashSession {
    $id: string;
    tenantId: string;
    cashierId: string;
    cashierName?: string;
    openedAt: string;
    closedAt?: string;
    openingBalance: number;
    closingBalance?: number;
    expectedBalance?: number;
    cashSales: number;
    cardSales: number;
    mobileSales: number;
    cashDrops: number;
    cashAdds: number;
    notes?: string;
    status: 'open' | 'closed';
    variance?: number; // closingBalance - expectedBalance
}

export interface CreateCashSessionData {
    tenantId: string;
    cashierId: string;
    cashierName?: string;
    openingBalance: number;
}

export interface CloseCashSessionData {
    closingBalance: number;
    notes?: string;
}

// ============================================================================
// Cash Session Queries
// ============================================================================

/**
 * Get all cash sessions for a tenant (with optional filters)
 */
export async function getCashSessions(
    tenantId: string,
    limit: number = 25,
    status?: 'open' | 'closed'
): Promise<CashSession[]> {
    try {
        const queries = [
            Query.equal('tenantId', tenantId),
            Query.orderDesc('openedAt'),
            Query.limit(limit),
        ];

        if (status) {
            queries.push(Query.equal('status', status));
        }

        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_ID,
            queries
        );

        return response.documents.map((doc: any) => ({
            $id: doc.$id,
            tenantId: doc.tenantId,
            cashierId: doc.cashierId,
            cashierName: doc.cashierName || '',
            openedAt: doc.openedAt,
            closedAt: doc.closedAt || null,
            openingBalance: doc.openingBalance || 0,
            closingBalance: doc.closingBalance || null,
            expectedBalance: doc.expectedBalance || null,
            cashSales: doc.cashSales || 0,
            cardSales: doc.cardSales || 0,
            mobileSales: doc.mobileSales || 0,
            cashDrops: doc.cashDrops || 0,
            cashAdds: doc.cashAdds || 0,
            notes: doc.notes || '',
            status: doc.status || 'open',
            variance: doc.variance || null,
        }));
    } catch (error: any) {
        // Collection might not exist yet
        console.error('Error fetching cash sessions:', error);
        return [];
    }
}

/**
 * Get currently open session for a cashier
 */
export async function getOpenSession(
    tenantId: string,
    cashierId: string
): Promise<CashSession | null> {
    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_ID,
            [
                Query.equal('tenantId', tenantId),
                Query.equal('cashierId', cashierId),
                Query.equal('status', 'open'),
                Query.limit(1),
            ]
        );

        if (response.documents.length === 0) return null;

        const doc = response.documents[0];
        return {
            $id: doc.$id,
            tenantId: doc.tenantId,
            cashierId: doc.cashierId,
            cashierName: doc.cashierName || '',
            openedAt: doc.openedAt,
            closedAt: doc.closedAt || null,
            openingBalance: doc.openingBalance || 0,
            closingBalance: doc.closingBalance || null,
            expectedBalance: doc.expectedBalance || null,
            cashSales: doc.cashSales || 0,
            cardSales: doc.cardSales || 0,
            mobileSales: doc.mobileSales || 0,
            cashDrops: doc.cashDrops || 0,
            cashAdds: doc.cashAdds || 0,
            notes: doc.notes || '',
            status: doc.status || 'open',
            variance: doc.variance || null,
        };
    } catch (error) {
        console.error('Error fetching open session:', error);
        return null;
    }
}

/**
 * Open a new cash session (start shift)
 */
export async function openCashSession(data: CreateCashSessionData): Promise<CashSession> {
    const doc = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_ID,
        ID.unique(),
        {
            tenantId: data.tenantId,
            cashierId: data.cashierId,
            cashierName: data.cashierName || '',
            openedAt: new Date().toISOString(),
            openingBalance: data.openingBalance,
            cashSales: 0,
            cardSales: 0,
            mobileSales: 0,
            cashDrops: 0,
            cashAdds: 0,
            status: 'open',
        }
    );

    return doc as unknown as CashSession;
}

/**
 * Close a cash session (end shift)
 */
export async function closeCashSession(
    sessionId: string,
    data: CloseCashSessionData,
    expectedBalance: number,
    salesSummary: { cash: number; card: number; mobile: number }
): Promise<CashSession> {
    const variance = data.closingBalance - expectedBalance;

    const doc = await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_ID,
        sessionId,
        {
            closedAt: new Date().toISOString(),
            closingBalance: data.closingBalance,
            expectedBalance: expectedBalance,
            cashSales: salesSummary.cash,
            cardSales: salesSummary.card,
            mobileSales: salesSummary.mobile,
            notes: data.notes || '',
            status: 'closed',
            variance: variance,
        }
    );

    return doc as unknown as CashSession;
}

/**
 * Update a session with cash drop or add
 */
export async function updateSessionCash(
    sessionId: string,
    type: 'drop' | 'add',
    amount: number
): Promise<void> {
    const session = await databases.getDocument(DATABASE_ID, COLLECTION_ID, sessionId);

    const updateData = type === 'drop'
        ? { cashDrops: (session.cashDrops || 0) + amount }
        : { cashAdds: (session.cashAdds || 0) + amount };

    await databases.updateDocument(DATABASE_ID, COLLECTION_ID, sessionId, updateData);
}

/**
 * Get Z-Report summary for a closed session
 */
export function calculateZReport(session: CashSession) {
    const expectedCash = session.openingBalance + session.cashSales - session.cashDrops + session.cashAdds;
    const variance = session.closingBalance ? session.closingBalance - expectedCash : 0;

    return {
        sessionId: session.$id,
        cashier: session.cashierName,
        shiftStart: session.openedAt,
        shiftEnd: session.closedAt,

        // Cash reconciliation
        openingBalance: session.openingBalance,
        cashSales: session.cashSales,
        cashDrops: session.cashDrops,
        cashAdds: session.cashAdds,
        expectedCash,
        actualCash: session.closingBalance || 0,
        variance,
        varianceStatus: variance === 0 ? 'balanced' : variance > 0 ? 'over' : 'short',

        // Total sales
        cardSales: session.cardSales,
        mobileSales: session.mobileSales,
        totalSales: session.cashSales + session.cardSales + session.mobileSales,
    };
}
