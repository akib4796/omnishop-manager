import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Wallet, CreditCard, Smartphone, Banknote } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
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
import { toast } from "sonner";
import { createPayment } from "@/integrations/appwrite/payments";
import { updateWalletBalance } from "@/integrations/appwrite/wallets";
import { allocatePaymentToSales } from "@/integrations/appwrite/sales";
import { formatCurrency } from "@/lib/i18n-utils";

interface ReceivePaymentModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customer: {
        $id: string;
        name: string;
    } | null;
    tenantId: string;
    outstandingAmount?: number;
    onSuccess?: () => void;
}

export function ReceivePaymentModal({
    open,
    onOpenChange,
    customer,
    tenantId,
    outstandingAmount = 0,
    onSuccess,
}: ReceivePaymentModalProps) {
    const { t, i18n } = useTranslation();
    const queryClient = useQueryClient();

    const [amount, setAmount] = useState<string>("");
    const [paymentMethod, setPaymentMethod] = useState<string>("cash");

    // Auto-fill amount when modal opens with outstanding amount
    useEffect(() => {
        if (open && outstandingAmount > 0) {
            setAmount(outstandingAmount.toFixed(2));
            setPaymentMethod("cash");
        } else if (!open) {
            // Reset when closing
            setAmount("");
        }
    }, [open, outstandingAmount]);

    const paymentMutation = useMutation({
        mutationFn: async () => {
            if (!customer || !tenantId) throw new Error("Missing data");

            const paymentAmount = parseFloat(amount);
            if (isNaN(paymentAmount) || paymentAmount <= 0) {
                throw new Error("Invalid amount");
            }

            // Map payment method to wallet name
            const walletMethod = (() => {
                switch (paymentMethod) {
                    case 'cash': return 'Cash';
                    case 'card': return 'Bank Transfer';
                    case 'mobile': return 'Mobile Money';
                    default: return 'Cash';
                }
            })();

            // Create CUSTOMER_PAYMENT ledger entry
            await createPayment({
                tenantId,
                type: 'IN',
                category: 'CUSTOMER_PAYMENT',
                entityId: customer.$id,
                amount: paymentAmount,
                method: walletMethod,
            });

            // Update wallet balance
            await updateWalletBalance(tenantId, walletMethod, paymentAmount, 'IN');

            // FIFO: Allocate payment to oldest credit sales first
            const allocations = await allocatePaymentToSales(tenantId, customer.$id, paymentAmount);
            console.log('[Payment] FIFO allocations:', allocations);

            return paymentAmount;
        },
        onSuccess: (paymentAmount) => {
            toast.success(
                i18n.language === 'bn'
                    ? `৳${paymentAmount} পেমেন্ট সফলভাবে গৃহীত হয়েছে`
                    : `Payment of ৳${paymentAmount} received successfully`
            );

            // Refresh ledger and sales data
            queryClient.invalidateQueries({ queryKey: ["customerLedger", tenantId, customer?.$id] });
            queryClient.invalidateQueries({ queryKey: ["customerSales", tenantId, customer?.$id] });
            queryClient.invalidateQueries({ queryKey: ["payments", tenantId] });

            onOpenChange(false);
            onSuccess?.();
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to record payment");
        },
    });

    const handleSubmit = () => {
        const paymentAmount = parseFloat(amount);
        if (isNaN(paymentAmount) || paymentAmount <= 0) {
            toast.error(i18n.language === 'bn' ? 'সঠিক পরিমাণ দিন' : 'Please enter a valid amount');
            return;
        }
        // Prevent overpayment
        if (paymentAmount > outstandingAmount) {
            toast.error(i18n.language === 'bn'
                ? `সর্বোচ্চ ৳${outstandingAmount.toLocaleString()} গ্রহণ করা যাবে`
                : `Cannot accept more than ৳${outstandingAmount.toLocaleString()} (outstanding balance)`
            );
            return;
        }
        paymentMutation.mutate();
    };

    if (!customer) return null;

    const paymentAmount = parseFloat(amount) || 0;
    const remainingAfter = Math.max(0, outstandingAmount - paymentAmount);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-green-500" />
                        {i18n.language === 'bn' ? 'পেমেন্ট গ্রহণ' : 'Receive Payment'}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Customer Info */}
                    <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                            {i18n.language === 'bn' ? 'গ্রাহক' : 'Customer'}
                        </p>
                        <p className="font-semibold">{customer.name}</p>
                        {outstandingAmount > 0 && (
                            <p className="text-sm text-amber-600 mt-1">
                                {i18n.language === 'bn' ? 'বকেয়া' : 'Outstanding'}: {formatCurrency(outstandingAmount, i18n.language)}
                            </p>
                        )}
                    </div>

                    {/* Amount Input */}
                    <div className="space-y-2">
                        <Label>
                            {i18n.language === 'bn' ? 'পরিমাণ' : 'Amount'}
                        </Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">৳</span>
                            <Input
                                type="number"
                                inputMode="decimal"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="pl-8 text-lg font-semibold"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-2">
                        <Label>
                            {i18n.language === 'bn' ? 'পদ্ধতি' : 'Payment Method'}
                        </Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="cash">
                                    <span className="flex items-center gap-2">
                                        <Banknote className="h-4 w-4" />
                                        {i18n.language === 'bn' ? 'ক্যাশ' : 'Cash'}
                                    </span>
                                </SelectItem>
                                <SelectItem value="card">
                                    <span className="flex items-center gap-2">
                                        <CreditCard className="h-4 w-4" />
                                        {i18n.language === 'bn' ? 'কার্ড' : 'Card'}
                                    </span>
                                </SelectItem>
                                <SelectItem value="mobile">
                                    <span className="flex items-center gap-2">
                                        <Smartphone className="h-4 w-4" />
                                        bKash/Nagad
                                    </span>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Summary */}
                    {paymentAmount > 0 && outstandingAmount > 0 && (
                        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg space-y-1">
                            <div className="flex justify-between text-sm">
                                <span>{i18n.language === 'bn' ? 'পেমেন্ট' : 'Payment'}:</span>
                                <span className="font-semibold text-green-600">৳{paymentAmount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>{i18n.language === 'bn' ? 'বাকি থাকবে' : 'Remaining'}:</span>
                                <span className={remainingAfter > 0 ? 'text-amber-600' : 'text-green-600'}>
                                    ৳{remainingAfter.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {i18n.language === 'bn' ? 'বাতিল' : 'Cancel'}
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={paymentMutation.isPending || !amount || parseFloat(amount) <= 0}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {paymentMutation.isPending ? (
                            <span className="flex items-center gap-2">
                                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                {i18n.language === 'bn' ? 'প্রক্রিয়াকরণ...' : 'Processing...'}
                            </span>
                        ) : (
                            i18n.language === 'bn' ? 'পেমেন্ট নিশ্চিত করুন' : 'Confirm Payment'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
