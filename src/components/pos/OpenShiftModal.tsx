import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Play } from "lucide-react";
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
import { toast } from "sonner";
import { openShift } from "@/integrations/appwrite/cashShifts";

interface OpenShiftModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tenantId: string;
    userId: string;
    onSuccess?: () => void;
}

export function OpenShiftModal({
    open,
    onOpenChange,
    tenantId,
    userId,
    onSuccess,
}: OpenShiftModalProps) {
    const { t, i18n } = useTranslation();
    const queryClient = useQueryClient();
    const [openingBalance, setOpeningBalance] = useState<string>("");

    const openShiftMutation = useMutation({
        mutationFn: async () => {
            const balance = parseFloat(openingBalance);
            if (isNaN(balance) || balance < 0) {
                throw new Error("Invalid opening balance");
            }

            return openShift({
                tenantId,
                userId,
                openingBalance: balance,
            });
        },
        onSuccess: () => {
            toast.success(
                i18n.language === 'bn'
                    ? 'শিফট সফলভাবে শুরু হয়েছে'
                    : 'Shift opened successfully'
            );
            queryClient.invalidateQueries({ queryKey: ["activeShift", tenantId] });
            queryClient.invalidateQueries({ queryKey: ["shiftHistory", tenantId] });
            setOpeningBalance("");
            onOpenChange(false);
            onSuccess?.();
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to open shift");
        },
    });

    const handleSubmit = () => {
        const balance = parseFloat(openingBalance);
        if (isNaN(balance) || balance < 0) {
            toast.error(
                i18n.language === 'bn'
                    ? 'সঠিক পরিমাণ দিন'
                    : 'Please enter a valid amount'
            );
            return;
        }
        openShiftMutation.mutate();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Play className="h-5 w-5 text-green-600" />
                        {i18n.language === 'bn' ? 'শিফট শুরু করুন' : 'Open Shift'}
                    </DialogTitle>
                    <DialogDescription>
                        {i18n.language === 'bn'
                            ? 'ক্যাশ ড্রয়ারে থাকা প্রারম্ভিক টাকার পরিমাণ দিন'
                            : 'Enter the opening cash balance in your drawer'
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="openingBalance">
                            {i18n.language === 'bn' ? 'প্রারম্ভিক ব্যালেন্স' : 'Opening Balance'}
                        </Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                ৳
                            </span>
                            <Input
                                id="openingBalance"
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={openingBalance}
                                onChange={(e) => setOpeningBalance(e.target.value)}
                                className="pl-8"
                                autoFocus
                            />
                        </div>
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
                        disabled={openShiftMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        <Play className="h-4 w-4 mr-2" />
                        {openShiftMutation.isPending
                            ? (i18n.language === 'bn' ? 'শুরু হচ্ছে...' : 'Opening...')
                            : (i18n.language === 'bn' ? 'শিফট শুরু করুন' : 'Start Shift')
                        }
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
