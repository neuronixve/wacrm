'use client';

import React, { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

const LANGUAGES = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
];

export function LanguageSwitcher() {
  const [currentLocale, setCurrentLocale] = useState('es');

  useEffect(() => {
    // Read NEXT_LOCALE from document.cookie
    const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
    if (match && match[1]) {
      setCurrentLocale(match[1]);
    } else {
      setCurrentLocale('es');
    }
  }, []);

  const changeLanguage = (newLocale: string) => {
    if (newLocale === currentLocale) return;
    // Set cookie for 1 year
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    setCurrentLocale(newLocale);
    window.location.reload();
  };

  const activeLang = LANGUAGES.find((l) => l.code === currentLocale) || LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Seleccionar idioma"
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card/60 px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors focus:outline-none data-[popup-open]:bg-muted"
      >
        <span className="text-sm">{activeLang.flag}</span>
        <span className="uppercase font-semibold tracking-wider text-[11px]">{activeLang.code}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={`flex items-center gap-2 cursor-pointer ${
              lang.code === currentLocale ? 'font-semibold text-primary' : ''
            }`}
          >
            <span>{lang.flag}</span>
            <span>{lang.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
