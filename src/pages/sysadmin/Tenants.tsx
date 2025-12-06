import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { account } from "@/integrations/appwrite";
import {
    getAllTenants,
    createTenantAsSysAdmin,
    updateTenantStatus,
    updateTenantPlan,
    updateTenant,
    deleteTenant,
    getSysAdminUser
} from "@/integrations/appwrite/sysadmin";
import type { Tenant } from "@/integrations/appwrite/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Loader2,
    Plus,
    Building2,
    MoreHorizontal,
    Edit,
    Trash,
    Ban,
    CheckCircle,
    ArrowLeft
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export default function TenantsManagement() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [sysAdminId, setSysAdminId] = useState<string>("");
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

    // New tenant form
    const [newTenant, setNewTenant] = useState({
        business_name: "",
        business_type: "retail",
        currency: "BDT",
        subscription_plan: "free" as "free" | "basic" | "premium",
        max_users: 5,
    });

    // Edit tenant form
    const [editForm, setEditForm] = useState({
        businessName: "",
        businessType: "retail",
        currency: "BDT",
        status: "active" as "active" | "suspended" | "inactive",
        subscriptionPlan: "free" as "free" | "basic" | "premium",
        maxUsers: 5,
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const user = await account.get();
            const sysAdmin = await getSysAdminUser(user.$id);
            if (sysAdmin) {
                setSysAdminId(sysAdmin.$id);
            }

            const allTenants = await getAllTenants();
            setTenants(allTenants);
        } catch (error) {
            toast.error("Failed to load tenants");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTenant = async () => {
        if (!newTenant.business_name.trim()) {
            toast.error("Business name is required");
            return;
        }

        setCreating(true);
        try {
            const user = await account.get();
            const { tenant, error } = await createTenantAsSysAdmin(newTenant, user.$id);

            if (error) throw new Error(error);

            toast.success("Tenant created successfully!");
            setShowCreateDialog(false);
            setNewTenant({
                business_name: "",
                business_type: "retail",
                currency: "BDT",
                subscription_plan: "free",
                max_users: 5,
            });
            loadData();
        } catch (error: any) {
            toast.error(error.message || "Failed to create tenant");
        } finally {
            setCreating(false);
        }
    };

    const handleStatusChange = async (tenantId: string, status: 'active' | 'suspended' | 'inactive') => {
        try {
            const user = await account.get();
            const { success, error } = await updateTenantStatus(tenantId, status, user.$id);

            if (error) throw new Error(error);

            toast.success(`Tenant ${status === 'active' ? 'activated' : status === 'suspended' ? 'suspended' : 'deactivated'}`);
            loadData();
        } catch (error: any) {
            toast.error(error.message || "Failed to update status");
        }
    };

    const handleDelete = async (tenantId: string) => {
        if (!confirm("Are you sure you want to delete this tenant?")) return;

        try {
            const user = await account.get();
            const { success, error } = await deleteTenant(tenantId, user.$id);

            if (error) throw new Error(error);

            toast.success("Tenant deleted");
            loadData();
        } catch (error: any) {
            toast.error(error.message || "Failed to delete tenant");
        }
    };

    const handleEdit = (tenant: Tenant) => {
        setEditingTenant(tenant);
        setEditForm({
            businessName: tenant.businessName || "",
            businessType: tenant.businessType || "retail",
            currency: tenant.currency || "BDT",
            status: tenant.status || "active",
            subscriptionPlan: tenant.subscriptionPlan || "free",
            maxUsers: tenant.maxUsers || 5,
        });
        setShowEditDialog(true);
    };

    const handleSaveEdit = async () => {
        if (!editingTenant) return;

        setEditing(true);
        try {
            const user = await account.get();

            // Update all tenant fields at once
            const { success, error } = await updateTenant(
                editingTenant.$id,
                {
                    status: editForm.status,
                    subscriptionPlan: editForm.subscriptionPlan,
                    maxUsers: editForm.maxUsers,
                    businessType: editForm.businessType,
                    currency: editForm.currency,
                },
                user.$id
            );

            if (error) throw new Error(error);

            toast.success("Tenant updated successfully!");
            setShowEditDialog(false);
            setEditingTenant(null);
            loadData();
        } catch (error: any) {
            toast.error(error.message || "Failed to update tenant");
        } finally {
            setEditing(false);
        }
    };

    const getStatusBadge = (status?: string) => {
        switch (status) {
            case 'active':
                return <Badge className="bg-green-500">Active</Badge>;
            case 'suspended':
                return <Badge className="bg-yellow-500">Suspended</Badge>;
            case 'inactive':
                return <Badge className="bg-red-500">Inactive</Badge>;
            default:
                return <Badge className="bg-green-500">Active</Badge>;
        }
    };

    const getPlanBadge = (plan?: string) => {
        switch (plan) {
            case 'premium':
                return <Badge className="bg-purple-500">Premium</Badge>;
            case 'basic':
                return <Badge className="bg-blue-500">Basic</Badge>;
            default:
                return <Badge variant="outline">Free</Badge>;
        }
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
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate("/sysadmin/dashboard")}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                                Tenant Management
                            </h1>
                            <p className="text-muted-foreground">Manage all shops and businesses</p>
                        </div>
                    </div>

                    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                        <DialogTrigger asChild>
                            <Button className="bg-gradient-to-r from-purple-600 to-blue-600">
                                <Plus className="mr-2 h-4 w-4" />
                                Create Tenant
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Tenant</DialogTitle>
                                <DialogDescription>Add a new shop or business to the platform</DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="business_name">Business Name *</Label>
                                    <Input
                                        id="business_name"
                                        placeholder="ABC Retail Shop"
                                        value={newTenant.business_name}
                                        onChange={(e) => setNewTenant({ ...newTenant, business_name: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="business_type">Business Type</Label>
                                    <Select
                                        value={newTenant.business_type}
                                        onValueChange={(value) => setNewTenant({ ...newTenant, business_type: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="retail">Retail Store</SelectItem>
                                            <SelectItem value="restaurant">Restaurant</SelectItem>
                                            <SelectItem value="pharmacy">Pharmacy</SelectItem>
                                            <SelectItem value="grocery">Grocery</SelectItem>
                                            <SelectItem value="electronics">Electronics</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="subscription_plan">Plan</Label>
                                        <Select
                                            value={newTenant.subscription_plan}
                                            onValueChange={(value: "free" | "basic" | "premium") => setNewTenant({ ...newTenant, subscription_plan: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="free">Free</SelectItem>
                                                <SelectItem value="basic">Basic</SelectItem>
                                                <SelectItem value="premium">Premium</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="max_users">Max Users</Label>
                                        <Input
                                            id="max_users"
                                            type="number"
                                            value={newTenant.max_users}
                                            onChange={(e) => setNewTenant({ ...newTenant, max_users: parseInt(e.target.value) || 5 })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                                <Button onClick={handleCreateTenant} disabled={creating}>
                                    {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create Tenant
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Edit Tenant Dialog */}
                    <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Edit Tenant</DialogTitle>
                                <DialogDescription>Update tenant settings and status</DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Business Name</Label>
                                    <Input
                                        value={editForm.businessName}
                                        onChange={(e) => setEditForm({ ...editForm, businessName: e.target.value })}
                                        disabled
                                    />
                                    <p className="text-xs text-muted-foreground">Business name cannot be changed</p>
                                </div>

                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <Select
                                        value={editForm.status}
                                        onValueChange={(value: "active" | "suspended" | "inactive") => setEditForm({ ...editForm, status: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="suspended">Suspended</SelectItem>
                                            <SelectItem value="inactive">Inactive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Subscription Plan</Label>
                                        <Select
                                            value={editForm.subscriptionPlan}
                                            onValueChange={(value: "free" | "basic" | "premium") => setEditForm({ ...editForm, subscriptionPlan: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="free">Free</SelectItem>
                                                <SelectItem value="basic">Basic</SelectItem>
                                                <SelectItem value="premium">Premium</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Max Users</Label>
                                        <Input
                                            type="number"
                                            value={editForm.maxUsers}
                                            onChange={(e) => setEditForm({ ...editForm, maxUsers: parseInt(e.target.value) || 5 })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Business Type</Label>
                                    <Select
                                        value={editForm.businessType}
                                        onValueChange={(value) => setEditForm({ ...editForm, businessType: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="retail">Retail Store</SelectItem>
                                            <SelectItem value="restaurant">Restaurant</SelectItem>
                                            <SelectItem value="pharmacy">Pharmacy</SelectItem>
                                            <SelectItem value="grocery">Grocery</SelectItem>
                                            <SelectItem value="electronics">Electronics</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Currency</Label>
                                    <Select
                                        value={editForm.currency}
                                        onValueChange={(value) => setEditForm({ ...editForm, currency: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="BDT">BDT (Bangladeshi Taka)</SelectItem>
                                            <SelectItem value="USD">USD (US Dollar)</SelectItem>
                                            <SelectItem value="EUR">EUR (Euro)</SelectItem>
                                            <SelectItem value="GBP">GBP (British Pound)</SelectItem>
                                            <SelectItem value="INR">INR (Indian Rupee)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
                                <Button onClick={handleSaveEdit} disabled={editing}>
                                    {editing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save Changes
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Stats */}
                <div className="grid gap-4 md:grid-cols-4 mb-8">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{tenants.length}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Active</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                                {tenants.filter(t => t.status === 'active' || !t.status).length}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-yellow-600">
                                {tenants.filter(t => t.status === 'suspended').length}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Premium</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-purple-600">
                                {tenants.filter(t => t.subscriptionPlan === 'premium').length}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tenants Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>All Tenants</CardTitle>
                        <CardDescription>Manage shops and their subscriptions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {tenants.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Building2 className="mx-auto h-12 w-12 mb-4 opacity-50" />
                                <p>No tenants yet</p>
                                <p className="text-sm">Create your first tenant to get started</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Business Name</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Plan</TableHead>
                                        <TableHead>Max Users</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tenants.map((tenant) => (
                                        <TableRow key={tenant.$id}>
                                            <TableCell className="font-medium">{tenant.businessName}</TableCell>
                                            <TableCell>{tenant.businessType || 'N/A'}</TableCell>
                                            <TableCell>{getStatusBadge(tenant.status)}</TableCell>
                                            <TableCell>{getPlanBadge(tenant.subscriptionPlan)}</TableCell>
                                            <TableCell>{tenant.maxUsers || 5}</TableCell>
                                            <TableCell>{new Date(tenant.$createdAt).toLocaleDateString()}</TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleEdit(tenant)}>
                                                            <Edit className="mr-2 h-4 w-4 text-blue-500" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        {tenant.status === 'suspended' ? (
                                                            <DropdownMenuItem onClick={() => handleStatusChange(tenant.$id, 'active')}>
                                                                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                                                Activate
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem onClick={() => handleStatusChange(tenant.$id, 'suspended')}>
                                                                <Ban className="mr-2 h-4 w-4 text-yellow-500" />
                                                                Suspend
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem
                                                            className="text-red-600"
                                                            onClick={() => handleDelete(tenant.$id)}
                                                        >
                                                            <Trash className="mr-2 h-4 w-4" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
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
