import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { account, signOut } from "@/integrations/appwrite";
import { getSysAdminUser, getAllTenants, getActivityLogs } from "@/integrations/appwrite/sysadmin";
import type { SysAdminUser, AdminActivityLog } from "@/integrations/appwrite/sysadmin";
import type { Tenant } from "@/integrations/appwrite/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Building2, Users, Activity, Plus, TrendingUp, LogOut, Shield, Settings } from "lucide-react";
import { toast } from "sonner";

export default function SysAdminDashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [sysAdmin, setSysAdmin] = useState<SysAdminUser | null>(null);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [recentActivity, setRecentActivity] = useState<AdminActivityLog[]>([]);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const user = await account.get();
            const adminUser = await getSysAdminUser(user.$id);
            setSysAdmin(adminUser);

            const allTenants = await getAllTenants({ limit: 100 });
            setTenants(allTenants);

            const logs = await getActivityLogs({ limit: 10 });
            setRecentActivity(logs);
        } catch (error) {
            toast.error("Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const handleLogout = async () => {
        await signOut();
        toast.success("Logged out successfully");
        navigate("/sysadmin/login");
    };

    const activeTenantsCount = tenants.filter(t => t.status === 'active' || !t.status).length;
    const totalUsers = tenants.reduce((acc, tenant) => acc + (tenant.maxUsers || 5), 0);

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-background to-blue-50 dark:from-purple-950 dark:via-background dark:to-blue-950">
            <div className="container mx-auto p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <Shield className="h-10 w-10 text-purple-500" />
                        <div>
                            <h1 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                                SysAdmin Dashboard
                            </h1>
                            <p className="text-muted-foreground">
                                Welcome back, {sysAdmin?.full_name || 'Administrator'}
                            </p>
                        </div>
                    </div>
                    <Button variant="outline" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </Button>
                </div>

                {/* Stats Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{tenants.length}</div>
                            <p className="text-xs text-muted-foreground">
                                {activeTenantsCount} active
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalUsers}</div>
                            <p className="text-xs text-muted-foreground">
                                Across all tenants
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Activity</CardTitle>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{recentActivity.length}</div>
                            <p className="text-xs text-muted-foreground">
                                Recent actions
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Growth</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">+12%</div>
                            <p className="text-xs text-muted-foreground">
                                This month
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Actions */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                        <CardDescription>Common administrative tasks</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-4">
                        <Button onClick={() => navigate("/sysadmin/tenants")} className="flex-1 min-w-[150px]">
                            <Building2 className="mr-2 h-4 w-4" />
                            Manage Tenants
                        </Button>
                        <Button onClick={() => navigate("/sysadmin/users")} variant="outline" className="flex-1 min-w-[150px]">
                            <Users className="mr-2 h-4 w-4" />
                            Manage Users
                        </Button>
                        <Button onClick={() => navigate("/sysadmin/analytics")} variant="outline" className="flex-1 min-w-[150px]">
                            <TrendingUp className="mr-2 h-4 w-4" />
                            View Analytics
                        </Button>
                        <Button onClick={() => navigate("/sysadmin/activity")} variant="outline" className="flex-1 min-w-[150px]">
                            <Activity className="mr-2 h-4 w-4" />
                            View Activity
                        </Button>
                        <Button onClick={() => navigate("/sysadmin/settings")} variant="outline" className="flex-1 min-w-[150px]">
                            <Settings className="mr-2 h-4 w-4" />
                            System Settings
                        </Button>
                    </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>Latest administrative actions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {recentActivity.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No recent activity</p>
                        ) : (
                            <div className="space-y-4">
                                {recentActivity.map((log) => (
                                    <div key={log.$id} className="flex items-start justify-between border-b pb-4 last:border-0">
                                        <div>
                                            <p className="text-sm font-medium">{log.actionType?.replace('_', ' ').toUpperCase() || 'Action'}</p>
                                            <p className="text-xs text-muted-foreground">{log.description || 'No details'}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {new Date(log.$createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
