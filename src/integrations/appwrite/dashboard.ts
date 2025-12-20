/**
 * Dashboard integration layer for Appwrite
 * Provides metrics and dashboard data queries
 */

import { Query } from 'appwrite';
import { databases, account } from './client';

const DATABASE_ID = 'omnishop_db';

// ============================================================================
// Types
// ============================================================================

export interface DashboardMetrics {
    tenantName: string;
    productsCount: number;
    customersCount: number;
    todaySales: number;
    monthSales: number;
    totalRevenue: number;
}

// ============================================================================
// Dashboard Queries
// ============================================================================

/**
 * Get current user's tenant name
 */
export async function getTenantName(tenantId: string): Promise<string> {
    try {
        const response = await databases.getDocument(
            DATABASE_ID,
            'tenants',
            tenantId
        );
        return response.businessName || response.business_name || '';
    } catch (error) {
        console.error('Error fetching tenant:', error);
        return '';
    }
}

/**
 * Get products count for a tenant
 */
export async function getProductsCount(tenantId: string): Promise<number> {
    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            'products',
            [
                Query.equal('tenantId', tenantId),
                Query.limit(1),
            ]
        );
        return response.total;
    } catch (error) {
        console.error('Error counting products:', error);
        return 0;
    }
}

/**
 * Get customers count for a tenant
 */
export async function getCustomersCount(tenantId: string): Promise<number> {
    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            'customers',
            [
                Query.equal('tenantId', tenantId),
                Query.limit(1),
            ]
        );
        return response.total;
    } catch (error) {
        console.error('Error counting customers:', error);
        return 0;
    }
}

/**
 * Get today's sales total
 */
export async function getTodaySalesTotal(tenantId: string): Promise<number> {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const response = await databases.listDocuments(
            DATABASE_ID,
            'pending_sales',
            [
                Query.equal('tenantId', tenantId),
                Query.greaterThanEqual('createdAt', today.toISOString()),
                Query.limit(500),
            ]
        );

        return response.documents.reduce((sum: number, doc: any) => {
            const saleData = typeof doc.saleData === 'string'
                ? JSON.parse(doc.saleData)
                : doc.saleData;
            return sum + (saleData?.total || 0);
        }, 0);
    } catch (error) {
        console.error('Error fetching today sales:', error);
        return 0;
    }
}

/**
 * Get monthly sales total
 */
export async function getMonthlySalesTotal(tenantId: string): Promise<number> {
    try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const response = await databases.listDocuments(
            DATABASE_ID,
            'pending_sales',
            [
                Query.equal('tenantId', tenantId),
                Query.greaterThanEqual('createdAt', startOfMonth.toISOString()),
                Query.limit(1000),
            ]
        );

        return response.documents.reduce((sum: number, doc: any) => {
            const saleData = typeof doc.saleData === 'string'
                ? JSON.parse(doc.saleData)
                : doc.saleData;
            return sum + (saleData?.total || 0);
        }, 0);
    } catch (error) {
        console.error('Error fetching monthly sales:', error);
        return 0;
    }
}

/**
 * Get all dashboard metrics at once
 */
export async function getDashboardMetrics(tenantId: string): Promise<DashboardMetrics> {
    const [tenantName, productsCount, customersCount, todaySales, monthSales] = await Promise.all([
        getTenantName(tenantId),
        getProductsCount(tenantId),
        getCustomersCount(tenantId),
        getTodaySalesTotal(tenantId),
        getMonthlySalesTotal(tenantId),
    ]);

    return {
        tenantName,
        productsCount,
        customersCount,
        todaySales,
        monthSales,
        totalRevenue: monthSales, // For now, same as monthly
    };
}
