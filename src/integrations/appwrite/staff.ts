/**
 * Staff integration layer for Appwrite
 * Handles staff/employee management
 */

import { ID, Query } from 'appwrite';
import { databases } from './client';

const DATABASE_ID = 'omnishop_db';

// ============================================================================
// Types
// ============================================================================

export interface StaffMember {
    $id: string;
    userId: string;
    email: string;
    fullName: string;
    role: 'admin' | 'cashier' | 'manager' | 'staff';
    tenantId: string;
    isActive: boolean;
    createdAt?: string;
}

export interface CreateStaffData {
    email: string;
    fullName: string;
    role: 'admin' | 'cashier' | 'manager' | 'staff';
    tenantId: string;
}

// ============================================================================
// Staff Queries
// ============================================================================

/**
 * Get all staff members for a tenant (via profiles)
 */
export async function getStaffMembers(tenantId: string): Promise<StaffMember[]> {
    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            'profiles',
            [
                Query.equal('tenantId', tenantId),
                Query.orderAsc('fullName'),
                Query.limit(100),
            ]
        );

        return response.documents.map((doc: any) => ({
            $id: doc.$id,
            userId: doc.userId,
            email: doc.email || '',
            fullName: doc.fullName || '',
            role: doc.role || 'staff',
            tenantId: doc.tenantId,
            isActive: doc.isActive !== false,
            createdAt: doc.$createdAt,
        }));
    } catch (error) {
        console.error('Error fetching staff members:', error);
        return [];
    }
}

/**
 * Update staff member role
 */
export async function updateStaffRole(
    staffId: string,
    role: 'admin' | 'cashier' | 'manager' | 'staff'
): Promise<void> {
    await databases.updateDocument(
        DATABASE_ID,
        'profiles',
        staffId,
        { role }
    );
}

/**
 * Update staff member status
 */
export async function updateStaffStatus(staffId: string, isActive: boolean): Promise<void> {
    await databases.updateDocument(
        DATABASE_ID,
        'profiles',
        staffId,
        { isActive }
    );
}

/**
 * Get staff count for a tenant
 */
export async function getStaffCount(tenantId: string): Promise<number> {
    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            'profiles',
            [
                Query.equal('tenantId', tenantId),
                Query.limit(1),
            ]
        );
        return response.total;
    } catch (error) {
        console.error('Error counting staff:', error);
        return 0;
    }
}
