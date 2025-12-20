import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { signIn, account } from "@/integrations/appwrite";
import { isSysAdmin, getSysAdminUser, updateSysAdminLastLogin } from "@/integrations/appwrite/sysadmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Shield } from "lucide-react";

export default function SysAdminLogin() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(true);
    const [checkingAuth, setCheckingAuth] = useState(true);

    // Check if already logged in and is SysAdmin
    useEffect(() => {
        const checkExistingSession = async () => {
            try {
                const user = await account.get();
                const adminStatus = await isSysAdmin();

                if (adminStatus) {
                    // Already logged in as SysAdmin, redirect to dashboard
                    toast.success("Already logged in as SysAdmin");
                    navigate("/sysadmin/dashboard");
                } else {
                    setCheckingAuth(false);
                    setLoading(false);
                }
            } catch {
                // Not logged in, show login form
                setCheckingAuth(false);
                setLoading(false);
            }
        };

        checkExistingSession();
    }, [navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Step 1: Try to sign in
            const { session, error } = await signIn(email, password);

            if (error) throw new Error(error);

            if (session) {
                // Step 2: Get current user
                const user = await account.get();
                console.log("=== DEBUG SysAdmin Login ===");
                console.log("User ID:", user.$id);
                console.log("User Email:", user.email);

                // Step 3: Check if user is SysAdmin
                const adminStatus = await isSysAdmin();
                console.log("Is SysAdmin:", adminStatus);

                if (!adminStatus) {
                    // Show the user ID so they can verify it matches
                    toast.error(`Unauthorized: User ID ${user.$id} is not in sysadmin_users`);
                    console.log("Copy this ID and paste in sysadmin_users collection:", user.$id);
                    setLoading(false);
                    return;
                }

                // Step 4: Get SysAdmin details and update last login
                const sysAdminUser = await getSysAdminUser(user.$id);
                if (sysAdminUser) {
                    await updateSysAdminLastLogin(sysAdminUser.$id);
                }

                toast.success("SysAdmin login successful!");
                navigate("/sysadmin/dashboard");
            }
        } catch (error: any) {
            toast.error(error.message || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    // Show loading while checking existing session
    if (checkingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-background to-blue-900">
                <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-background to-blue-900 p-4">
            <Card className="w-full max-w-md border-2 border-purple-500/20">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-4">
                        <Shield className="h-12 w-12 text-purple-500" />
                    </div>
                    <CardTitle className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                        SysAdmin Portal
                    </CardTitle>
                    <CardDescription>Platform Administrator Access</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="admin@omnishop.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Access SysAdmin
                        </Button>

                        <p className="text-center text-sm text-muted-foreground">
                            For authorized personnel only
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
