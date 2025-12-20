/**
 * Customers integration layer for Appwrite
 * Handles customer CRUD operations
 */

import { ID, Query } from 'appwrite';
import { databases } from './client';

const DATABASE_ID = 'omnishop_db';
const COLLECTION_ID = 'customers';

// ============================================================================
// Types
// ============================================================================

export interface Customer {
    $id: string;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    priceTier?: 'retail' | 'wholesale' | 'dealer';
    creditLimit?: number;
    tenantId: string;
    createdAt?: string;
    lastUpdatedAt?: string;
}

export interface CreateCustomerData {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    priceTier?: 'retail' | 'wholesale' | 'dealer';
    creditLimit?: number;
    tenantId: string;
}

export interface UpdateCustomerData {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    priceTier?: 'retail' | 'wholesale' | 'dealer';
    creditLimit?: number;
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Get all customers for a tenant
 */
export async function getCustomers(tenantId: string): Promise<Customer[]> {
    const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [
            Query.equal('tenantId', tenantId),
            Query.orderAsc('name'),
            Query.limit(500),
        ]
    );

    return response.documents.map((doc: any) => ({
        $id: doc.$id,
        name: doc.name,
        phone: doc.phone,
        email: doc.email,
        address: doc.address,
        priceTier: doc.priceTier || 'retail',
        creditLimit: doc.creditLimit || 0,
        tenantId: doc.tenantId,
        createdAt: doc.createdAt,
        lastUpdatedAt: doc.lastUpdatedAt,
    }));
}

/**
 * Get a customer by ID
 */
export async function getCustomerById(customerId: string): Promise<Customer | null> {
    try {
        const doc = await databases.getDocument(
            DATABASE_ID,
            COLLECTION_ID,
            customerId
        );

        return {
            $id: doc.$id,
            name: doc.name,
            phone: doc.phone,
            email: doc.email,
            address: doc.address,
            priceTier: doc.priceTier || 'retail',
            creditLimit: doc.creditLimit || 0,
            tenantId: doc.tenantId,
            createdAt: doc.createdAt,
            lastUpdatedAt: doc.lastUpdatedAt,
        };
    } catch (error) {
        console.error('Error fetching customer:', error);
        return null;
    }
}

/**
 * Search customers by name or phone
 */
export async function searchCustomers(tenantId: string, query: string): Promise<Customer[]> {
    // Appwrite doesn't support LIKE queries, so we fetch all and filter client-side
    const allCustomers = await getCustomers(tenantId);
    const lowerQuery = query.toLowerCase();

    return allCustomers.filter(customer =>
        customer.name.toLowerCase().includes(lowerQuery) ||
        customer.phone?.toLowerCase().includes(lowerQuery) ||
        customer.email?.toLowerCase().includes(lowerQuery)
    );
}

/**
 * Create a new customer
 */
export async function createCustomer(data: CreateCustomerData): Promise<Customer> {
    const customerId = ID.unique();

    const response = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_ID,
        customerId,
        {
            customerId: customerId,
            name: data.name,
            phone: data.phone || '',  // Required field
            email: data.email ?? null,
            address: data.address ?? null,
            priceTier: data.priceTier || 'retail',
            creditLimit: data.creditLimit || 0,
            tenantId: data.tenantId,
        }
    );

    return {
        $id: response.$id,
        name: response.name,
        phone: response.phone,
        email: response.email,
        address: response.address,
        priceTier: response.priceTier,
        creditLimit: response.creditLimit,
        tenantId: response.tenantId,
        createdAt: response.$createdAt,
        lastUpdatedAt: response.$updatedAt,
    };
}

/**
 * Update a customer
 */
export async function updateCustomer(
    customerId: string,
    data: UpdateCustomerData
): Promise<Customer> {
    const response = await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_ID,
        customerId,
        {
            ...data,
            lastUpdatedAt: new Date().toISOString(),
        }
    );

    return {
        $id: response.$id,
        name: response.name,
        phone: response.phone,
        email: response.email,
        address: response.address,
        tenantId: response.tenantId,
        createdAt: response.createdAt,
        lastUpdatedAt: response.lastUpdatedAt,
    };
}

/**
 * Delete a customer
 */
export async function deleteCustomer(customerId: string): Promise<void> {
    await databases.deleteDocument(
        DATABASE_ID,
        COLLECTION_ID,
        customerId
    );
}

/**
 * Get customer count for a tenant
 */
export async function getCustomerCount(tenantId: string): Promise<number> {
    const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [
            Query.equal('tenantId', tenantId),
            Query.limit(1),
        ]
    );

    return response.total;
}
