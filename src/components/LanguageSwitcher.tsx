import { useEffect } from "react";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  // Apply font on mount based on current language
  useEffect(() => {
    const currentLang = i18n.language || localStorage.getItem('i18nextLng') || 'en';
    applyFontClass(currentLang);
  }, []);

  const applyFontClass = (lng: string) => {
    if (lng === 'bn') {
      document.body.classList.add('font-bengali');
      document.body.classList.remove('font-sans');
    } else {
      document.body.classList.add('font-sans');
      document.body.classList.remove('font-bengali');
    }
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
    applyFontClass(lng);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Globe className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => changeLanguage('en')}>
          English
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => changeLanguage('bn')}>
          বাংলা (Bangla)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
