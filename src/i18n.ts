import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

export const supportedLanguages = [
  { code: 'ka', label: 'KA', name: 'ქართული' },
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'ru', label: 'RU', name: 'Русский' },
  { code: 'hy', label: 'HY', name: 'Հայերեն' },
] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number]['code'];

const resources = {
  ka: {
    translation: {
      navbar: {
        menu: 'მენიუ',
        anatomy: 'ანატომია',
        reviews: 'შეფასებები',
        banking: 'ანგარიშები',
        admin: 'ადმინ პანელი',
        adminShort: 'ადმინი',
        profile: 'პროფილი / Profile',
        signIn: 'შესვლა / Sign In',
        cart: 'კალათა',
        backToSite: 'საიტზე დაბრუნება',
        navigation: 'ნავიგაცია',
        premiumQuality: 'Premium Quality',
        language: 'ენა',
      },
      hero: {
        title: 'პრემიუმ შაურმა თბილისში',
        subtitle: 'ცეცხლზე შემწვარი გემო, სწრაფი მიწოდება და დახვეწილი ონლაინ შეკვეთა.',
        cta: 'მენიუს ნახვა',
      },
      cart: {
        title: 'შენი კალათა',
        empty: 'კალათა ცარიელია',
        deliveryDetails: 'მიწოდების დეტალები',
        paymentMethod: 'გადახდის მეთოდი',
        onlineCard: 'ონლაინ ბარათი',
        cashCourier: 'ნაღდი ფულით გადახდა',
        checkout: 'შეკვეთის გაფორმება',
      },
      menu: {
        categories: {
          all: 'ყველა',
          special: 'საფირმო',
          classic: 'კლასიკური',
          combos: 'კომბოები',
          drinks: 'სასმელები',
          sides: 'გარნირი',
        },
      },
      profile: {
        title: 'პროფილი',
        edit: 'პროფილის შეცვლა',
        save: 'შენახვა',
        signOut: 'გამოსვლა',
        savedCards: 'შენახული ბარათები',
        recentOrders: 'ბოლო შეკვეთები',
      },
    },
  },
  en: {
    translation: {
      navbar: {
        menu: 'Menu',
        anatomy: 'Anatomy',
        reviews: 'Reviews',
        banking: 'Banking',
        admin: 'Admin Panel',
        adminShort: 'Admin',
        profile: 'Profile',
        signIn: 'Sign In',
        cart: 'Cart',
        backToSite: 'Back to site',
        navigation: 'Navigation',
        premiumQuality: 'Premium Quality',
        language: 'Language',
      },
      hero: {
        title: 'Premium Shaurma in Tbilisi',
        subtitle: 'Fire-grilled flavor, fast delivery, and a polished online ordering experience.',
        cta: 'View menu',
      },
      cart: {
        title: 'Your Cart',
        empty: 'Your cart is empty',
        deliveryDetails: 'Delivery details',
        paymentMethod: 'Payment method',
        onlineCard: 'Online card',
        cashCourier: 'Cash to courier',
        checkout: 'Place order',
      },
      menu: {
        categories: {
          all: 'All',
          special: 'Signature',
          classic: 'Classic',
          combos: 'Combos',
          drinks: 'Drinks',
          sides: 'Sides',
        },
      },
      profile: {
        title: 'Profile',
        edit: 'Edit profile',
        save: 'Save changes',
        signOut: 'Sign out',
        savedCards: 'Saved cards',
        recentOrders: 'Recent orders',
      },
    },
  },
  ru: {
    translation: {
      navbar: {
        menu: 'Меню',
        anatomy: 'Анатомия',
        reviews: 'Отзывы',
        banking: 'Счета',
        admin: 'Админ-панель',
        adminShort: 'Админ',
        profile: 'Профиль',
        signIn: 'Войти',
        cart: 'Корзина',
        backToSite: 'Вернуться на сайт',
        navigation: 'Навигация',
        premiumQuality: 'Премиум качество',
        language: 'Язык',
      },
      hero: {
        title: 'Премиальная шаурма в Тбилиси',
        subtitle: 'Гриль-вкус, быстрая доставка и удобный онлайн-заказ.',
        cta: 'Смотреть меню',
      },
      cart: {
        title: 'Ваша корзина',
        empty: 'Корзина пуста',
        deliveryDetails: 'Детали доставки',
        paymentMethod: 'Способ оплаты',
        onlineCard: 'Онлайн-карта',
        cashCourier: 'Наличными курьеру',
        checkout: 'Оформить заказ',
      },
      menu: {
        categories: {
          all: 'Все',
          special: 'Фирменные',
          classic: 'Классические',
          combos: 'Комбо',
          drinks: 'Напитки',
          sides: 'Гарниры',
        },
      },
      profile: {
        title: 'Профиль',
        edit: 'Редактировать профиль',
        save: 'Сохранить',
        signOut: 'Выйти',
        savedCards: 'Сохраненные карты',
        recentOrders: 'Последние заказы',
      },
    },
  },
  hy: {
    translation: {
      navbar: {
        menu: 'Մենյու',
        anatomy: 'Անատոմիա',
        reviews: 'Կարծիքներ',
        banking: 'Հաշիվներ',
        admin: 'Ադմին վահանակ',
        adminShort: 'Ադմին',
        profile: 'Պրոֆիլ',
        signIn: 'Մուտք',
        cart: 'Զամբյուղ',
        backToSite: 'Վերադառնալ կայք',
        navigation: 'Նավիգացիա',
        premiumQuality: 'Պրեմիում որակ',
        language: 'Լեզու',
      },
      hero: {
        title: 'Պրեմիում շաուրմա Թբիլիսիում',
        subtitle: 'Կրակով պատրաստված համ, արագ առաքում և հարմար առցանց պատվեր։',
        cta: 'Տեսնել մենյուն',
      },
      cart: {
        title: 'Ձեր զամբյուղը',
        empty: 'Զամբյուղը դատարկ է',
        deliveryDetails: 'Առաքման տվյալներ',
        paymentMethod: 'Վճարման եղանակ',
        onlineCard: 'Առցանց քարտ',
        cashCourier: 'Կանխիկ առաքիչին',
        checkout: 'Պատվիրել',
      },
      menu: {
        categories: {
          all: 'Բոլորը',
          special: 'Ֆիրմային',
          classic: 'Դասական',
          combos: 'Կոմբոներ',
          drinks: 'Ըմպելիքներ',
          sides: 'Խավարտներ',
        },
      },
      profile: {
        title: 'Պրոֆիլ',
        edit: 'Խմբագրել պրոֆիլը',
        save: 'Պահպանել',
        signOut: 'Դուրս գալ',
        savedCards: 'Պահված քարտեր',
        recentOrders: 'Վերջին պատվերներ',
      },
    },
  },
};

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ka',
    supportedLngs: supportedLanguages.map((language) => language.code),
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

export default i18n;
