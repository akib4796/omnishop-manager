import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ShieldX, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Unauthorized() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="max-w-md w-full text-center">
                <CardHeader className="space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                        <ShieldX className="h-8 w-8 text-destructive" />
                    </div>
                    <CardTitle className="text-2xl">
                        {i18n.language === "bn" ? "অনুমতি নেই" : "Access Denied"}
                    </CardTitle>
                    <CardDescription>
                        {i18n.language === "bn"
                            ? "আপনার এই পৃষ্ঠা দেখার অনুমতি নেই। আপনার প্রশাসকের সাথে যোগাযোগ করুন।"
                            : "You don't have permission to view this page. Please contact your administrator if you believe this is an error."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                        variant="outline"
                        onClick={() => navigate(-1)}
                        className="gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {i18n.language === "bn" ? "পেছনে যান" : "Go Back"}
                    </Button>
                    <Button
                        onClick={() => navigate("/dashboard")}
                        className="gap-2"
                    >
                        <Home className="h-4 w-4" />
                        {i18n.language === "bn" ? "ড্যাশবোর্ড" : "Dashboard"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
