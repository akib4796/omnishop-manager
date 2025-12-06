import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { isSysAdmin } from "@/integrations/appwrite/sysadmin";
import { Loader2 } from "lucide-react";

interface SysAdminProtectedRouteProps {
    children: React.ReactNode;
}

export function SysAdminProtectedRoute({ children }: SysAdminProtectedRouteProps) {
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const checkSysAdmin = async () => {
            try {
                const adminStatus = await isSysAdmin();
                setIsAdmin(adminStatus);
            } catch {
                setIsAdmin(false);
            } finally {
                setLoading(false);
            }
        };

        checkSysAdmin();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isAdmin) {
        return <Navigate to="/sysadmin/login" replace />;
    }

    return <>{children}</>;
}
