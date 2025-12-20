import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

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
import { updatePaymentStatus, PurchaseOrder } from "@/integrations/appwrite/inventory";

interface SupplierPaymentModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    purchaseOrder: PurchaseOrder | null;
}

export function SupplierPaymentModal({
    open,
    onOpenChange,
    purchaseOrder,
}: SupplierPaymentModalProps) {
    const { t, i18n } = useTranslation();
    const { profile } = useAuth();
    const queryClient = useQueryClient();
    const tenantId = profile?.tenantId;

    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState("cash");
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Calculate remaining amount
    const orderTotal = purchaseOrder?.totalAmount || 0;
    const alreadyPaid = purchaseOrder?.amountPaid || 0;
    const remaining = orderTotal - alreadyPaid;

    const handleSubmit = async () => {
        if (!purchaseOrder || !tenantId) return;

        const paymentAmount = parseFloat(amount);
        if (isNaN(paymentAmount) || paymentAmount <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        if (paymentAmount > remaining) {
            toast.error(`Amount exceeds remaining balance of ${formatCurrency(remaining, i18n.language)}`);
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Record in Ledger (payments collection)
            await createPayment({
                tenantId,
                type: 'OUT',
                category: 'SUPPLIER_PAYMENT',
                entityId: purchaseOrder.supplierId,
                amount: paymentAmount,
                method: method,
                referenceId: purchaseOrder.$id,
            });

            // 2. Update PO (amountPaid - function auto-calculates status)
            const newAmountPaid = alreadyPaid + paymentAmount;

            await updatePaymentStatus(purchaseOrder.$id, newAmountPaid, orderTotal);

            toast.success(`Payment of ${formatCurrency(paymentAmount, i18n.language)} recorded!`);

            // Invalidate queries
            queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
            queryClient.invalidateQueries({ queryKey: ["ledger"] });

            // Reset and close
            setAmount("");
            setNotes("");
            onOpenChange(false);
        } catch (error: any) {
            console.error("Error recording payment:", error);
            toast.error("Failed to record payment");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePayFull = () => {
        setAmount(remaining.toString());
    };

    if (!purchaseOrder) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Pay Supplier</DialogTitle>
                    <DialogDescription>
                        Record a payment for PO #{purchaseOrder.orderNumber}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* PO Summary */}
                    <div className="rounded-lg border p-3 bg-muted/50 space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Supplier:</span>
                            <span className="font-medium">{purchaseOrder.supplierName || 'Unknown'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Order Total:</span>
                            <span className="font-medium">{formatCurrency(orderTotal, i18n.language)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Already Paid:</span>
                            <span className="text-green-600 font-medium">{formatCurrency(alreadyPaid, i18n.language)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1">
                            <span className="text-muted-foreground font-medium">Remaining:</span>
                            <span className="text-red-600 font-bold">{formatCurrency(remaining, i18n.language)}</span>
                        </div>
                    </div>

                    {/* Amount Input */}
                    <div className="space-y-2">
                        <Label htmlFor="amount">Payment Amount</Label>
                        <div className="flex gap-2">
                            <Input
                                id="amount"
                                type="number"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                min="0"
                                max={remaining}
                                step="0.01"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handlePayFull}
                                className="shrink-0"
                            >
                                Pay Full
                            </Button>
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-2">
                        <Label htmlFor="method">Payment Method</Label>
                        <Select value={method} onValueChange={setMethod}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="cash">Cash</SelectItem>
                                <SelectItem value="bank">Bank Transfer</SelectItem>
                                <SelectItem value="mobile">Mobile Money</SelectItem>
                                <SelectItem value="check">Check</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <Textarea
                            id="notes"
                            placeholder="Payment reference, receipt number, etc."
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
                        Record Payment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
