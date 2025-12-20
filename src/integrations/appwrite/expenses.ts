import { ID, Query } from 'appwrite';
import { databases } from './client';
import { account } from './client';

const DATABASE_ID = 'omnishop_db';
const COLLECTION_ID = 'expenses';

// ============================================================================
// Types
// ============================================================================

export interface Expense {
    $id: string;
    tenantId: string;
    category: string;
    amount: number;
    date: string;
    note?: string; // Changed from description
    paidBy?: string; // 'Cash', 'Bank', 'Mobile', etc.
    createdBy?: string; // User who created
    attachmentUrl?: string;
    isRecurring?: boolean;
    frequency?: string;
    recurrenceEndDate?: string;
    paymentStatus?: string;
    createdAt: string;
}

export interface CreateExpenseData {
    tenantId: string;
    category: string;
    amount: number;
    date: string;
    description?: string; // Maps to 'note' in Appwrite
    paidBy?: string;
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new expense record
 */
export async function createExpense(data: CreateExpenseData): Promise<Expense> {
    // Get current user for createdBy
    let createdBy = '';
    try {
        const user = await account.get();
        createdBy = user.$id;
    } catch (e) {
        // Ignore
    }

    const response = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_ID,
        ID.unique(),
        {
            tenantId: data.tenantId,
            category: data.category,
            amount: data.amount,
            date: data.date,
            note: data.description || null, // Map description to note
            paidBy: data.paidBy || null,
            createdBy: createdBy,
            paymentStatus: 'paid',
            isRecurring: false,
        }
    );

    return {
        $id: response.$id,
        tenantId: response.tenantId,
        category: response.category,
        amount: response.amount,
        date: response.date,
        note: response.note,
        paidBy: response.paidBy,
        createdBy: response.createdBy,
        createdAt: response.$createdAt,
    };
}

/**
 * Get expenses with optional filters
 */
export async function getExpenses(
    tenantId: string,
    filters?: {
        startDate?: string;
        endDate?: string;
        category?: string;
    }
): Promise<Expense[]> {
    try {
        const query = [
            Query.equal('tenantId', tenantId),
            Query.orderDesc('$createdAt'), // Use $createdAt instead of date for ordering
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

        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_ID,
            query
        );

        return response.documents.map((doc: any) => ({
            $id: doc.$id,
            tenantId: doc.tenantId,
            category: doc.category,
            amount: doc.amount,
            date: doc.date || doc.$createdAt,
            note: doc.note,
            paidBy: doc.paidBy,
            createdBy: doc.createdBy,
            createdAt: doc.$createdAt,
        }));
    } catch (error: any) {
        // Collection doesn't exist or query failed - this is expected initially
        if (error.code !== 404) {
            console.log("[Expenses] Collection not ready:", error.code);
        }
        return []; // Return empty array if collection doesn't exist
    }
}

/**
 * Delete an expense record
 */
export async function deleteExpense(expenseId: string): Promise<void> {
    await databases.deleteDocument(
        DATABASE_ID,
        COLLECTION_ID,
        expenseId
    );
}

/**
 * Get total expenses for a period
 */
export async function getExpenseSummary(
    tenantId: string,
    startDate: string,
    endDate: string
): Promise<number> {
    const expenses = await getExpenses(tenantId, { startDate, endDate });
    return expenses.reduce((sum, exp) => sum + exp.amount, 0);
}
