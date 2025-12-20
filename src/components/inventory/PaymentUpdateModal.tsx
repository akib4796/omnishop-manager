import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, Check } from "lucide-react";
import { formatCurrency } from "@/lib/i18n-utils";
import { cn } from "@/lib/utils";
import { PaymentStatus } from "@/integrations/appwrite/inventory";

interface PaymentUpdateModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    order: any | null;
    onUpdatePayment: (orderId: string, amountPaid: number, totalAmount: number) => Promise<void>;
}

export function PaymentUpdateModal({
    open,
    onOpenChange,
    order,
    onUpdatePayment,
}: PaymentUpdateModalProps) {
    const { t, i18n } = useTranslation();
    const [paymentAmount, setPaymentAmount] = useState("");
    const [updating, setUpdating] = useState(false);

    if (!order) return null;

    const totalAmount = order.totalAmount || order.total_amount || 0;
    const currentAmountPaid = order.amountPaid || 0;
    const remainingAmount = totalAmount - currentAmountPaid;

    const handleSubmit = async () => {
        const amount = parseFloat(paymentAmount) || 0;
        if (amount <= 0) return;

        setUpdating(true);
        try {
            const newAmountPaid = currentAmountPaid + amount;
            await onUpdatePayment(order.$id || order.id, newAmountPaid, totalAmount);
            setPaymentAmount("");
            onOpenChange(false);
        } finally {
            setUpdating(false);
        }
    };

    const handlePayFull = async () => {
        setUpdating(true);
        try {
            await onUpdatePayment(order.$id || order.id, totalAmount, totalAmount);
            setPaymentAmount("");
            onOpenChange(false);
        } finally {
            setUpdating(false);
        }
    };

    // Calculate what status will be after this payment
    const previewNewAmount = currentAmountPaid + (parseFloat(paymentAmount) || 0);
    const previewStatus: PaymentStatus =
        previewNewAmount >= totalAmount ? 'paid' :
            previewNewAmount > 0 ? 'partially_paid' : 'not_paid';

    const getStatusColors = (status: PaymentStatus) => {
        switch (status) {
            case 'paid': return 'bg-green-500/20 text-green-600 border-green-500/30';
            case 'partially_paid': return 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30';
            default: return 'bg-red-500/20 text-red-600 border-red-500/30';
        }
    };

    const getStatusLabel = (status: PaymentStatus) => {
        const labels: Record<PaymentStatus, string> = {
            not_paid: i18n.language === "bn" ? "অপরিশোধিত" : "Not Paid",
            partially_paid: i18n.language === "bn" ? "আংশিক" : "Partial",
            paid: i18n.language === "bn" ? "পরিশোধিত" : "Paid",
        };
        return labels[status];
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        {i18n.language === "bn" ? "পেমেন্ট আপডেট" : "Update Payment"}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Order Summary */}
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                                {i18n.language === "bn" ? "সাপ্লায়ার" : "Supplier"}
                            </span>
                            <span className="font-medium">{order.supplierName || "-"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                                {i18n.language === "bn" ? "মোট পরিমাণ" : "Total Amount"}
                            </span>
                            <span className="font-bold text-lg">
                                {formatCurrency(totalAmount, i18n.language, "BDT")}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                                {i18n.language === "bn" ? "পরিশোধিত" : "Paid So Far"}
                            </span>
                            <span className="font-medium text-green-600">
                                {formatCurrency(currentAmountPaid, i18n.language, "BDT")}
                            </span>
                        </div>
                        <div className="flex justify-between items-center border-t pt-2">
                            <span className="text-sm font-medium">
                                {i18n.language === "bn" ? "বাকি" : "Remaining"}
                            </span>
                            <span className="font-bold text-red-600">
                                {formatCurrency(remainingAmount, i18n.language, "BDT")}
                            </span>
                        </div>
                    </div>

                    {/* Payment Input */}
                    <div className="space-y-2">
                        <Label>{i18n.language === "bn" ? "পেমেন্ট পরিমাণ" : "Payment Amount"}</Label>
                        <div className="flex gap-2">
                            <Input
                                type="number"
                                inputMode="decimal"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                placeholder={`৳${remainingAmount}`}
                                className="text-lg font-bold"
                            />
                            <Button
                                variant="outline"
                                onClick={() => setPaymentAmount(remainingAmount.toString())}
                                className="shrink-0"
                            >
                                {i18n.language === "bn" ? "সম্পূর্ণ" : "Full"}
                            </Button>
                        </div>
                    </div>

                    {/* Status Preview */}
                    {paymentAmount && parseFloat(paymentAmount) > 0 && (
                        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                            <span className="text-sm">
                                {i18n.language === "bn" ? "নতুন স্ট্যাটাস" : "New Status"}
                            </span>
                            <Badge className={`${getStatusColors(previewStatus)} border`}>
                                {getStatusLabel(previewStatus)}
                            </Badge>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex gap-2 sm:gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={updating}
                    >
                        {i18n.language === "bn" ? "বাতিল" : "Cancel"}
                    </Button>

                    <Button
                        variant="secondary"
                        onClick={handlePayFull}
                        disabled={updating || remainingAmount <= 0}
                        className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border border-green-500/30"
                    >
                        <Check className="h-4 w-4 mr-2" />
                        {i18n.language === "bn" ? "সম্পূর্ণ পরিশোধ" : "Pay Full"}
                    </Button>

                    <Button
                        onClick={handleSubmit}
                        disabled={updating || !paymentAmount || parseFloat(paymentAmount) <= 0}
                    >
                        {updating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <>{i18n.language === "bn" ? "পেমেন্ট যোগ করুন" : "Add Payment"}</>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
