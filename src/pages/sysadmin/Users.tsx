import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { account, databases } from "@/integrations/appwrite";
import { getAllTenants, assignUserToTenant, getSysAdminUser } from "@/integrations/appwrite/sysadmin";
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
import { Loader2, Plus, Users, ArrowLeft, Search, UserPlus, Shield, User, Settings } from "lucide-react";
import { toast } from "sonner";
import { Query } from "appwrite";

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'omnishop_db';
const COLLECTIONS = {
    PROFILES: 'profiles',
    USER_ROLES: 'user_roles',
};

interface UserWithRole {
    $id: string;
    userId: string;
    fullName: string;
    email: string;
    tenantId: string;
    tenantName: string;
    role: string;
    $createdAt: string;
}

export default function UsersManagement() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<UserWithRole[]>([]);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [showAssignDialog, setShowAssignDialog] = useState(false);
    const [assigning, setAssigning] = useState(false);

    // New user form
    const [newUser, setNewUser] = useState({
        email: "",
        fullName: "",
        password: "",
        tenantId: "",
        role: "staff" as "admin" | "manager" | "staff",
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // Load all tenants
            const allTenants = await getAllTenants();
            setTenants(allTenants);

            // Load all profiles with their roles
            const profilesRes = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.PROFILES,
                [Query.limit(100)]
            );

            const rolesRes = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.USER_ROLES,
                [Query.limit(100)]
            );

            // Combine profiles with roles and tenant names
            // Note: Using camelCase attribute names to match Appwrite collection schema
            const usersWithRoles: UserWithRole[] = profilesRes.documents.map((profile: any) => {
                const role = rolesRes.documents.find((r: any) =>
                    r.userId === profile.userId && r.tenantId === profile.tenantId
                );
                const tenant = allTenants.find(t => t.$id === profile.tenantId);

                return {
                    $id: profile.$id,
                    userId: profile.userId,
                    fullName: profile.fullName || 'Unknown',
                    email: profile.email || 'N/A',
                    tenantId: profile.tenantId,
                    tenantName: tenant?.businessName || 'Unknown Tenant',
                    role: role?.role || 'staff',
                    $createdAt: profile.$createdAt,
                };
            });

            setUsers(usersWithRoles);
        } catch (error) {
            console.error('Error loading users:', error);
            toast.error("Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    const handleAssignUser = async () => {
        if (!newUser.email.trim() || !newUser.fullName.trim() || !newUser.tenantId || !newUser.password) {
            toast.error("Please fill in all required fields");
            return;
        }

        if (newUser.password.length < 8) {
            toast.error("Password must be at least 8 characters");
            return;
        }

        setAssigning(true);
        try {
            const sysadmin = await account.get();

            // Create Appwrite user account using account.create
            // Note: This creates the user but doesn't sign them in
            const { Account, Client, ID } = await import('appwrite');
            const tempClient = new Client()
                .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1')
                .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID || '6933e27f002c5273ae54');

            const tempAccount = new Account(tempClient);

            // Create the new user account
            const newUserAccount = await tempAccount.create(
                ID.unique(),
                newUser.email,
                newUser.password,
                newUser.fullName
            );

            // Now assign the user to the tenant with their role
            const { success, error } = await assignUserToTenant(
                newUserAccount.$id,
                newUser.tenantId,
                newUser.role,
                {
                    full_name: newUser.fullName,
                    email: newUser.email,
                },
                sysadmin.$id
            );

            if (error) throw new Error(error);

            const selectedTenant = tenants.find(t => t.$id === newUser.tenantId);
            toast.success(
                <div>
                    <p className="font-bold">User created successfully!</p>
                    <p className="text-sm">Email: {newUser.email}</p>
                    <p className="text-sm">Tenant: {selectedTenant?.businessName}</p>
                    <p className="text-sm">Role: {newUser.role}</p>
                    <p className="text-sm text-muted-foreground mt-2">Share the password with the user securely</p>
                </div>
            );
            setShowAssignDialog(false);
            setNewUser({
                email: "",
                fullName: "",
                password: "",
                tenantId: "",
                role: "staff",
            });
            loadData();
        } catch (error: any) {
            console.error('Error creating user:', error);
            if (error.message?.includes('already exists')) {
                toast.error("A user with this email already exists");
            } else {
                toast.error(error.message || "Failed to create user");
            }
        } finally {
            setAssigning(false);
        }
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'admin':
                return <Badge className="bg-purple-500"><Shield className="w-3 h-3 mr-1" />Admin</Badge>;
            case 'manager':
                return <Badge className="bg-blue-500"><Settings className="w-3 h-3 mr-1" />Manager</Badge>;
            default:
                return <Badge variant="outline"><User className="w-3 h-3 mr-1" />Staff</Badge>;
        }
    };

    const filteredUsers = users.filter(user =>
        user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.tenantName.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                            <h1 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                                User Management
                            </h1>
                            <p className="text-muted-foreground">Manage users and their tenant assignments</p>
                        </div>
                    </div>

                    <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
                        <DialogTrigger asChild>
                            <Button className="bg-gradient-to-r from-purple-600 to-blue-600">
                                <UserPlus className="mr-2 h-4 w-4" />
                                Create User
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New User</DialogTitle>
                                <DialogDescription>Create a new user account and assign to a tenant/shop</DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="fullName">Full Name *</Label>
                                    <Input
                                        id="fullName"
                                        placeholder="John Doe"
                                        value={newUser.fullName}
                                        onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">Email *</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="john@example.com"
                                        value={newUser.email}
                                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password">Password *</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="Minimum 8 characters"
                                        value={newUser.password}
                                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        This password will be used by the user to login. Share it securely.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="tenant">Tenant *</Label>
                                    <Select
                                        value={newUser.tenantId}
                                        onValueChange={(value) => setNewUser({ ...newUser, tenantId: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a tenant" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {tenants.map((tenant) => (
                                                <SelectItem key={tenant.$id} value={tenant.$id}>
                                                    {tenant.businessName}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="role">Role *</Label>
                                    <Select
                                        value={newUser.role}
                                        onValueChange={(value: "admin" | "manager" | "staff") => setNewUser({ ...newUser, role: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="admin">Admin</SelectItem>
                                            <SelectItem value="manager">Manager</SelectItem>
                                            <SelectItem value="staff">Staff</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Cancel</Button>
                                <Button onClick={handleAssignUser} disabled={assigning}>
                                    {assigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create User
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Stats */}
                <div className="grid gap-4 md:grid-cols-4 mb-8">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{users.length}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Admins</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-purple-600">
                                {users.filter(u => u.role === 'admin').length}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Managers</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">
                                {users.filter(u => u.role === 'manager').length}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Staff</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-gray-600">
                                {users.filter(u => u.role === 'staff').length}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search */}
                <div className="mb-6">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search users by name, email, or tenant..."
                            className="pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Users Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>All Users</CardTitle>
                        <CardDescription>Users assigned to tenants across the platform</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {filteredUsers.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                                <p>No users found</p>
                                <p className="text-sm">Assign users to tenants to get started</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Tenant</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Joined</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredUsers.map((user) => (
                                        <TableRow key={user.$id}>
                                            <TableCell className="font-medium">{user.fullName}</TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{user.tenantName}</Badge>
                                            </TableCell>
                                            <TableCell>{getRoleBadge(user.role)}</TableCell>
                                            <TableCell>{new Date(user.$createdAt).toLocaleDateString()}</TableCell>
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
