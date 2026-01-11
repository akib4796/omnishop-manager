import { useState } from "react";
import { useTranslation } from "react-i18next";
import Papa from "papaparse";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, AlertCircle, FileText, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import {
    Category,
    createCategory,
    createProduct,
    getProducts,
} from "@/integrations/appwrite";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ImportProductDialogProps {
    tenantId: string;
    categories: Category[]; // Existing categories to check against
    onSuccess: () => void;
}

interface CSVRow {
    "Product Name": string;
    Category: string;
    Quantity: string | number;
    "Purchase Price": string | number;
    "Selling Price": string | number;
    [key: string]: any;
}

export function ImportProductDialog({
    tenantId,
    categories,
    onSuccess,
}: ImportProductDialogProps) {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<CSVRow[]>([]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith(".csv")) {
                setError("Please upload a CSV file.");
                setFile(null);
                return;
            }
            setFile(selectedFile);
            setError(null);
            setLogs([]);

            // Preview
            Papa.parse<CSVRow>(selectedFile, {
                header: true,
                skipEmptyLines: true,
                preview: 5,
                complete: (results) => {
                    setPreview(results.data);
                },
                error: (err) => {
                    setError(`Parse Error: ${err.message}`);
                }
            });
        }
    };

    const addLog = (message: string) => {
        setLogs((prev) => [...prev, message]);
    };

    const processImport = async () => {
        if (!file || !tenantId) return;

        setIsImporting(true);
        setLogs([]);
        setError(null);

        Papa.parse<CSVRow>(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const rows = results.data;
                if (rows.length === 0) {
                    setError("CSV file is empty.");
                    setIsImporting(false);
                    return;
                }

                // Validate headers roughly
                const firstRow = rows[0];
                if (!("Product Name" in firstRow) || !("Category" in firstRow)) {
                    setError("Missing required columns: 'Product Name' or 'Category'. Please check the format.");
                    setIsImporting(false);
                    return;
                }

                let successCount = 0;
                let failCount = 0;
                // Local cache of categories (id mapped by lowercase name)
                const categoryMap = new Map<string, string>();
                categories.forEach(c => categoryMap.set(c.name.toLowerCase(), c.$id));

                try {
                    // Fetch existing products to avoid duplicates (optional, based on name)
                    // For now, we will create new ones, or maybe just proceed. 
                    // Since explicit instruction is "auto create... if missing", implies check. 
                    // Checking availability can be slow for large imports. 
                    // We'll trust the user wants to import what's in the CSV.
                    // But let's check duplicates within CSV? No, simple flow.

                    for (let i = 0; i < rows.length; i++) {
                        const row = rows[i];
                        const productName = row["Product Name"]?.trim();
                        const categoryName = row["Category"]?.trim();
                        const qty = Number(row["Quantity"]) || 0;
                        const purchasePrice = Number(row["Purchase Price"]) || 0;
                        const sellingPrice = Number(row["Selling Price"]) || 0;

                        if (!productName) {
                            addLog(`Row ${i + 1}: Skipped (Missing Name)`);
                            failCount++;
                            continue;
                        }

                        try {
                            // 1. Handle Category
                            let categoryId = "";
                            if (categoryName) {
                                const catKey = categoryName.toLowerCase();
                                if (categoryMap.has(catKey)) {
                                    categoryId = categoryMap.get(catKey)!;
                                } else {
                                    // Create Category
                                    addLog(`Creating category: ${categoryName}`);
                                    const newCat = await createCategory({
                                        name: categoryName,
                                        color: "#" + Math.floor(Math.random() * 16777215).toString(16), // Random color
                                        tenantId,
                                        isActive: true
                                    });
                                    categoryId = newCat.$id;
                                    categoryMap.set(catKey, categoryId);
                                }
                            }

                            // 2. Create Product
                            // Generate SKU if needed or use random
                            const sku = `IMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

                            await createProduct({
                                name: productName,
                                sku: sku,
                                categoryId: categoryId || undefined,
                                purchasePrice,
                                sellingPrice,
                                currentStock: qty,
                                tenantId,
                                // Defaults
                                unit: 'pcs',
                                lowStockThreshold: 10
                            });

                            // addLog(`Imported: ${productName}`);
                            successCount++;

                        } catch (err: any) {
                            console.error(err);
                            addLog(`Row ${i + 1} Error: ${err.message}`);
                            failCount++;
                        }

                        // Small delay to prevent rate limiting if many rows? Appwrite might handle it, but being safe.
                        // await new Promise(r => setTimeout(r, 50));
                    }

                    toast.success(`Import complete: ${successCount} imported, ${failCount} failed.`);
                    onSuccess();
                    setIsOpen(false);
                } catch (err: any) {
                    setError(`Critical Import Error: ${err.message}`);
                } finally {
                    setIsImporting(false);
                }
            },
            error: (err) => {
                setError(`CSV Read Error: ${err.message}`);
                setIsImporting(false);
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">{t("products.importCSV", "Import CSV")}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{t("products.importProducts", "Import Products")}</DialogTitle>
                    <DialogDescription>
                        Upload a CSV file with the following columns: Product Name, Category, Quantity, Purchase Price, Selling Price.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor="csv-upload">CSV File</Label>
                        <Input id="csv-upload" type="file" accept=".csv" onChange={handleFileChange} disabled={isImporting} />
                    </div>

                    {preview.length > 0 && !isImporting && (
                        <div className="rounded-md border p-2 bg-muted/50 text-xs">
                            <p className="font-semibold mb-2">Preview (First 5 rows):</p>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b">
                                            {Object.keys(preview[0]).map((h) => <th key={h} className="p-1">{h}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.map((row, i) => (
                                            <tr key={i} className="border-b last:border-0">
                                                {Object.values(row).map((v: any, j) => <td key={j} className="p-1">{v}</td>)}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {isImporting && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm">Importing... check logs below for details.</span>
                            </div>
                            <ScrollArea className="h-[200px] w-full rounded-md border p-4 bg-black/5 text-xs font-mono">
                                {logs.map((log, i) => (
                                    <div key={i}>{log}</div>
                                ))}
                            </ScrollArea>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isImporting}>
                        Cancel
                    </Button>
                    <Button onClick={processImport} disabled={!file || isImporting}>
                        {isImporting ? "Importing..." : "Start Import"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
