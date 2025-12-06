import { account, databases, DATABASE_ID, COLLECTIONS, Query, ID } from './client';
import type { Profile, Tenant, UserRole, CreateDocument } from './types';

/**
 * Authentication utilities for Appwrite
 */

// Check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
    try {
        await account.get();
        return true;
    } catch {
        return false;
    }
};

// Get current user
export const getCurrentUser = async () => {
    try {
        return await account.get();
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
};

// Sign up new user
export const signUp = async (email: string, password: string, name: string) => {
    try {
        const user = await account.create(ID.unique(), email, password, name);
        // Auto-login after signup
        await account.createEmailPasswordSession(email, password);
        return { user, error: null };
    } catch (error: any) {
        return { user: null, error: error.message || 'Sign up failed' };
    }
};

// Sign in user
export const signIn = async (email: string, password: string) => {
    try {
        // Delete existing session if any (prevents "session already exists" error)
        try {
            await account.deleteSession('current');
        } catch {
            // No existing session, continue
        }

        const session = await account.createEmailPasswordSession(email, password);
        return { session, error: null };
    } catch (error: any) {
        return { session: null, error: error.message || 'Sign in failed' };
    }
};

// Sign out user
export const signOut = async () => {
    try {
        await account.deleteSession('current');
        return { error: null };
    } catch (error: any) {
        return { error: error.message || 'Sign out failed' };
    }
};

// Send password reset email
export const resetPassword = async (email: string) => {
    try {
        await account.createRecovery(
            email,
            `${window.location.origin}/reset-password`
        );
        return { error: null };
    } catch (error: any) {
        return { error: error.message || 'Password reset failed' };
    }
};

/**
 * User profile utilities
 */

// Get user profile
export const getUserProfile = async (userId: string): Promise<Profile | null> => {
    try {
        const response = await databases.listDocuments<Profile>(
            DATABASE_ID,
            COLLECTIONS.PROFILES,
            [Query.equal('user_id', userId)]
        );
        return response.documents[0] || null;
    } catch (error) {
        console.error('Error getting user profile:', error);
        return null;
    }
};

// Create user profile
export const createUserProfile = async (data: CreateDocument<Profile>) => {
    try {
        const profile = await databases.createDocument<Profile>(
            DATABASE_ID,
            COLLECTIONS.PROFILES,
            ID.unique(),
            data
        );
        return { profile, error: null };
    } catch (error: any) {
        return { profile: null, error: error.message };
    }
};

// Update user profile
export const updateUserProfile = async (documentId: string, data: Partial<CreateDocument<Profile>>) => {
    try {
        const profile = await databases.updateDocument<Profile>(
            DATABASE_ID,
            COLLECTIONS.PROFILES,
            documentId,
            data
        );
        return { profile, error: null };
    } catch (error: any) {
        return { profile: null, error: error.message };
    }
};

/**
 * Tenant utilities
 */

// Get user's tenant
export const getUserTenant = async (tenantId: string): Promise<Tenant | null> => {
    try {
        const tenant = await databases.getDocument<Tenant>(
            DATABASE_ID,
            COLLECTIONS.TENANTS,
            tenantId
        );
        return tenant;
    } catch (error) {
        console.error('Error getting tenant:', error);
        return null;
    }
};

// Create tenant
export const createTenant = async (data: CreateDocument<Tenant>) => {
    try {
        const tenant = await databases.createDocument<Tenant>(
            DATABASE_ID,
            COLLECTIONS.TENANTS,
            ID.unique(),
            data
        );
        return { tenant, error: null };
    } catch (error: any) {
        return { tenant: null, error: error.message };
    }
};

/**
 * User roles utilities
 */

// Get user role
export const getUserRole = async (userId: string, tenantId: string): Promise<UserRole | null> => {
    try {
        const response = await databases.listDocuments<UserRole>(
            DATABASE_ID,
            COLLECTIONS.USER_ROLES,
            [
                Query.equal('user_id', userId),
                Query.equal('tenant_id', tenantId)
            ]
        );
        return response.documents[0] || null;
    } catch (error) {
        console.error('Error getting user role:', error);
        return null;
    }
};

// Create user role
export const createUserRole = async (data: CreateDocument<UserRole>) => {
    try {
        const role = await databases.createDocument<UserRole>(
            DATABASE_ID,
            COLLECTIONS.USER_ROLES,
            ID.unique(),
            data
        );
        return { role, error: null };
    } catch (error: any) {
        return { role: null, error: error.message };
    }
};

// Check if user has role
export const hasRole = async (userId: string, tenantId: string, requiredRole: 'admin' | 'manager' | 'staff'): Promise<boolean> => {
    try {
        const userRole = await getUserRole(userId, tenantId);
        if (!userRole) return false;

        const roleHierarchy = { admin: 3, manager: 2, staff: 1 };
        return roleHierarchy[userRole.role] >= roleHierarchy[requiredRole];
    } catch {
        return false;
    }
};
