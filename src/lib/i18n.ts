export type Locale = "en" | "th";

export type RouteSearchParams = Promise<{
  [key: string]: string | string[] | undefined;
}>;

export const locales: Locale[] = ["en", "th"];

export const getLocale = (value: string | string[] | undefined): Locale => {
  const lang = Array.isArray(value) ? value[0] : value;

  return lang === "th" ? "th" : "en";
};

export const withLocale = (href: string, locale: Locale) =>
  `${href}?lang=${locale}`;
