import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toBengaliNumerals } from "@/lib/i18n-utils";

interface SuccessScreenProps {
  open: boolean;
  onClose: () => void;
  total: number;
}

export function SuccessScreen({ open, onClose, total }: SuccessScreenProps) {
  const { i18n } = useTranslation();

  const formatPrice = (price: number) => {
    const formatted = price.toFixed(0);
    return i18n.language === "bn" ? `৳${toBengaliNumerals(formatted)}` : `৳${formatted}`;
  };

  useEffect(() => {
    if (open) {
      // Vibrate on mobile devices
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
      
      // Auto-close after 3 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [open, onClose]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-0 border-0 bg-success">
        <div className="flex flex-col items-center justify-center p-12 text-white space-y-6">
          <div className="h-24 w-24 rounded-full bg-white/20 flex items-center justify-center animate-bounce">
            <Check className="h-16 w-16" />
          </div>
          
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold">
              {i18n.language === "bn" ? "পেমেন্ট সফল!" : "Payment Successful!"}
            </h2>
            <p className="text-xl opacity-90">
              {formatPrice(total)}
            </p>
          </div>
          
          <div className="text-2xl">
            {i18n.language === "bn" ? "ধন্যবাদ ❤️" : "Thank You ❤️"}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
