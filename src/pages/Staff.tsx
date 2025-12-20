import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { MobileNavSheet } from "@/components/MobileNavSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Mail, RefreshCw } from "lucide-react";
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
import { useAuth } from "@/hooks/useAuth";
import { getStaffMembers, StaffMember } from "@/integrations/appwrite/staff";

export default function Staff() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { profile, isLoading: authLoading } = useAuth();
  const tenantId = profile?.tenantId;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    role: "staff",
  });

  const { data: staff, isLoading } = useQuery({
    queryKey: ["staff", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      return getStaffMembers(tenantId);
    },
    enabled: !!tenantId,
  });

  const inviteStaffMutation = useMutation({
    mutationFn: async (data: { email: string; fullName: string; role: string }) => {
      // Note: Real magic link invitations require Appwrite Functions
      // For now, showing informative message to user
      console.log("Staff invite would be sent to:", data.email);

      // Simulate success
      return new Promise((resolve) => setTimeout(resolve, 1000));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff", tenantId] });
      toast.info(t("staff.inviteNote"));
      setIsDialogOpen(false);
      setFormData({ email: "", fullName: "", role: "staff" });
    },
    onError: (error: Error) => {
      console.error("Invite error:", error);
      toast.error(t("common.error") + ": " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    inviteStaffMutation.mutate(formData);
  };

  const getRoleLabel = (role: string) => {
    const roleLabels: Record<string, string> = {
      admin: t("staff.admin"),
      manager: t("staff.manager"),
      cashier: t("staff.cashier"),
      staff: t("staff.staff"),
    };
    return roleLabels[role] || t("staff.staff");
  };

  if (authLoading || !tenantId) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="p-6 flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Mobile Header with Navigation */}
        <MobileNavSheet title={t("staff.title")} />

        <div className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <h1 className="hidden md:block text-xl md:text-3xl font-bold">{t("staff.title")}</h1>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t("staff.inviteStaff")}</span>
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : staff && staff.length > 0 ? (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {staff.map((member: StaffMember) => (
                  <div
                    key={member.$id}
                    className="bg-card border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{member.fullName || "N/A"}</h3>
                        <p className="text-sm text-muted-foreground">{member.email || "N/A"}</p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-md text-xs ${member.isActive
                          ? "bg-green-500/10 text-green-700"
                          : "bg-red-500/10 text-red-700"
                          }`}
                      >
                        {member.isActive ? t("common.active") : t("common.inactive")}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <div>
                        <span className="text-muted-foreground">{t("staff.role")}:</span>
                        <p className="capitalize">{getRoleLabel(member.role)}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-muted-foreground">{t("staff.joinedDate")}:</span>
                        <p>{member.createdAt
                          ? i18n.language === "bn"
                            ? toBengaliNumerals(
                              format(new Date(member.createdAt), "dd/MM/yyyy")
                            )
                            : format(new Date(member.createdAt), "dd/MM/yyyy")
                          : "-"}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block border rounded-lg overflow-x-auto">
                <Table className="min-w-[600px]">
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
                    {staff.map((member: StaffMember) => (
                      <TableRow key={member.$id}>
                        <TableCell className="font-medium">
                          {member.fullName || "N/A"}
                        </TableCell>
                        <TableCell>{member.email || "N/A"}</TableCell>
                        <TableCell>
                          <span className="capitalize">
                            {getRoleLabel(member.role)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {member.createdAt
                            ? i18n.language === "bn"
                              ? toBengaliNumerals(
                                format(new Date(member.createdAt), "dd/MM/yyyy")
                              )
                              : format(new Date(member.createdAt), "dd/MM/yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-md text-xs ${member.isActive
                              ? "bg-green-500/10 text-green-700"
                              : "bg-red-500/10 text-red-700"
                              }`}
                          >
                            {member.isActive ? t("common.active") : t("common.inactive")}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
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
                    <Label htmlFor="fullName">{t("common.name")}*</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) =>
                        setFormData({ ...formData, fullName: e.target.value })
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
                        <SelectItem value="cashier">{t("staff.cashier")}</SelectItem>
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
