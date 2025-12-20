import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Clock, Play, Square, DollarSign, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { getActiveShift, CashShift } from "@/integrations/appwrite/cashShifts";
import { OpenShiftModal } from "./OpenShiftModal";
import { CloseShiftModal } from "./CloseShiftModal";

interface ShiftStatusBarProps {
    tenantId: string;
    userId: string;
    shiftCashIn: number; // Cash received during this shift (from sales)
}

export function ShiftStatusBar({
    tenantId,
    userId,
    shiftCashIn,
}: ShiftStatusBarProps) {
    const { i18n } = useTranslation();
    const [showOpenModal, setShowOpenModal] = useState(false);
    const [showCloseModal, setShowCloseModal] = useState(false);

    // Fetch active shift
    const { data: activeShift, isLoading } = useQuery({
        queryKey: ["activeShift", tenantId],
        queryFn: () => getActiveShift(tenantId),
        enabled: !!tenantId,
        refetchInterval: 30000, // Refresh every 30 seconds
    });

    // Calculate expected balance for closing
    // Expected = Opening + Cash In During Shift
    const calculateExpectedBalance = (shift: CashShift): number => {
        return shift.openingBalance + shiftCashIn;
    };

    // Calculate current drawer balance (Opening + net cash during shift)
    const currentDrawerBalance = activeShift
        ? activeShift.openingBalance + shiftCashIn
        : 0;

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-lg animate-pulse">
                <Clock className="h-4 w-4" />
                <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
        );
    }

    // No active shift
    if (!activeShift) {
        return (
            <>
                <div className="flex items-center gap-3 px-4 py-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                            {i18n.language === 'bn' ? 'কোনো শিফট চালু নেই' : 'No Active Shift'}
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                            {i18n.language === 'bn'
                                ? 'বিক্রি করতে শিফট শুরু করুন'
                                : 'Open a shift to start selling'
                            }
                        </p>
                    </div>
                    <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => setShowOpenModal(true)}
                    >
                        <Play className="h-4 w-4 mr-1" />
                        {i18n.language === 'bn' ? 'শিফট শুরু' : 'Open Shift'}
                    </Button>
                </div>

                <OpenShiftModal
                    open={showOpenModal}
                    onOpenChange={setShowOpenModal}
                    tenantId={tenantId}
                    userId={userId}
                />
            </>
        );
    }

    // Active shift exists
    const expectedBalance = calculateExpectedBalance(activeShift);
    const shiftDuration = Date.now() - new Date(activeShift.$createdAt).getTime();
    const hours = Math.floor(shiftDuration / (1000 * 60 * 60));
    const minutes = Math.floor((shiftDuration % (1000 * 60 * 60)) / (1000 * 60));

    return (
        <>
            <div className="flex items-center gap-4 px-4 py-2 bg-green-100 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <Badge variant="outline" className="bg-green-600 text-white border-0">
                        {i18n.language === 'bn' ? 'শিফট চালু' : 'Shift Active'}
                    </Badge>
                </div>

                <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>
                            {format(new Date(activeShift.$createdAt), 'h:mm a')}
                            ({hours}h {minutes}m)
                        </span>
                    </div>

                    <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-medium">
                            {i18n.language === 'bn' ? 'প্রারম্ভিক:' : 'Opening:'} ৳{activeShift.openingBalance.toLocaleString()}
                        </span>
                    </div>

                    <div className="flex items-center gap-1">
                        <span className="font-medium text-green-600">
                            {i18n.language === 'bn' ? 'বর্তমান:' : 'Current:'} ৳{currentDrawerBalance.toLocaleString()}
                        </span>
                    </div>
                </div>

                <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setShowCloseModal(true)}
                    className="ml-auto"
                >
                    <Square className="h-4 w-4 mr-1" />
                    {i18n.language === 'bn' ? 'শিফট বন্ধ' : 'Close Shift'}
                </Button>
            </div>

            <CloseShiftModal
                open={showCloseModal}
                onOpenChange={setShowCloseModal}
                shift={activeShift}
                expectedBalance={expectedBalance}
            />
        </>
    );
}
