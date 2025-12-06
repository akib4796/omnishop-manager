import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { account, getCurrentUser, databases, DATABASE_ID, COLLECTIONS, ID, createTenant, createUserProfile, createUserRole } from "@/integrations/appwrite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Loader2, Store, MapPin, Settings2, CheckCircle2 } from "lucide-react";

export default function Setup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userFullName, setUserFullName] = useState<string>("");

  // Step 1: Business Info
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState<"retail" | "restaurant" | "pharmacy">("retail");
  const [logoUrl, setLogoUrl] = useState("");

  // Step 2: Location
  const [address, setAddress] = useState("");
  const [currency] = useState("BDT");
  const [taxRate, setTaxRate] = useState("0");

  // Step 3: Preferences
  const [defaultLanguage, setDefaultLanguage] = useState<"en" | "bn">("en");

  useEffect(() => {
    // Check if user is logged in
    getCurrentUser().then((user) => {
      if (!user) {
        navigate("/login");
      } else {
        setUserId(user.$id);
        setUserEmail(user.email || "");
        setUserFullName(user.name || "");
      }
    });
  }, [navigate]);

  const handleFinish = async () => {
    if (!userId) return;
    setLoading(true);

    try {
      // 1. Create tenant
      const { tenant, error: tenantError } = await createTenant({
        business_name: businessName,
        business_type: businessType,
        logo_url: logoUrl || undefined,
        address,
        currency,
        tax_rate: parseFloat(taxRate),
        default_language: defaultLanguage,
      });

      if (tenantError || !tenant) throw new Error(tenantError || "Failed to create tenant");

      // 2. Create profile
      const { error: profileError } = await createUserProfile({
        user_id: userId,
        tenant_id: tenant.$id,
        full_name: userFullName,
        email: userEmail,
      });

      if (profileError) throw new Error(profileError);

      // 3. Create admin role
      const { error: roleError } = await createUserRole({
        user_id: userId,
        tenant_id: tenant.$id,
        role: "admin",
      });

      if (roleError) throw new Error(roleError);

      toast.success(t("wizard.setupComplete"));
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary mb-6">
              <Store className="h-6 w-6" />
              <h3 className="text-lg font-semibold">{t("wizard.businessInfo")}</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessName">{t("wizard.businessName")} *</Label>
              <Input
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="My Store"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessType">{t("wizard.businessType")} *</Label>
              <Select value={businessType} onValueChange={(value: any) => setBusinessType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="retail">{t("wizard.retail")}</SelectItem>
                  <SelectItem value="restaurant">{t("wizard.restaurant")}</SelectItem>
                  <SelectItem value="pharmacy">{t("wizard.pharmacy")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="logoUrl">{t("wizard.uploadLogo")} (Optional)</Label>
              <Input
                id="logoUrl"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
              />
              <p className="text-xs text-muted-foreground">Enter a URL to your logo image</p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary mb-6">
              <MapPin className="h-6 w-6" />
              <h3 className="text-lg font-semibold">{t("wizard.locationInfo")}</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">{t("wizard.address")}</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main Street, Dhaka"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">{t("wizard.currency")}</Label>
              <Input id="currency" value="৳ BDT" disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxRate">{t("wizard.taxRate")}</Label>
              <Input
                id="taxRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary mb-6">
              <Settings2 className="h-6 w-6" />
              <h3 className="text-lg font-semibold">{t("wizard.preferences")}</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultLanguage">{t("wizard.defaultLanguage")}</Label>
              <Select value={defaultLanguage} onValueChange={(value: any) => setDefaultLanguage(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t("wizard.english")}</SelectItem>
                  <SelectItem value="bn">{t("wizard.bangla")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-success mb-6">
              <CheckCircle2 className="h-6 w-6" />
              <h3 className="text-lg font-semibold">{t("wizard.summary")}</h3>
            </div>

            <div className="space-y-4 bg-muted p-4 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">{t("wizard.businessName")}</p>
                <p className="font-medium">{businessName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("wizard.businessType")}</p>
                <p className="font-medium capitalize">{businessType}</p>
              </div>
              {address && (
                <div>
                  <p className="text-sm text-muted-foreground">{t("wizard.address")}</p>
                  <p className="font-medium">{address}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">{t("wizard.currency")}</p>
                <p className="font-medium">৳ BDT</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("wizard.taxRate")}</p>
                <p className="font-medium">{taxRate}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("wizard.defaultLanguage")}</p>
                <p className="font-medium">{defaultLanguage === 'en' ? 'English' : 'বাংলা'}</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              {t("wizard.reviewInfo")}
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            {t("wizard.storeSetup")}
          </CardTitle>
          <div className="flex items-center justify-center gap-2 mt-4">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-2 w-12 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"
                  }`}
              />
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-2">
            {t("wizard.step")} {step} {t("wizard.of")} 4
          </p>
        </CardHeader>
        <CardContent>
          {renderStep()}

          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                className="flex-1"
              >
                {t("wizard.previous")}
              </Button>
            )}
            {step < 4 ? (
              <Button
                onClick={() => setStep(step + 1)}
                className="flex-1"
                disabled={step === 1 && !businessName}
              >
                {t("wizard.next")}
              </Button>
            ) : (
              <Button
                onClick={handleFinish}
                className="flex-1"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("wizard.finish")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
