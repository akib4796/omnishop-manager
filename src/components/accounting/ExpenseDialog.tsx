import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Wallet, Landmark, Smartphone, Vault, CreditCard } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { createExpense } from "@/integrations/appwrite/expenses";
import { createPayment } from "@/integrations/appwrite/payments";
import { getDisplayWallets, DEFAULT_WALLETS, updateWalletBalance } from "@/integrations/appwrite/wallets";

const expenseSchema = z.object({
    category: z.string().min(1, "Category is required"),
    amount: z.string().min(1, "Amount is required"),
    description: z.string().optional(),
    paidBy: z.string().min(1, "Payment method is required"),
    date: z.string().min(1, "Date is required"),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

// Icon mapping
const getWalletIcon = (type: string) => {
    switch (type) {
        case 'cash': return Wallet;
        case 'bank': return Landmark;
        case 'mobile': return Smartphone;
        case 'safe': return Vault;
        default: return CreditCard;
    }
};

export function ExpenseDialog({ open, onOpenChange }: ExpenseDialogProps) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { profile, user } = useAuth();
    const tenantId = profile?.tenantId;

    // Fetch dynamic wallets
    const { data: wallets } = useQuery({
        queryKey: ["display-wallets", tenantId],
        queryFn: () => tenantId ? getDisplayWallets(tenantId) : Promise.resolve(DEFAULT_WALLETS),
        enabled: !!tenantId,
    });

    const form = useForm<ExpenseFormData>({
        resolver: zodResolver(expenseSchema),
        defaultValues: {
            category: "",
            amount: "",
            description: "",
            paidBy: "Cash",
            date: new Date().toISOString().split("T")[0],
        },
    });

    const saveMutation = useMutation({
        mutationFn: async (data: ExpenseFormData) => {
            if (!tenantId || !user) throw new Error("Not authenticated");

            const amount = parseFloat(data.amount);

            // 1. Create Expense Record
            const expense = await createExpense({
                tenantId,
                category: data.category,
                amount,
                date: new Date(data.date).toISOString(),
                description: data.description,
                paidBy: data.paidBy,
            });

            // 2. Create Payment/Ledger Entry (Cash Out)
            await createPayment({
                tenantId,
                type: 'OUT',
                category: 'EXPENSE',
                amount,
                method: data.paidBy, // Uses wallet name (e.g., "Cash Drawer", "Bkash")
                referenceId: expense.$id,
            });

            // 3. Update wallet balance directly
            await updateWalletBalance(tenantId, data.paidBy, amount, 'OUT');

            return expense;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["expenses", tenantId] });
            queryClient.invalidateQueries({ queryKey: ["payments", tenantId] });
            toast.success("Expense recorded successfully");
            form.reset();
            onOpenChange(false);
        },
        onError: (error) => {
            console.error("Expense Error:", error);
            toast.error("Failed to record expense");
        },
    });

    const onSubmit = (data: ExpenseFormData) => {
        saveMutation.mutate(data);
    };

    const categories = [
        "Rent",
        "Utilities",
        "Salary",
        "Supplies",
        "Maintenance",
        "Marketing",
        "Transportation",
        "Internet & Phone",
        "Other",
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Expense</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                        {/* Category */}
                        <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Category</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select category" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {categories.map((cat) => (
                                                <SelectItem key={cat} value={cat}>
                                                    {cat}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Amount & Date Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Amount</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Date</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Payment Method */}
                        <FormField
                            control={form.control}
                            name="paidBy"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Paid By</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select method" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {(wallets || DEFAULT_WALLETS).map((wallet) => {
                                                const Icon = getWalletIcon(wallet.type);
                                                return (
                                                    <SelectItem key={wallet.id} value={wallet.name}>
                                                        <div className="flex items-center gap-2">
                                                            <Icon className="h-4 w-4" />
                                                            <span>{wallet.name}</span>
                                                        </div>
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Description */}
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end gap-2 text-white p-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="text-black bg-white hover:bg-zinc-200"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={saveMutation.isPending}>
                                {saveMutation.isPending ? "Saving..." : "Save Expense"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
