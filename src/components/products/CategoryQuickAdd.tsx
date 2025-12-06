import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus, Loader2 } from "lucide-react";
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
import { createCategory } from "@/integrations/appwrite";

interface CategoryQuickAddProps {
  tenantId: string;
}

export function CategoryQuickAdd({ tenantId }: CategoryQuickAddProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    color: "#3B82F6",
  });

  const addCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; color: string }) => {
      if (!tenantId) throw new Error("No tenant found");

      return await createCategory({
        name: data.name,
        color: data.color,
        tenantId: tenantId,
        isActive: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success(t("products.categoryAdded"));
      setIsOpen(false);
      setFormData({ name: "", color: "#3B82F6" });
    },
    onError: (error: Error) => {
      console.error("Category add error:", error);
      toast.error(t("common.error") + ": " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Please enter a category name");
      return;
    }
    addCategoryMutation.mutate(formData);
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
        {t("categories.addCategory")}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("categories.addCategory")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">{t("categories.categoryName")}*</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter category name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="color">{t("categories.color")}</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="w-16 h-10 p-1"
                  />
                  <span className="text-sm text-muted-foreground">
                    {formData.color}
                  </span>
                </div>
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
              <Button
                type="submit"
                disabled={addCategoryMutation.isPending}
              >
                {addCategoryMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  t("common.save")
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
