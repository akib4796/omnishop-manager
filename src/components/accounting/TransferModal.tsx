import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowRight, Loader2, Wallet, Landmark, Smartphone, Vault } from "lucide-react";

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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/i18n-utils";
import { createPayment } from "@/integrations/appwrite/payments";

interface TransferModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    walletBalances: {
        cash: number;
        bank: number;
        mobile: number;
        safe: number;
    };
}

const WALLETS = [
    { id: 'Cash', label: 'Cash Drawer', icon: Wallet },
    { id: 'Bank Transfer', label: 'Bank Account', icon: Landmark },
    { id: 'Mobile Money', label: 'Mobile Money', icon: Smartphone },
    { id: 'Safe', label: 'Office Safe', icon: Vault },
];

export function TransferModal({ open, onOpenChange, walletBalances }: TransferModalProps) {
    const { t, i18n } = useTranslation();
    const { profile } = useAuth();
    const queryClient = useQueryClient();
    const tenantId = profile?.tenantId;

    const [fromWallet, setFromWallet] = useState("Cash");
    const [toWallet, setToWallet] = useState("Bank Transfer");
    const [amount, setAmount] = useState("");
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const getBalance = (walletId: string) => {
        switch (walletId) {
            case 'Cash': return walletBalances.cash;
            case 'Bank Transfer': return walletBalances.bank;
            case 'Mobile Money': return walletBalances.mobile;
            case 'Safe': return walletBalances.safe;
            default: return 0;
        }
    };

    const handleSubmit = async () => {
        if (!tenantId) return;

        const transferAmount = parseFloat(amount);
        if (isNaN(transferAmount) || transferAmount <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        if (fromWallet === toWallet) {
            toast.error("Source and destination must be different");
            return;
        }

        const sourceBalance = getBalance(fromWallet);
        if (transferAmount > sourceBalance) {
            toast.error(`Insufficient balance in ${fromWallet}. Available: ${formatCurrency(sourceBalance, i18n.language)}`);
            return;
        }

        setIsSubmitting(true);
        try {
            // Record as two transactions: OUT from source, IN to destination
            // OUT from source wallet
            await createPayment({
                tenantId,
                type: 'OUT',
                category: 'TRANSFER',
                amount: transferAmount,
                method: fromWallet,
                referenceId: `XFER-${Date.now()}`,
            });

            // IN to destination wallet
            await createPayment({
                tenantId,
                type: 'IN',
                category: 'TRANSFER',
                amount: transferAmount,
                method: toWallet,
                referenceId: `XFER-${Date.now()}`,
            });

            toast.success(`Transferred ${formatCurrency(transferAmount, i18n.language)} from ${fromWallet} to ${toWallet}`);

            queryClient.invalidateQueries({ queryKey: ["payments"] });

            // Reset and close
            setAmount("");
            setNotes("");
            onOpenChange(false);
        } catch (error: any) {
            console.error("Error recording transfer:", error);
            toast.error("Failed to record transfer");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Transfer Funds</DialogTitle>
                    <DialogDescription>
                        Move money between your wallets
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* From Wallet */}
                    <div className="space-y-2">
                        <Label>From</Label>
                        <Select value={fromWallet} onValueChange={setFromWallet}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {WALLETS.map(w => (
                                    <SelectItem key={w.id} value={w.id}>
                                        <div className="flex items-center gap-2">
                                            <w.icon className="h-4 w-4" />
                                            <span>{w.label}</span>
                                            <span className="text-muted-foreground ml-2">
                                                ({formatCurrency(getBalance(w.id), i18n.language)})
                                            </span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Arrow Indicator */}
                    <div className="flex justify-center">
                        <ArrowRight className="h-6 w-6 text-muted-foreground" />
                    </div>

                    {/* To Wallet */}
                    <div className="space-y-2">
                        <Label>To</Label>
                        <Select value={toWallet} onValueChange={setToWallet}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {WALLETS.filter(w => w.id !== fromWallet).map(w => (
                                    <SelectItem key={w.id} value={w.id}>
                                        <div className="flex items-center gap-2">
                                            <w.icon className="h-4 w-4" />
                                            <span>{w.label}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Amount Input */}
                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount</Label>
                        <Input
                            id="amount"
                            type="number"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            min="0"
                            step="0.01"
                        />
                        <p className="text-xs text-muted-foreground">
                            Available: {formatCurrency(getBalance(fromWallet), i18n.language)}
                        </p>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <Textarea
                            id="notes"
                            placeholder="Reason for transfer, reference, etc."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting || !amount}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Transfer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
