import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

function isObject(item: any): boolean {
  return Boolean(item && typeof item === 'object' && !Array.isArray(item));
}

function deepMerge(target: any, source: any): any {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          output[key] = source[key];
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        output[key] = source[key];
      }
    });
  }
  return output;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  
  // Default language is Spanish ('es') unless user has a cookie set to 'en' or 'ko'
  const rawLocale = cookieLocale || 'es';
  const locale = ['es', 'en', 'ko'].includes(rawLocale) ? rawLocale : 'es';

  // Always load English as the fallback base so missing keys never display raw strings
  const enMessages = (await import('../../messages/en.json')).default;

  let messages = enMessages;
  if (locale !== 'en') {
    try {
      const localeMessages = (await import(`../../messages/${locale}.json`)).default;
      messages = deepMerge(enMessages, localeMessages);
    } catch {
      messages = enMessages;
    }
  }

  return {
    locale,
    messages,
  };
});

