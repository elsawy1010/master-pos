
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import { useEffect, useState } from 'react';

export function LanguageToggle() {
    const { i18n } = useTranslation();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const toggleLanguage = () => {
        const newLang = i18n.language === 'ar' ? 'en' : 'ar';
        i18n.changeLanguage(newLang);
    };

    useEffect(() => {
        if (!isMounted) return;
        document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = i18n.language;
        document.title = i18n.language === 'ar' ? 'أوردريكس - إدارة المطاعم' : 'Orderix - Restaurant Management';
    }, [i18n.language, isMounted]);

    if (!isMounted) {
        return (
            <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:bg-slate-700 hover:text-white"
            >
                <Globe className="w-5 h-5" />
                <span className="sr-only">Toggle Language</span>
            </Button>
        );
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggleLanguage}
            title={i18n.language === 'ar' ? 'Switch to English' : 'تغيير للعربية'}
            className="text-gray-400 hover:bg-slate-700 hover:text-white"
        >
            <Globe className="w-5 h-5" />
            <span className="sr-only">Toggle Language</span>
        </Button>
    );
}
