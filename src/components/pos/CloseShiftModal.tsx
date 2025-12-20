import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Square, AlertTriangle, CheckCircle2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { closeShift, CashShift } from "@/integrations/appwrite/cashShifts";

interface CloseShiftModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    shift: CashShift | null;
    expectedBalance: number;
    onSuccess?: () => void;
}

export function CloseShiftModal({
    open,
    onOpenChange,
    shift,
    expectedBalance,
    onSuccess,
}: CloseShiftModalProps) {
    const { i18n } = useTranslation();
    const queryClient = useQueryClient();
    const [actualBalance, setActualBalance] = useState<string>("");
    const [notes, setNotes] = useState<string>("");

    // Reset form when modal opens
    useEffect(() => {
        if (open) {
            setActualBalance("");
            setNotes("");
        }
    }, [open]);

    const variance = actualBalance
        ? parseFloat(actualBalance) - expectedBalance
        : 0;

    const closeShiftMutation = useMutation({
        mutationFn: async () => {
            if (!shift) throw new Error("No active shift");

            const closingBalance = parseFloat(actualBalance);
            if (isNaN(closingBalance) || closingBalance < 0) {
                throw new Error("Invalid closing balance");
            }

            return closeShift(shift.$id, {
                closingBalance,
                expectedBalance,
                variance: closingBalance - expectedBalance,
                notes: notes.trim() || undefined,
            });
        },
        onSuccess: () => {
            toast.success(
                i18n.language === 'bn'
                    ? 'শিফট সফলভাবে বন্ধ হয়েছে'
                    : 'Shift closed successfully'
            );
            queryClient.invalidateQueries({ queryKey: ["activeShift"] });
            queryClient.invalidateQueries({ queryKey: ["shiftHistory"] });
            onOpenChange(false);
            onSuccess?.();
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to close shift");
        },
    });

    const handleSubmit = () => {
        const balance = parseFloat(actualBalance);
        if (isNaN(balance) || balance < 0) {
            toast.error(
                i18n.language === 'bn'
                    ? 'সঠিক পরিমাণ দিন'
                    : 'Please enter a valid amount'
            );
            return;
        }
        closeShiftMutation.mutate();
    };

    if (!shift) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Square className="h-5 w-5 text-red-600" />
                        {i18n.language === 'bn' ? 'শিফট বন্ধ করুন' : 'Close Shift'}
                    </DialogTitle>
                    <DialogDescription>
                        {i18n.language === 'bn'
                            ? 'ক্যাশ ড্রয়ারে থাকা প্রকৃত টাকা গণনা করুন'
                            : 'Count the actual cash in your drawer'
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Shift Summary */}
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                                {i18n.language === 'bn' ? 'প্রারম্ভিক ব্যালেন্স' : 'Opening Balance'}
                            </span>
                            <span>৳{shift.openingBalance.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium border-t pt-2">
                            <span>
                                {i18n.language === 'bn' ? 'প্রত্যাশিত ব্যালেন্স' : 'Expected Balance'}
                            </span>
                            <span className="text-green-600">৳{expectedBalance.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Actual Cash Count */}
                    <div className="space-y-2">
                        <Label htmlFor="actualBalance">
                            {i18n.language === 'bn' ? 'প্রকৃত ক্যাশ গণনা' : 'Actual Cash Count'}
                        </Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                ৳
                            </span>
                            <Input
                                id="actualBalance"
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={actualBalance}
                                onChange={(e) => setActualBalance(e.target.value)}
                                className="pl-8"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Variance Display */}
                    {actualBalance && (
                        <div className={`rounded-lg p-4 ${variance === 0
                                ? 'bg-green-100 dark:bg-green-900/20'
                                : variance > 0
                                    ? 'bg-blue-100 dark:bg-blue-900/20'
                                    : 'bg-red-100 dark:bg-red-900/20'
                            }`}>
                            <div className="flex items-center gap-2">
                                {variance === 0 ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                ) : (
                                    <AlertTriangle className={`h-5 w-5 ${variance > 0 ? 'text-blue-600' : 'text-red-600'}`} />
                                )}
                                <div>
                                    <p className="font-medium">
                                        {variance === 0
                                            ? (i18n.language === 'bn' ? 'সঠিক ব্যালেন্স' : 'Balanced')
                                            : variance > 0
                                                ? (i18n.language === 'bn' ? 'অতিরিক্ত' : 'Cash Over')
                                                : (i18n.language === 'bn' ? 'কম' : 'Cash Short')
                                        }
                                    </p>
                                    {variance !== 0 && (
                                        <p className={`text-sm ${variance > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                            {variance > 0 ? '+' : ''}৳{variance.toLocaleString()}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">
                            {i18n.language === 'bn' ? 'নোট (ঐচ্ছিক)' : 'Notes (Optional)'}
                        </Label>
                        <Textarea
                            id="notes"
                            placeholder={i18n.language === 'bn'
                                ? 'শিফট সম্পর্কে কোনো মন্তব্য...'
                                : 'Any comments about this shift...'
                            }
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        {i18n.language === 'bn' ? 'বাতিল' : 'Cancel'}
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={closeShiftMutation.isPending || !actualBalance}
                        variant="destructive"
                    >
                        <Square className="h-4 w-4 mr-2" />
                        {closeShiftMutation.isPending
                            ? (i18n.language === 'bn' ? 'বন্ধ হচ্ছে...' : 'Closing...')
                            : (i18n.language === 'bn' ? 'শিফট বন্ধ করুন' : 'Close Shift')
                        }
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
