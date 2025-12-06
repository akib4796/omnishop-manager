import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { account } from "@/integrations/appwrite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle, Lock } from "lucide-react";

export default function ResetPassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [passwords, setPasswords] = useState({
        password: "",
        confirmPassword: "",
    });

    // Get userId and secret from URL params
    const userId = searchParams.get("userId");
    const secret = searchParams.get("secret");

    useEffect(() => {
        if (!userId || !secret) {
            toast.error("Invalid password reset link");
            navigate("/login");
        }
    }, [userId, secret, navigate]);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!passwords.password || !passwords.confirmPassword) {
            toast.error("Please fill in all fields");
            return;
        }

        if (passwords.password.length < 8) {
            toast.error("Password must be at least 8 characters");
            return;
        }

        if (passwords.password !== passwords.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        if (!userId || !secret) {
            toast.error("Invalid reset link");
            return;
        }

        setLoading(true);
        try {
            // Complete password recovery using Appwrite
            await account.updateRecovery(userId, secret, passwords.password);

            setSuccess(true);
            toast.success("Password reset successfully!");

            // Redirect to login after 2 seconds
            setTimeout(() => {
                navigate("/login");
            }, 2000);
        } catch (error: any) {
            console.error("Error resetting password:", error);
            if (error.message?.includes("expired") || error.message?.includes("invalid")) {
                toast.error("This reset link has expired or is invalid. Please request a new one.");
            } else {
                toast.error(error.message || "Failed to reset password");
            }
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <CardTitle className="text-2xl font-bold">Password Reset Complete!</CardTitle>
                        <CardDescription>
                            Your password has been updated successfully. Redirecting to login...
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold">Reset Your Password</CardTitle>
                    <CardDescription>
                        Enter your new password below
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">New Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Minimum 8 characters"
                                value={passwords.password}
                                onChange={(e) => setPasswords({ ...passwords, password: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="Re-enter your password"
                                value={passwords.confirmPassword}
                                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {!loading && <Lock className="mr-2 h-4 w-4" />}
                            Reset Password
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
