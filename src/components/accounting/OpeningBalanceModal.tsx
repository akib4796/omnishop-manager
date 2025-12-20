import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Loader2, Wallet, Landmark, Smartphone, Vault, CheckCircle2 } from "lucide-react";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/i18n-utils";
import { createPayment } from "@/integrations/appwrite/payments";

interface OpeningBalanceModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const WALLETS = [
    { id: 'Cash', label: 'Cash Drawer', icon: Wallet, color: 'text-green-500' },
    { id: 'Bank Transfer', label: 'Bank Account', icon: Landmark, color: 'text-blue-500' },
    { id: 'Mobile Money', label: 'Mobile Money', icon: Smartphone, color: 'text-purple-500' },
    { id: 'Safe', label: 'Office Safe', icon: Vault, color: 'text-amber-500' },
];

export function OpeningBalanceModal({ open, onOpenChange }: OpeningBalanceModalProps) {
    const { t, i18n } = useTranslation();
    const { profile } = useAuth();
    const queryClient = useQueryClient();
    const tenantId = profile?.tenantId;

    const [balances, setBalances] = useState<Record<string, string>>({
        'Cash': '',
        'Bank Transfer': '',
        'Mobile Money': '',
        'Safe': '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleBalanceChange = (walletId: string, value: string) => {
        setBalances(prev => ({ ...prev, [walletId]: value }));
    };

    const handleSubmit = async () => {
        if (!tenantId) return;

        // Validate at least one balance is set
        const hasAnyBalance = Object.values(balances).some(b => parseFloat(b) > 0);
        if (!hasAnyBalance) {
            toast.error("Please enter at least one opening balance");
            return;
        }

        setIsSubmitting(true);
        try {
            // Create opening balance entries for each wallet with a positive value
            const promises = [];

            for (const [walletId, balanceStr] of Object.entries(balances)) {
                const amount = parseFloat(balanceStr);
                if (!isNaN(amount) && amount > 0) {
                    promises.push(
                        createPayment({
                            tenantId,
                            type: 'IN',
                            category: 'ADJUSTMENT', // Opening balance is an adjustment
                            amount,
                            method: walletId,
                            referenceId: `OPENING-${Date.now()}`,
                        })
                    );
                }
            }

            await Promise.all(promises);

            toast.success("Opening balances recorded successfully!");
            queryClient.invalidateQueries({ queryKey: ["payments"] });

            // Reset and close
            setBalances({
                'Cash': '',
                'Bank Transfer': '',
                'Mobile Money': '',
                'Safe': '',
            });
            onOpenChange(false);
        } catch (error: any) {
            console.error("Error recording opening balances:", error);
            toast.error("Failed to record opening balances");
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalBalance = Object.values(balances).reduce((sum, val) => {
        const num = parseFloat(val);
        return sum + (isNaN(num) ? 0 : num);
    }, 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Set Opening Balances</DialogTitle>
                    <DialogDescription>
                        Enter your current cash/bank balances to start tracking
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {WALLETS.map(wallet => (
                        <div key={wallet.id} className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg bg-muted ${wallet.color}`}>
                                <wallet.icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                                <Label htmlFor={wallet.id} className="text-sm font-medium">
                                    {wallet.label}
                                </Label>
                                <Input
                                    id={wallet.id}
                                    type="number"
                                    placeholder="0.00"
                                    value={balances[wallet.id]}
                                    onChange={(e) => handleBalanceChange(wallet.id, e.target.value)}
                                    min="0"
                                    step="0.01"
                                    className="mt-1"
                                />
                            </div>
                        </div>
                    ))}

                    {/* Total Preview */}
                    <Card className="bg-muted/50">
                        <CardContent className="py-4">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Total Opening Capital</span>
                                <span className="text-xl font-bold">
                                    {formatCurrency(totalBalance, i18n.language)}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    <p className="text-xs text-muted-foreground text-center">
                        ⚠️ This action should only be done once when first setting up the system.
                    </p>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                        )}
                        Confirm Balances
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
