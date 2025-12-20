import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
    FileText,
    Search,
    Trash2,
    Calendar,
    ShoppingCart,
    MoreVertical,
    CheckCircle2,
    XCircle,
    Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { MobileNavSheet } from "@/components/MobileNavSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
import { formatCurrency } from "@/lib/i18n-utils";
import { getQuotations, deleteQuotation, updateQuotationStatus, Quotation } from "@/integrations/appwrite/quotations";

export default function Quotations() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { profile } = useAuth();
    const queryClient = useQueryClient();
    const tenantId = profile?.tenantId;

    const [searchTerm, setSearchTerm] = useState("");
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Queries
    const { data: quotations, isLoading } = useQuery({
        queryKey: ["quotations", tenantId],
        queryFn: () => tenantId ? getQuotations(tenantId) : Promise.resolve([]),
        enabled: !!tenantId,
    });

    // Mutations
    const deleteMutation = useMutation({
        mutationFn: deleteQuotation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quotations"] });
            toast.success("Quotation deleted");
            setDeleteId(null);
        },
        onError: () => toast.error("Failed to delete quotation"),
    });

    const statusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: any }) =>
            updateQuotationStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quotations"] });
            toast.success("Status updated");
        },
    });

    // Filtering
    const filteredQuotations = quotations?.filter(q =>
        q.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.quotationNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleLoadToPOS = (quotation: Quotation) => {
        // Logic to load into POS would ideally use a shared state or store (e.g. Zustand/Redux)
        // or passing via navigation state.
        // For simplicity, we'll assume we can pass state via navigate for now, 
        // OR we just simulate it by saying "Not implemented yet - Requires Global Cart Store".
        // BUT, we have `localStorage` or `IndexedDB`.

        // Let's use localStorage to pass generic "loadQuote" intent to POS
        localStorage.setItem("pendingQuoteLoad", JSON.stringify(quotation));
        navigate("/pos");
        toast.info("Loading quotation into POS...");
    };

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <MobileNavSheet title="Quotations" />

                <div className="p-4 md:p-6 space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Quotations</h1>
                            <p className="text-muted-foreground">Manage estimates and convert them to sales</p>
                        </div>
                        <Button onClick={() => navigate("/pos")}>
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            Create New (Go to POS)
                        </Button>
                    </div>

                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle>All Quotations</CardTitle>
                                <div className="relative w-full max-w-sm">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="search"
                                        placeholder="Search quotes..."
                                        className="pl-8"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Number</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Customer</TableHead>
                                            <TableHead>Total</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-24 text-center">
                                                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredQuotations?.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                                    No quotations found.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredQuotations?.map((q) => (
                                                <TableRow key={q.$id}>
                                                    <TableCell className="font-mono font-medium">
                                                        {q.quotationNumber}
                                                    </TableCell>
                                                    <TableCell>
                                                        {format(new Date(q.createdAt), "MMM d, yyyy")}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-medium">{q.customerName}</div>
                                                        <div className="text-xs text-muted-foreground">{q.customerPhone}</div>
                                                    </TableCell>
                                                    <TableCell className="font-bold">
                                                        {formatCurrency(q.total, i18n.language)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={
                                                            q.status === 'converted' ? 'default' :
                                                                q.status === 'expired' ? 'destructive' :
                                                                    q.status === 'accepted' ? 'secondary' : 'outline'
                                                        }>
                                                            {q.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                                    <span className="sr-only">Open menu</span>
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                <DropdownMenuItem onClick={() => handleLoadToPOS(q)}>
                                                                    <ShoppingCart className="mr-2 h-4 w-4" />
                                                                    Load to POS
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem onClick={() => statusMutation.mutate({ id: q.$id, status: 'accepted' })}>
                                                                    <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Accepted
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => statusMutation.mutate({ id: q.$id, status: 'expired' })}>
                                                                    <XCircle className="mr-2 h-4 w-4" /> Mark Expired
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem className="text-red-600" onClick={() => setDeleteId(q.$id)}>
                                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the quotation.
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
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
