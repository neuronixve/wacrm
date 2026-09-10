import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const envLocale = process.env.NEXT_PUBLIC_APP_LOCALE;
  
  // Default to Spanish ('es') unless explicitly set to 'en' or other supported locale
  const rawLocale = cookieLocale || envLocale || 'es';
  const locale = ['es', 'en', 'ko'].includes(rawLocale) ? rawLocale : 'es';

  let messages;
  try {
    messages = (await import(`../../messages/${locale}.json`)).default;
  } catch (error) {
    // Fallback to Spanish
    try {
      messages = (await import(`../../messages/es.json`)).default;
    } catch {
      messages = (await import(`../../messages/en.json`)).default;
    }
  }

  return {
    locale,
    messages,
  };
});
