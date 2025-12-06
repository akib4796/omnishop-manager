import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getActivityLogs } from "@/integrations/appwrite/sysadmin";
import type { AdminActivityLog } from "@/integrations/appwrite/sysadmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Loader2, ArrowLeft, Activity, Building2, User, Settings, Trash } from "lucide-react";
import { toast } from "sonner";

export default function ActivityLogs() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState<AdminActivityLog[]>([]);

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        try {
            const allLogs = await getActivityLogs({ limit: 100 });
            setLogs(allLogs);
        } catch (error) {
            toast.error("Failed to load activity logs");
        } finally {
            setLoading(false);
        }
    };

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'create_tenant':
                return <Building2 className="h-4 w-4 text-green-500" />;
            case 'assign_user':
                return <User className="h-4 w-4 text-blue-500" />;
            case 'update_permissions':
            case 'update_plan':
                return <Settings className="h-4 w-4 text-yellow-500" />;
            case 'suspend_tenant':
                return <Activity className="h-4 w-4 text-orange-500" />;
            case 'delete_tenant':
                return <Trash className="h-4 w-4 text-red-500" />;
            default:
                return <Activity className="h-4 w-4" />;
        }
    };

    const getActionBadge = (action: string) => {
        const labels: Record<string, { label: string; variant: "default" | "destructive" | "outline" | "secondary" }> = {
            create_tenant: { label: "Tenant Created", variant: "default" },
            assign_user: { label: "User Assigned", variant: "secondary" },
            update_permissions: { label: "Permissions Updated", variant: "outline" },
            update_plan: { label: "Plan Updated", variant: "outline" },
            suspend_tenant: { label: "Tenant Suspended", variant: "destructive" },
            delete_tenant: { label: "Tenant Deleted", variant: "destructive" },
        };

        const config = labels[action] || { label: action, variant: "outline" as const };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

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
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                            Activity Logs
                        </h1>
                        <p className="text-muted-foreground">Track all administrative actions</p>
                    </div>
                </div>

                {/* Logs Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>All actions performed by system administrators</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {logs.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Activity className="mx-auto h-12 w-12 mb-4 opacity-50" />
                                <p>No activity yet</p>
                                <p className="text-sm">Actions will appear here as you manage the platform</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Action</TableHead>
                                        <TableHead>Details</TableHead>
                                        <TableHead>Target Tenant</TableHead>
                                        <TableHead>Target User</TableHead>
                                        <TableHead>Timestamp</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.map((log) => (
                                        <TableRow key={log.$id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {getActionIcon(log.actionType)}
                                                    {getActionBadge(log.actionType)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-xs truncate">
                                                {log.description || '-'}
                                            </TableCell>
                                            <TableCell>
                                                {log.targetTenantId ? (
                                                    <code className="text-xs bg-muted px-2 py-1 rounded">
                                                        {log.targetTenantId.slice(0, 8)}...
                                                    </code>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell>
                                                {log.targetUserId ? (
                                                    <code className="text-xs bg-muted px-2 py-1 rounded">
                                                        {log.targetUserId.slice(0, 8)}...
                                                    </code>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell>
                                                {new Date(log.$createdAt).toLocaleString()}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
