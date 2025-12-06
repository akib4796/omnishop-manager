import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { account } from "@/integrations/appwrite";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeft, Settings, Globe, Shield, Bell, Database, Save } from "lucide-react";
import { toast } from "sonner";
import { Query, ID } from "appwrite";

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'omnishop_db';

interface SystemConfig {
    defaultCurrency: string;
    defaultLanguage: string;
    maintenanceMode: boolean;
    allowSignups: boolean;
    maxUsersPerTenant: number;
    maxProductsPerTenant: number;
    defaultTrialDays: number;
    sessionTimeout: number;
    require2FA: boolean;
    emailNotifications: boolean;
    supportEmail: string;
}

const DEFAULT_CONFIG: SystemConfig = {
    defaultCurrency: "BDT",
    defaultLanguage: "en",
    maintenanceMode: false,
    allowSignups: true,
    maxUsersPerTenant: 10,
    maxProductsPerTenant: 1000,
    defaultTrialDays: 14,
    sessionTimeout: 60,
    require2FA: false,
    emailNotifications: true,
    supportEmail: "support@omnishop.com",
};

export default function SysAdminSettings() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState<SystemConfig>(DEFAULT_CONFIG);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            // Try loading from localStorage for now (can be moved to database later)
            const savedConfig = localStorage.getItem('sysadmin_config');
            if (savedConfig) {
                setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(savedConfig) });
            }
        } catch (error) {
            console.error('Error loading config:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Save to localStorage (can be moved to database)
            localStorage.setItem('sysadmin_config', JSON.stringify(config));

            toast.success("Settings saved successfully!");
        } catch (error: any) {
            toast.error(error.message || "Failed to save settings");
        } finally {
            setSaving(false);
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
                                System Settings
                            </h1>
                            <p className="text-muted-foreground">Configure global platform settings</p>
                        </div>
                    </div>

                    <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-purple-600 to-blue-600">
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                    </Button>
                </div>

                <Tabs defaultValue="general" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 mb-6">
                        <TabsTrigger value="general">
                            <Settings className="mr-2 h-4 w-4" />
                            General
                        </TabsTrigger>
                        <TabsTrigger value="security">
                            <Shield className="mr-2 h-4 w-4" />
                            Security
                        </TabsTrigger>
                        <TabsTrigger value="limits">
                            <Database className="mr-2 h-4 w-4" />
                            Limits
                        </TabsTrigger>
                        <TabsTrigger value="notifications">
                            <Bell className="mr-2 h-4 w-4" />
                            Notifications
                        </TabsTrigger>
                    </TabsList>

                    {/* General Settings */}
                    <TabsContent value="general">
                        <Card>
                            <CardHeader>
                                <CardTitle>General Settings</CardTitle>
                                <CardDescription>Configure basic platform settings</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label>Default Currency</Label>
                                        <Select
                                            value={config.defaultCurrency}
                                            onValueChange={(value) => setConfig({ ...config, defaultCurrency: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="BDT">৳ BDT (Bangladeshi Taka)</SelectItem>
                                                <SelectItem value="USD">$ USD (US Dollar)</SelectItem>
                                                <SelectItem value="EUR">€ EUR (Euro)</SelectItem>
                                                <SelectItem value="GBP">£ GBP (British Pound)</SelectItem>
                                                <SelectItem value="INR">₹ INR (Indian Rupee)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Default Language</Label>
                                        <Select
                                            value={config.defaultLanguage}
                                            onValueChange={(value) => setConfig({ ...config, defaultLanguage: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="en">English</SelectItem>
                                                <SelectItem value="bn">বাংলা (Bengali)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="border-t pt-6">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label>Maintenance Mode</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Disable access for all non-admin users
                                            </p>
                                        </div>
                                        <Switch
                                            checked={config.maintenanceMode}
                                            onCheckedChange={(checked) => setConfig({ ...config, maintenanceMode: checked })}
                                        />
                                    </div>
                                </div>

                                <div className="border-t pt-6">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label>Allow New Signups</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Allow new users to register on the platform
                                            </p>
                                        </div>
                                        <Switch
                                            checked={config.allowSignups}
                                            onCheckedChange={(checked) => setConfig({ ...config, allowSignups: checked })}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Security Settings */}
                    <TabsContent value="security">
                        <Card>
                            <CardHeader>
                                <CardTitle>Security Settings</CardTitle>
                                <CardDescription>Configure authentication and security options</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label>Session Timeout (minutes)</Label>
                                    <Input
                                        type="number"
                                        value={config.sessionTimeout}
                                        onChange={(e) => setConfig({ ...config, sessionTimeout: parseInt(e.target.value) || 60 })}
                                        min={5}
                                        max={1440}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Auto-logout users after inactivity (5-1440 minutes)
                                    </p>
                                </div>

                                <div className="border-t pt-6">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label>Require 2FA for Admins</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Force two-factor authentication for admin users
                                            </p>
                                        </div>
                                        <Switch
                                            checked={config.require2FA}
                                            onCheckedChange={(checked) => setConfig({ ...config, require2FA: checked })}
                                        />
                                    </div>
                                </div>

                                <div className="border-t pt-6 space-y-2">
                                    <Label>Default Trial Period (days)</Label>
                                    <Input
                                        type="number"
                                        value={config.defaultTrialDays}
                                        onChange={(e) => setConfig({ ...config, defaultTrialDays: parseInt(e.target.value) || 14 })}
                                        min={0}
                                        max={90}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Number of trial days for new tenants (0-90 days)
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Limits Settings */}
                    <TabsContent value="limits">
                        <Card>
                            <CardHeader>
                                <CardTitle>Resource Limits</CardTitle>
                                <CardDescription>Set default limits for tenants</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label>Max Users per Tenant</Label>
                                    <Input
                                        type="number"
                                        value={config.maxUsersPerTenant}
                                        onChange={(e) => setConfig({ ...config, maxUsersPerTenant: parseInt(e.target.value) || 10 })}
                                        min={1}
                                        max={1000}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Default maximum users allowed per tenant
                                    </p>
                                </div>

                                <div className="border-t pt-6 space-y-2">
                                    <Label>Max Products per Tenant</Label>
                                    <Input
                                        type="number"
                                        value={config.maxProductsPerTenant}
                                        onChange={(e) => setConfig({ ...config, maxProductsPerTenant: parseInt(e.target.value) || 1000 })}
                                        min={10}
                                        max={100000}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Default maximum products allowed per tenant
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Notification Settings */}
                    <TabsContent value="notifications">
                        <Card>
                            <CardHeader>
                                <CardTitle>Notification Settings</CardTitle>
                                <CardDescription>Configure email and notification preferences</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label>Email Notifications</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Send system notifications via email
                                        </p>
                                    </div>
                                    <Switch
                                        checked={config.emailNotifications}
                                        onCheckedChange={(checked) => setConfig({ ...config, emailNotifications: checked })}
                                    />
                                </div>

                                <div className="border-t pt-6 space-y-2">
                                    <Label>Support Email</Label>
                                    <Input
                                        type="email"
                                        value={config.supportEmail}
                                        onChange={(e) => setConfig({ ...config, supportEmail: e.target.value })}
                                        placeholder="support@example.com"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Email address for support inquiries
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
