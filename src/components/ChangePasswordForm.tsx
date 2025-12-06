import { useState } from "react";
import { account } from "@/integrations/appwrite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";

export function ChangePasswordForm() {
    const [loading, setLoading] = useState(false);
    const [passwords, setPasswords] = useState({
        current: "",
        new: "",
        confirm: "",
    });

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!passwords.current || !passwords.new || !passwords.confirm) {
            toast.error("Please fill in all fields");
            return;
        }

        if (passwords.new.length < 8) {
            toast.error("New password must be at least 8 characters");
            return;
        }

        if (passwords.new !== passwords.confirm) {
            toast.error("New passwords do not match");
            return;
        }

        if (passwords.current === passwords.new) {
            toast.error("New password must be different from current password");
            return;
        }

        setLoading(true);
        try {
            // Update password using Appwrite
            await account.updatePassword(passwords.new, passwords.current);

            toast.success("Password changed successfully!");

            // Reset form
            setPasswords({
                current: "",
                new: "",
                confirm: "",
            });
        } catch (error: any) {
            console.error("Error changing password:", error);
            if (error.message?.includes("Invalid credentials")) {
                toast.error("Current password is incorrect");
            } else {
                toast.error(error.message || "Failed to change password");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                    id="current-password"
                    type="password"
                    value={passwords.current}
                    onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                    placeholder="Enter your current password"
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                    id="new-password"
                    type="password"
                    value={passwords.new}
                    onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                    placeholder="Minimum 8 characters"
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                    id="confirm-password"
                    type="password"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                    placeholder="Re-enter new password"
                    required
                />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Lock className="mr-2 h-4 w-4" />
                Change Password
            </Button>

            <p className="text-sm text-muted-foreground">
                Make sure your new password is strong and unique. You'll be able to use it immediately after changing.
            </p>
        </form>
    );
}
