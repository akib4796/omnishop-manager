import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllTenants, getActivityLogs } from "@/integrations/appwrite/sysadmin";
import { databases } from "@/integrations/appwrite";
import type { Tenant } from "@/integrations/appwrite/types";
import type { AdminActivityLog } from "@/integrations/appwrite/sysadmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Loader2, ArrowLeft, TrendingUp, Users, Building2, Activity,
    BarChart3, PieChart, Calendar, DollarSign
} from "lucide-react";
import { toast } from "sonner";
import { Query } from "appwrite";

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'omnishop_db';

export default function Analytics() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [activities, setActivities] = useState<AdminActivityLog[]>([]);
    const [userCount, setUserCount] = useState(0);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const allTenants = await getAllTenants({ limit: 100 });
            setTenants(allTenants);

            const logs = await getActivityLogs({ limit: 100 });
            setActivities(logs);

            // Get user count
            try {
                const profilesRes = await databases.listDocuments(
                    DATABASE_ID,
                    'profiles',
                    [Query.limit(1)]
                );
                setUserCount(profilesRes.total);
            } catch {
                setUserCount(0);
            }
        } catch (error) {
            toast.error("Failed to load analytics data");
        } finally {
            setLoading(false);
        }
    };

    // Calculate stats
    const activeTenants = tenants.filter(t => t.status === 'active' || !t.status).length;
    const suspendedTenants = tenants.filter(t => t.status === 'suspended').length;
    const inactiveTenants = tenants.filter(t => t.status === 'inactive').length;

    const freePlanCount = tenants.filter(t => t.subscriptionPlan === 'free' || !t.subscriptionPlan).length;
    const basicPlanCount = tenants.filter(t => t.subscriptionPlan === 'basic').length;
    const premiumPlanCount = tenants.filter(t => t.subscriptionPlan === 'premium').length;

    const totalMaxUsers = tenants.reduce((acc, t) => acc + (t.maxUsers || 5), 0);

    // Business type distribution
    const businessTypes = tenants.reduce((acc: Record<string, number>, t) => {
        const type = t.businessType || 'other';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {});

    // Activity stats by type
    const activityByType = activities.reduce((acc: Record<string, number>, a) => {
        const type = a.actionType || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {});

    // Recent tenant growth (last 7 days simulation)
    const recentTenants = tenants.filter(t => {
        const created = new Date(t.$createdAt);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return created >= weekAgo;
    }).length;

    // Monthly revenue estimate (simulation)
    const monthlyRevenue = (basicPlanCount * 29) + (premiumPlanCount * 99);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-background to-blue-50 dark:from-purple-950 dark:via-background dark:to-blue-950">
            <div className="container mx-auto p-6">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/sysadmin/dashboard")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                            Platform Analytics
                        </h1>
                        <p className="text-muted-foreground">Overview of platform metrics and insights</p>
                    </div>
                </div>

                {/* Key Metrics */}
                <div className="grid gap-4 md:grid-cols-4 mb-8">
                    <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium opacity-90">Total Tenants</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{tenants.length}</div>
                            <p className="text-xs opacity-80 mt-1">
                                +{recentTenants} this week
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium opacity-90">Total Users</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{userCount}</div>
                            <p className="text-xs opacity-80 mt-1">
                                Max capacity: {totalMaxUsers}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium opacity-90">Active Tenants</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{activeTenants}</div>
                            <p className="text-xs opacity-80 mt-1">
                                {Math.round((activeTenants / tenants.length) * 100 || 0)}% of total
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium opacity-90">Est. Monthly Revenue</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">${monthlyRevenue}</div>
                            <p className="text-xs opacity-80 mt-1">
                                Based on subscription plans
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-2 mb-8">
                    {/* Subscription Distribution */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <PieChart className="h-5 w-5 text-purple-500" />
                                Subscription Plans
                            </CardTitle>
                            <CardDescription>Distribution of subscription tiers</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-gray-400 rounded-full" />
                                        <span>Free</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold">{freePlanCount}</span>
                                        <Badge variant="outline">{Math.round((freePlanCount / tenants.length) * 100 || 0)}%</Badge>
                                    </div>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2">
                                    <div
                                        className="bg-gray-400 h-2 rounded-full"
                                        style={{ width: `${(freePlanCount / tenants.length) * 100 || 0}%` }}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-blue-500 rounded-full" />
                                        <span>Basic ($29/mo)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold">{basicPlanCount}</span>
                                        <Badge variant="outline">{Math.round((basicPlanCount / tenants.length) * 100 || 0)}%</Badge>
                                    </div>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2">
                                    <div
                                        className="bg-blue-500 h-2 rounded-full"
                                        style={{ width: `${(basicPlanCount / tenants.length) * 100 || 0}%` }}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-purple-500 rounded-full" />
                                        <span>Premium ($99/mo)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold">{premiumPlanCount}</span>
                                        <Badge variant="outline">{Math.round((premiumPlanCount / tenants.length) * 100 || 0)}%</Badge>
                                    </div>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2">
                                    <div
                                        className="bg-purple-500 h-2 rounded-full"
                                        style={{ width: `${(premiumPlanCount / tenants.length) * 100 || 0}%` }}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tenant Status */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-blue-500" />
                                Tenant Status
                            </CardTitle>
                            <CardDescription>Current status of all tenants</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                                            {activeTenants}
                                        </div>
                                        <div>
                                            <p className="font-medium">Active</p>
                                            <p className="text-sm text-muted-foreground">Operating normally</p>
                                        </div>
                                    </div>
                                    <TrendingUp className="h-5 w-5 text-green-500" />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold">
                                            {suspendedTenants}
                                        </div>
                                        <div>
                                            <p className="font-medium">Suspended</p>
                                            <p className="text-sm text-muted-foreground">Temporarily disabled</p>
                                        </div>
                                    </div>
                                    <Activity className="h-5 w-5 text-yellow-500" />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">
                                            {inactiveTenants}
                                        </div>
                                        <div>
                                            <p className="font-medium">Inactive</p>
                                            <p className="text-sm text-muted-foreground">Closed or deleted</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Business Types */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-purple-500" />
                                Business Types
                            </CardTitle>
                            <CardDescription>Types of businesses on the platform</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {Object.entries(businessTypes).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                                    <div key={type} className="flex items-center justify-between">
                                        <span className="capitalize">{type.replace('_', ' ')}</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-32 bg-muted rounded-full h-2">
                                                <div
                                                    className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full"
                                                    style={{ width: `${(count / tenants.length) * 100}%` }}
                                                />
                                            </div>
                                            <span className="font-bold w-8 text-right">{count}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Activity Overview */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="h-5 w-5 text-blue-500" />
                                Activity Summary
                            </CardTitle>
                            <CardDescription>Admin actions breakdown</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {Object.entries(activityByType).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
                                    const labels: Record<string, string> = {
                                        create_tenant: 'Tenants Created',
                                        suspend_tenant: 'Status Changed',
                                        update_perms: 'Settings Updated',
                                        assign_user: 'Users Assigned',
                                    };
                                    return (
                                        <div key={type} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                            <span>{labels[type] || type.replace('_', ' ')}</span>
                                            <Badge className="bg-gradient-to-r from-purple-500 to-blue-500">{count}</Badge>
                                        </div>
                                    );
                                })}
                                {Object.keys(activityByType).length === 0 && (
                                    <p className="text-center text-muted-foreground py-8">No activity recorded yet</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
