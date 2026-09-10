import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  
  // Default language is Spanish ('es') unless user has a cookie set to 'en' or 'ko'
  const rawLocale = cookieLocale || 'es';
  const locale = ['es', 'en', 'ko'].includes(rawLocale) ? rawLocale : 'es';

  let messages;
  try {
    messages = (await import(`../../messages/${locale}.json`)).default;
  } catch (error) {
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
