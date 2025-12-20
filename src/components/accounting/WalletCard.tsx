import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon, Wallet, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface WalletCardProps {
    title: string;
    balance: number;
    currency?: string;
    icon?: LucideIcon;
    trend?: number; // percentage change
    className?: string;
    onClick?: () => void;
}

export function WalletCard({
    title,
    balance,
    currency = "$",
    icon: Icon = Wallet,
    trend,
    className,
    onClick
}: WalletCardProps) {
    return (
        <Card
            className={cn("cursor-pointer hover:bg-accent/50 transition-colors", className)}
            onClick={onClick}
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    {title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                    {currency}{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                {trend !== undefined && (
                    <p className={cn("text-xs flex items-center mt-1",
                        trend >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                        {trend >= 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                        {Math.abs(trend)}% from last month
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
