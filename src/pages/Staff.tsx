import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Mail } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { toBengaliNumerals } from "@/lib/i18n-utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Staff() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    role: "staff",
  });

  const { data: staff, isLoading } = useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
      const { data: profile } = await supabase.auth.getUser();
      const { data: tenant } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", profile.user?.id)
        .single();

      const { data, error } = await supabase
        .from("profiles")
        .select("*, user_roles(role)")
        .eq("tenant_id", tenant?.tenant_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const inviteStaffMutation = useMutation({
    mutationFn: async (data: { email: string; full_name: string; role: string }) => {
      // In a real app, this would send a magic link invitation
      // For now, we'll show a success message
      console.log("Inviting staff:", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast.success(t("staff.inviteSent"));
      setIsDialogOpen(false);
      setFormData({ email: "", full_name: "", role: "staff" });
    },
    onError: () => {
      toast.error(t("common.error"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    inviteStaffMutation.mutate(formData);
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">{t("staff.title")}</h1>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t("staff.inviteStaff")}
            </Button>
          </div>

          {isLoading ? (
            <p>{t("common.loading")}</p>
          ) : staff && staff.length > 0 ? (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.name")}</TableHead>
                    <TableHead>{t("staff.email")}</TableHead>
                    <TableHead>{t("staff.role")}</TableHead>
                    <TableHead>{t("staff.joinedDate")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.full_name || "N/A"}
                      </TableCell>
                      <TableCell>{member.email || "N/A"}</TableCell>
                      <TableCell>
                        <span className="capitalize">
                          {Array.isArray(member.user_roles) && member.user_roles.length > 0
                            ? t(`staff.${(member.user_roles[0] as any).role}`)
                            : t("staff.staff")}
                        </span>
                      </TableCell>
                      <TableCell>
                        {i18n.language === "bn"
                          ? toBengaliNumerals(
                              format(new Date(member.created_at), "dd/MM/yyyy")
                            )
                          : format(new Date(member.created_at), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-green-500/10 text-green-700 rounded-md text-xs">
                          {t("common.active")}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              {t("staff.noStaff")}
            </div>
          )}

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("staff.inviteStaff")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="full_name">{t("common.name")}*</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) =>
                        setFormData({ ...formData, full_name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">{t("staff.email")}*</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">{t("staff.role")}*</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value) =>
                        setFormData({ ...formData, role: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">{t("staff.admin")}</SelectItem>
                        <SelectItem value="manager">{t("staff.manager")}</SelectItem>
                        <SelectItem value="staff">{t("staff.staff")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {t("staff.inviteDescription")}
                  </p>
                </div>
                <DialogFooter className="mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit">{t("staff.sendInvite")}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
