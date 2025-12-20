import { ID, Query } from 'appwrite';
import { databases } from './client';

const DATABASE_ID = 'omnishop_db';
const COLLECTION_ID = 'wallets';

// ============================================================================
// Types
// ============================================================================

export interface Wallet {
    $id: string;
    tenantId: string;
    name: string;
    type: 'cash' | 'bank' | 'mobile' | 'safe' | 'other';
    icon?: string;
    color?: string;
    balance: number; // Current balance
    isDefault: boolean;
    createdAt: string;
}

export interface CreateWalletData {
    tenantId: string;
    name: string;
    type: 'cash' | 'bank' | 'mobile' | 'safe' | 'other';
    icon?: string;
    color?: string;
    isDefault?: boolean;
}

// Default wallets (used when no custom wallets exist)
export const DEFAULT_WALLETS = [
    { id: 'Cash', name: 'Cash Drawer', type: 'cash', icon: 'Wallet', color: 'green' },
    { id: 'Bank Transfer', name: 'Bank Account', type: 'bank', icon: 'Landmark', color: 'blue' },
    { id: 'Mobile Money', name: 'Mobile Money', type: 'mobile', icon: 'Smartphone', color: 'purple' },
    { id: 'Safe', name: 'Office Safe', type: 'safe', icon: 'Vault', color: 'amber' },
];

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Get all wallets for a tenant
 */
export async function getWallets(tenantId: string): Promise<Wallet[]> {
    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_ID,
            [
                Query.equal('tenantId', tenantId),
                Query.orderAsc('name'),
                Query.limit(50),
            ]
        );

        return response.documents.map((doc: any) => ({
            $id: doc.$id,
            tenantId: doc.tenantId,
            name: doc.name,
            type: doc.type,
            icon: doc.icon,
            color: doc.color,
            balance: doc.balance || 0,
            isDefault: doc.isDefault || false,
            createdAt: doc.$createdAt,
        }));
    } catch (error: any) {
        // If collection doesn't exist, silently return empty (use defaults)
        // This is expected when the wallets collection hasn't been created yet
        return [];
    }
}

/**
 * Create a new wallet
 */
export async function createWallet(data: CreateWalletData): Promise<Wallet> {
    const docId = ID.unique();
    const response = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_ID,
        docId,
        {
            walletId: docId, // Use the same ID for walletId field
            tenantId: data.tenantId,
            name: data.name,
            type: data.type,
            icon: data.icon || 'Wallet',
            color: data.color || 'gray',
            balance: 0, // Start with zero balance
        }
    );

    return {
        $id: response.$id,
        tenantId: response.tenantId,
        name: response.name,
        type: response.type,
        icon: response.icon,
        color: response.color,
        balance: response.balance || 0,
        isDefault: response.isDefault,
        createdAt: response.$createdAt,
    };
}

/**
 * Update a wallet
 */
export async function updateWallet(
    walletId: string,
    data: Partial<CreateWalletData>
): Promise<Wallet> {
    const response = await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_ID,
        walletId,
        {
            name: data.name,
            type: data.type,
            icon: data.icon,
            color: data.color,
        }
    );

    return {
        $id: response.$id,
        tenantId: response.tenantId,
        name: response.name,
        type: response.type,
        icon: response.icon,
        color: response.color,
        balance: response.balance || 0,
        isDefault: response.isDefault,
        createdAt: response.$createdAt,
    };
}

/**
 * Delete a wallet
 */
export async function deleteWallet(walletId: string): Promise<void> {
    await databases.deleteDocument(DATABASE_ID, COLLECTION_ID, walletId);
}

/**
 * Get wallets for display (either custom or defaults)
 */
export async function getDisplayWallets(tenantId: string): Promise<Array<{
    id: string;
    name: string;
    type: string;
    icon: string;
    color: string;
}>> {
    const customWallets = await getWallets(tenantId);

    if (customWallets.length > 0) {
        return customWallets.map(w => ({
            id: w.name, // Use name as ID for payment method matching
            name: w.name,
            type: w.type,
            icon: w.icon || 'Wallet',
            color: w.color || 'gray',
        }));
    }

    // Return defaults if no custom wallets
    return DEFAULT_WALLETS;
}

/**
 * Update a wallet's balance
 */
export async function updateWalletBalance(
    tenantId: string,
    walletName: string,
    amount: number,
    type: 'IN' | 'OUT'
): Promise<void> {
    try {
        // Find wallet by name
        const wallets = await getWallets(tenantId);
        const wallet = wallets.find(w => w.name === walletName);

        if (!wallet) {
            console.log(`[Wallets] Wallet "${walletName}" not found, skipping balance update`);
            return;
        }

        const newBalance = type === 'IN'
            ? wallet.balance + amount
            : wallet.balance - amount;

        await databases.updateDocument(
            DATABASE_ID,
            COLLECTION_ID,
            wallet.$id,
            { balance: newBalance }
        );

        console.log(`[Wallets] Updated ${walletName} balance: ${wallet.balance} → ${newBalance}`);
    } catch (error: any) {
        console.error('[Wallets] Failed to update balance:', error.message);
        // Don't throw - this is a non-critical operation
    }
}

/**
 * Sync all wallet balances from payments collection
 */
export async function syncWalletBalances(
    tenantId: string,
    getLedgerEntries: (tenantId: string) => Promise<Array<{ type: string, method: string, amount: number }>>
): Promise<void> {
    try {
        const wallets = await getWallets(tenantId);
        const ledger = await getLedgerEntries(tenantId);

        // Calculate balance for each wallet from ledger
        for (const wallet of wallets) {
            let balance = 0;
            ledger.forEach(entry => {
                if (entry.method === wallet.name) {
                    balance += entry.type === 'IN' ? entry.amount : -entry.amount;
                }
            });

            // Update wallet balance
            await databases.updateDocument(
                DATABASE_ID,
                COLLECTION_ID,
                wallet.$id,
                { balance }
            );
        }

        console.log('[Wallets] Synced all wallet balances from ledger');
    } catch (error: any) {
        console.error('[Wallets] Failed to sync balances:', error.message);
    }
}
