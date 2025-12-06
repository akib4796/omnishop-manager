import { databases, DATABASE_ID, COLLECTIONS, ID, Query, account } from './client';
import type { Tenant, Profile, UserRole } from './types';

/**
 * SysAdmin Authentication & Management Utilities
 */

// New collection for SysAdmin module
export const SYSADMIN_COLLECTIONS = {
    SYSADMIN_USERS: 'sysadmin_users',
    ADMIN_ACTIVITY_LOGS: 'admin_activity_logs',
} as const;

// SysAdmin user type
export interface SysAdminUser {
    $id: string;
    user_id: string;
    email: string;
    full_name: string;
    access_level: 'super_admin' | 'developer';
    last_login?: string;
    $createdAt: string;
    $updatedAt: string;
}

// Activity log type
export interface AdminActivityLog {
    $id: string;
    sysadminId: string;
    actionType: 'create_tenant' | 'assign_user' | 'update_permissions' | 'suspend_tenant' | 'delete_tenant' | 'update_plan';
    targetTenantId?: string;
    targetUserId?: string;
    description?: string;
    ipAddress?: string;
    timestamp?: string;
    $createdAt: string;
}

/**
 * Check if current user is a SysAdmin
 */
export const isSysAdmin = async (): Promise<boolean> => {
    try {
        const user = await account.get();

        const response = await databases.listDocuments<SysAdminUser>(
            DATABASE_ID,
            SYSADMIN_COLLECTIONS.SYSADMIN_USERS,
            [Query.equal('userId', user.$id)]
        );

        return response.documents.length > 0;
    } catch {
        return false;
    }
};

/**
 * Get SysAdmin user details
 */
export const getSysAdminUser = async (userId: string): Promise<SysAdminUser | null> => {
    try {
        const response = await databases.listDocuments<SysAdminUser>(
            DATABASE_ID,
            SYSADMIN_COLLECTIONS.SYSADMIN_USERS,
            [Query.equal('userId', userId)]
        );

        return response.documents[0] || null;
    } catch (error) {
        console.error('Error getting sysadmin user:', error);
        return null;
    }
};

/**
 * Update last login timestamp for SysAdmin
 */
export const updateSysAdminLastLogin = async (sysadminDocId: string): Promise<void> => {
    try {
        await databases.updateDocument(
            DATABASE_ID,
            SYSADMIN_COLLECTIONS.SYSADMIN_USERS,
            sysadminDocId,
            { last_login: new Date().toISOString() }
        );
    } catch (error) {
        console.error('Error updating last login:', error);
    }
};

/**
 * Log SysAdmin activity
 */
export const logAdminActivity = async (
    sysadminId: string,
    actionType: string,
    details?: {
        target_tenant_id?: string;
        target_user_id?: string;
        details?: string;
        ip_address?: string;
    }
): Promise<void> => {
    try {
        await databases.createDocument(
            DATABASE_ID,
            SYSADMIN_COLLECTIONS.ADMIN_ACTIVITY_LOGS,
            ID.unique(),
            {
                sysadminId: sysadminId,
                actionType: actionType,
                targetTenantId: details?.target_tenant_id || '',
                targetUserId: details?.target_user_id || '',
                description: details?.details || '',
                ipAddress: details?.ip_address || '',
                timestamp: new Date().toISOString(),
            }
        );
        console.log('Activity logged successfully:', actionType);
    } catch (error: any) {
        console.error('Error logging activity:', error.message);
        // Don't throw, just log the error silently
    }
};

/**
 * Get all tenants (SysAdmin only)
 */
export const getAllTenants = async (filters?: {
    status?: 'active' | 'suspended' | 'inactive';
    subscription_plan?: 'free' | 'basic' | 'premium';
    limit?: number;
}): Promise<Tenant[]> => {
    try {
        const queries = [];

        if (filters?.status) {
            queries.push(Query.equal('status', filters.status));
        }

        if (filters?.subscription_plan) {
            queries.push(Query.equal('subscription_plan', filters.subscription_plan));
        }

        if (filters?.limit) {
            queries.push(Query.limit(filters.limit));
        }

        const response = await databases.listDocuments<Tenant>(
            DATABASE_ID,
            COLLECTIONS.TENANTS,
            queries
        );

        return response.documents;
    } catch (error) {
        console.error('Error getting all tenants:', error);
        return [];
    }
};

/**
 * Create tenant as SysAdmin
 */
export const createTenantAsSysAdmin = async (
    tenantData: {
        business_name: string;
        business_type?: string;
        currency?: string;
        tax_rate?: number;
        address?: string;
        logo_url?: string;
        default_language?: string;
        subscription_plan?: 'free' | 'basic' | 'premium';
        max_users?: number;
    },
    sysadminId: string
): Promise<{ tenant: Tenant | null; error: string | null }> => {
    try {
        // Convert to camelCase for Appwrite collection
        // Only include attributes that exist in the collection
        const tenant = await databases.createDocument<Tenant>(
            DATABASE_ID,
            COLLECTIONS.TENANTS,
            ID.unique(),
            {
                businessName: tenantData.business_name,
                businessType: tenantData.business_type || 'retail',
                currency: tenantData.currency || 'BDT',
                defaultLanguage: tenantData.default_language || 'en',
                status: 'active',
                subscriptionPlan: tenantData.subscription_plan || 'free',
                maxUsers: tenantData.max_users || 5,
            }
        );

        // Log activity
        await logAdminActivity(sysadminId, 'create_tenant', {
            target_tenant_id: tenant.$id,
            details: `Created tenant: ${tenantData.business_name}`,
        });

        return { tenant, error: null };
    } catch (error: any) {
        return { tenant: null, error: error.message };
    }
};

/**
 * Update tenant (all fields)
 */
export const updateTenant = async (
    tenantId: string,
    data: {
        status?: 'active' | 'suspended' | 'inactive';
        subscriptionPlan?: 'free' | 'basic' | 'premium';
        maxUsers?: number;
        businessType?: string;
        currency?: string;
    },
    sysadminId: string
): Promise<{ success: boolean; error: string | null }> => {
    try {
        await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.TENANTS,
            tenantId,
            data
        );

        // Log activity
        await logAdminActivity(sysadminId, 'update_perms', {
            target_tenant_id: tenantId,
            details: `Updated tenant settings`,
        });

        return { success: true, error: null };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

/**
 * Update tenant status
 */
export const updateTenantStatus = async (
    tenantId: string,
    status: 'active' | 'suspended' | 'inactive',
    sysadminId: string
): Promise<{ success: boolean; error: string | null }> => {
    try {
        await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.TENANTS,
            tenantId,
            { status }
        );

        // Log activity
        await logAdminActivity(sysadminId, 'suspend_tenant', {
            target_tenant_id: tenantId,
            details: `Changed status to: ${status}`,
        });

        return { success: true, error: null };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

/**
 * Update tenant subscription plan
 */
export const updateTenantPlan = async (
    tenantId: string,
    plan: 'free' | 'basic' | 'premium',
    maxUsers: number,
    sysadminId: string
): Promise<{ success: boolean; error: string | null }> => {
    try {
        await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.TENANTS,
            tenantId,
            {
                subscriptionPlan: plan,
                maxUsers: maxUsers,
            }
        );

        // Log activity
        await logAdminActivity(sysadminId, 'update_perms', {
            target_tenant_id: tenantId,
            details: `Updated plan to: ${plan}`,
        });

        return { success: true, error: null };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

/**
 * Get all users for a tenant
 */
export const getTenantUsers = async (tenantId: string): Promise<Profile[]> => {
    try {
        const response = await databases.listDocuments<Profile>(
            DATABASE_ID,
            COLLECTIONS.PROFILES,
            [Query.equal('tenant_id', tenantId)]
        );

        return response.documents;
    } catch (error) {
        console.error('Error getting tenant users:', error);
        return [];
    }
};

/**
 * Assign user to tenant (create profile and role)
 */
export const assignUserToTenant = async (
    userId: string,
    tenantId: string,
    role: 'admin' | 'manager' | 'staff',
    userData: {
        full_name: string;
        email: string;
        phone?: string;
    },
    sysadminId: string
): Promise<{ success: boolean; error: string | null }> => {
    try {
        // Create profile - using camelCase to match Appwrite collection schema
        await databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.PROFILES,
            ID.unique(),
            {
                userId: userId,
                tenantId: tenantId,
                fullName: userData.full_name,
                email: userData.email,
                phone: userData.phone || '',
                createdDate: new Date().toISOString(),
            }
        );

        // Create role - using camelCase to match Appwrite collection schema
        await databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.USER_ROLES,
            ID.unique(),
            {
                userId: userId,
                tenantId: tenantId,
                role,
                createdDate: new Date().toISOString(),
                active: true,
            }
        );

        // Log activity
        await logAdminActivity(sysadminId, 'assign_user', {
            target_tenant_id: tenantId,
            target_user_id: userId,
            details: `Assigned user as ${role}`,
        });

        return { success: true, error: null };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

/**
 * Get activity logs
 */
export const getActivityLogs = async (
    filters?: {
        sysadmin_id?: string;
        action_type?: string;
        limit?: number;
    }
): Promise<AdminActivityLog[]> => {
    try {
        const queries = [Query.orderDesc('$createdAt')];

        if (filters?.sysadmin_id) {
            queries.push(Query.equal('sysadmin_id', filters.sysadmin_id));
        }

        if (filters?.action_type) {
            queries.push(Query.equal('action_type', filters.action_type));
        }

        if (filters?.limit) {
            queries.push(Query.limit(filters.limit));
        } else {
            queries.push(Query.limit(50));
        }

        const response = await databases.listDocuments<AdminActivityLog>(
            DATABASE_ID,
            SYSADMIN_COLLECTIONS.ADMIN_ACTIVITY_LOGS,
            queries
        );

        return response.documents;
    } catch (error) {
        console.error('Error getting activity logs:', error);
        return [];
    }
};

/**
 * Delete tenant (soft delete by setting status to inactive)
 */
export const deleteTenant = async (
    tenantId: string,
    sysadminId: string
): Promise<{ success: boolean; error: string | null }> => {
    try {
        // Soft delete by setting status to inactive
        await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.TENANTS,
            tenantId,
            { status: 'inactive' }
        );

        // Log activity (use suspend_tenant as delete_tenant is not in enum)
        await logAdminActivity(sysadminId, 'suspend_tenant', {
            target_tenant_id: tenantId,
            details: 'Tenant deleted (marked as inactive)',
        });

        return { success: true, error: null };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};
