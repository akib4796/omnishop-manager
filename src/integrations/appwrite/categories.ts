// Categories CRUD operations for Appwrite
import { databases, ID, Query } from './client';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'omnishop_db';
const COLLECTION_ID = 'categories';

export interface Category {
    $id: string;
    tenantId: string;
    name: string;
    color: string;
    createdDate: string;
    lastUpdatedDate: string;
    description?: string;
    isActive: boolean;
    $createdAt?: string;
    $updatedAt?: string;
}

export interface CreateCategoryData {
    name: string;
    color: string;
    tenantId: string;
    description?: string;
    isActive?: boolean;
}

/**
 * Get all categories for a tenant
 */
export const getCategories = async (tenantId: string): Promise<Category[]> => {
    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_ID,
            [
                Query.equal('tenantId', tenantId),
                Query.equal('isActive', true),
                Query.orderAsc('name'),
                Query.limit(100)
            ]
        );
        return response.documents as unknown as Category[];
    } catch (error: any) {
        console.error('Error fetching categories:', error);
        throw error;
    }
};

/**
 * Get all categories (for admin/sysadmin use)
 */
export const getAllCategories = async (): Promise<Category[]> => {
    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_ID,
            [
                Query.orderAsc('name'),
                Query.limit(100)
            ]
        );
        return response.documents as unknown as Category[];
    } catch (error: any) {
        console.error('Error fetching all categories:', error);
        throw error;
    }
};

/**
 * Get a single category by ID
 */
export const getCategoryById = async (categoryId: string): Promise<Category> => {
    try {
        const response = await databases.getDocument(
            DATABASE_ID,
            COLLECTION_ID,
            categoryId
        );
        return response as unknown as Category;
    } catch (error: any) {
        console.error('Error fetching category:', error);
        throw error;
    }
};

/**
 * Create a new category
 */
export const createCategory = async (data: CreateCategoryData): Promise<Category> => {
    try {
        const now = new Date().toISOString();
        const response = await databases.createDocument(
            DATABASE_ID,
            COLLECTION_ID,
            ID.unique(),
            {
                tenantId: data.tenantId,
                name: data.name,
                color: data.color,
                createdDate: now,
                lastUpdatedDate: now,
                description: data.description || null,
                isActive: data.isActive ?? true,
            }
        );
        return response as unknown as Category;
    } catch (error: any) {
        console.error('Error creating category:', error);
        throw error;
    }
};

/**
 * Update an existing category
 */
export const updateCategory = async (
    categoryId: string,
    data: Partial<CreateCategoryData>
): Promise<Category> => {
    try {
        const updateData: Record<string, any> = {
            lastUpdatedDate: new Date().toISOString(),
        };
        if (data.name !== undefined) updateData.name = data.name;
        if (data.color !== undefined) updateData.color = data.color;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.isActive !== undefined) updateData.isActive = data.isActive;

        const response = await databases.updateDocument(
            DATABASE_ID,
            COLLECTION_ID,
            categoryId,
            updateData
        );
        return response as unknown as Category;
    } catch (error: any) {
        console.error('Error updating category:', error);
        throw error;
    }
};

/**
 * Delete a category (soft delete by setting isActive to false)
 */
export const deleteCategory = async (categoryId: string): Promise<void> => {
    try {
        await databases.updateDocument(
            DATABASE_ID,
            COLLECTION_ID,
            categoryId,
            { isActive: false }
        );
    } catch (error: any) {
        console.error('Error deleting category:', error);
        throw error;
    }
};

/**
 * Hard delete a category (permanently remove)
 */
export const hardDeleteCategory = async (categoryId: string): Promise<void> => {
    try {
        await databases.deleteDocument(
            DATABASE_ID,
            COLLECTION_ID,
            categoryId
        );
    } catch (error: any) {
        console.error('Error hard deleting category:', error);
        throw error;
    }
};
