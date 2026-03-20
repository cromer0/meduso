export const translations = {
  en: {
    hero: {
      title: "Meduso Store",
      subtitle: "The future of e-commerce, powered by Medusa v2",
      cta: "Shop now",
    },
    nav: {
      store: "Store",
      search: "Search",
      account: "Account",
      cart: "Cart",
    },
    common: {
      loading: "Loading...",
      error: "An error occurred",
    },
  },
  es: {
    hero: {
      title: "Meduso Store",
      subtitle: "El futuro del comercio electrónico, con Medusa v2",
      cta: "Comprar ahora",
    },
    nav: {
      store: "Tienda",
      search: "Buscar",
      account: "Mi Cuenta",
      cart: "Carrito",
    },
    common: {
      loading: "Cargando...",
      error: "Ha ocurrido un error",
    },
  },
} as const

export type TranslationKeys = typeof translations
export type Locale = keyof TranslationKeys

export const getTranslations = (locale: string | null): TranslationKeys[Locale] => {
  const lang = locale?.startsWith("es") ? "es" : "en"
  return translations[lang]
}
