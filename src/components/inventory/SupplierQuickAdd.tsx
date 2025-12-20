import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { createSupplier } from "@/integrations/appwrite/inventory";

export function SupplierQuickAdd() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const tenantId = profile?.tenantId;

  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
  });

  const addSupplierMutation = useMutation({
    mutationFn: async (data: { name: string; phone: string; email: string }) => {
      if (!tenantId) throw new Error("Not authenticated");

      return createSupplier({
        name: data.name,
        phone: data.phone || undefined,
        email: data.email || undefined,
        tenantId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers", tenantId] });
      toast.success(t("inventory.supplierAdded"));
      setIsOpen(false);
      setFormData({ name: "", phone: "", email: "" });
    },
    onError: (error: Error) => {
      console.error("Supplier add error:", error);
      toast.error(t("common.error") + ": " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addSupplierMutation.mutate(formData);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
      >
        <Plus className="h-4 w-4 mr-1" />
        {t("suppliers.addSupplier")}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("suppliers.addSupplier")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">{t("suppliers.supplierName")}*</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">{t("suppliers.phone")}</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="email">{t("suppliers.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit">{t("common.save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
