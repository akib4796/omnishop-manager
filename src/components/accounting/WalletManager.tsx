import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
    Plus,
    Pencil,
    Trash2,
    Loader2,
    Wallet,
    Landmark,
    Smartphone,
    Vault,
    CreditCard,
    PiggyBank
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
    getWallets,
    createWallet,
    updateWallet,
    deleteWallet,
    Wallet as WalletType,
    DEFAULT_WALLETS
} from "@/integrations/appwrite/wallets";

const WALLET_TYPES = [
    { value: 'cash', label: 'Cash', icon: Wallet },
    { value: 'bank', label: 'Bank Account', icon: Landmark },
    { value: 'mobile', label: 'Mobile Money', icon: Smartphone },
    { value: 'safe', label: 'Safe/Vault', icon: Vault },
    { value: 'other', label: 'Other', icon: CreditCard },
];

const COLORS = [
    { value: 'green', label: 'Green', class: 'bg-green-500' },
    { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
    { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
    { value: 'amber', label: 'Amber', class: 'bg-amber-500' },
    { value: 'red', label: 'Red', class: 'bg-red-500' },
    { value: 'cyan', label: 'Cyan', class: 'bg-cyan-500' },
    { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
];

export function WalletManager() {
    const { t, i18n } = useTranslation();
    const { profile } = useAuth();
    const queryClient = useQueryClient();
    const tenantId = profile?.tenantId;

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingWallet, setEditingWallet] = useState<WalletType | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        type: 'cash' as 'cash' | 'bank' | 'mobile' | 'safe' | 'other',
        color: 'green',
    });

    // Queries
    const { data: wallets, isLoading } = useQuery({
        queryKey: ["wallets", tenantId],
        queryFn: () => tenantId ? getWallets(tenantId) : Promise.resolve([]),
        enabled: !!tenantId,
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: createWallet,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["wallets"] });
            toast.success("Wallet created!");
            resetForm();
        },
        onError: () => toast.error("Failed to create wallet"),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => updateWallet(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["wallets"] });
            toast.success("Wallet updated!");
            resetForm();
        },
        onError: () => toast.error("Failed to update wallet"),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteWallet,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["wallets"] });
            toast.success("Wallet deleted!");
            setDeleteId(null);
        },
        onError: () => toast.error("Failed to delete wallet"),
    });

    const resetForm = () => {
        setFormData({ name: '', type: 'cash', color: 'green' });
        setEditingWallet(null);
        setIsDialogOpen(false);
    };

    const handleSubmit = () => {
        if (!tenantId || !formData.name.trim()) {
            toast.error("Please enter a name");
            return;
        }

        if (editingWallet) {
            updateMutation.mutate({
                id: editingWallet.$id,
                data: formData,
            });
        } else {
            createMutation.mutate({
                tenantId,
                ...formData,
            });
        }
    };

    const handleEdit = (wallet: WalletType) => {
        setEditingWallet(wallet);
        setFormData({
            name: wallet.name,
            type: wallet.type,
            color: wallet.color || 'green',
        });
        setIsDialogOpen(true);
    };

    const getIcon = (type: string) => {
        const found = WALLET_TYPES.find(t => t.value === type);
        return found ? found.icon : Wallet;
    };

    const getColorClass = (color: string) => {
        const found = COLORS.find(c => c.value === color);
        return found ? found.class : 'bg-gray-500';
    };

    // Always show defaults first, then custom wallets
    const defaultWalletsList = DEFAULT_WALLETS.map((w, i) => ({
        $id: `default-${i}`,
        tenantId: tenantId || '',
        name: w.name,
        type: w.type as any,
        icon: w.icon,
        color: w.color,
        balance: 0,
        isDefault: true,
        createdAt: '',
    }));

    // Combine defaults + custom wallets (custom can have same name, that's ok)
    const displayWallets = [
        ...defaultWalletsList,
        ...(wallets || []).map(w => ({ ...w, isDefault: false }))
    ];

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Wallets / Cash Books</CardTitle>
                    <CardDescription>Manage your payment methods and cash books</CardDescription>
                </div>
                <Button size="sm" onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Wallet
                </Button>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {displayWallets.map((wallet: any) => {
                            const Icon = getIcon(wallet.type);
                            return (
                                <div
                                    key={wallet.$id}
                                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${getColorClass(wallet.color)} text-white`}>
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="font-medium">{wallet.name}</p>
                                            <p className="text-xs text-muted-foreground capitalize">{wallet.type}</p>
                                        </div>
                                    </div>
                                    {!wallet.isDefault && (
                                        <div className="flex gap-1">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => handleEdit(wallet)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="text-red-500"
                                                onClick={() => setDeleteId(wallet.$id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {(!wallets || wallets.length === 0) && (
                    <p className="text-xs text-muted-foreground text-center mt-4">
                        Using default wallets. Add custom wallets above to customize.
                    </p>
                )}
            </CardContent>

            {/* Add/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={(open) => !open && resetForm()}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editingWallet ? 'Edit Wallet' : 'Add New Wallet'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input
                                placeholder="e.g., Petty Cash, Savings Account"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(v: any) => setFormData(prev => ({ ...prev, type: v }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {WALLET_TYPES.map(type => (
                                        <SelectItem key={type.value} value={type.value}>
                                            <div className="flex items-center gap-2">
                                                <type.icon className="h-4 w-4" />
                                                <span>{type.label}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Color</Label>
                            <div className="flex gap-2 flex-wrap">
                                {COLORS.map(color => (
                                    <button
                                        key={color.value}
                                        type="button"
                                        className={`w-8 h-8 rounded-full ${color.class} ${formData.color === color.value
                                            ? 'ring-2 ring-offset-2 ring-primary'
                                            : ''
                                            }`}
                                        onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={resetForm}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={createMutation.isPending || updateMutation.isPending}
                        >
                            {(createMutation.isPending || updateMutation.isPending) && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {editingWallet ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Wallet?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove the wallet. Existing transactions using this wallet will still be visible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => deleteId && deleteMutation.mutate(deleteId)}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}
