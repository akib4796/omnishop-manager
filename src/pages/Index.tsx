import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getCurrentUser } from "@/integrations/appwrite";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Store, Sparkles, Shield, Globe } from "lucide-react";

const Index = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    getCurrentUser().then((user) => {
      if (user) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  const features = [
    {
      icon: Store,
      title: t("landing.completePOS"),
      description: t("landing.completePOSDesc"),
    },
    {
      icon: Sparkles,
      title: t("landing.multiTenant"),
      description: t("landing.multiTenantDesc"),
    },
    {
      icon: Shield,
      title: t("landing.secureReliable"),
      description: t("landing.secureReliableDesc"),
    },
    {
      icon: Globe,
      title: t("landing.bilingualSupport"),
      description: t("landing.bilingualSupportDesc"),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {t("landing.title")}
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            {t("landing.subtitle")}
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/signup")}>
              {t("auth.signup")}
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/login")}>
              {t("auth.login")}
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="border-2">
                <CardHeader>
                  <Icon className="h-10 w-10 text-primary mb-2" />
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Index;
