const defaultLocale = "en-US";

interface locale {
  id: string;
  dir: string;
  language: string;
  region: string;
  label: Record<string, string>;
}

const locales: Record<string, locale> = {
  "en-US": {
    id: "en-US",
    dir: "ltr",
    language: "en",
    region: "us",
    label: {
      "en-US": "English (US)",
      "he-IL": 'אנגלית (ארה"ב)',
      "ja-JP": "英語 (米国)",
      "fa-IR": "فارسی (ایران)",
    },
  },

  "he-IL": {
    id: "he-IL",
    dir: "rtl",
    language: "he",
    region: "il",
    label: {
      "en-US": "English (US)",
      "he-IL": "עברית (ישראל)",
      "ja-JP": "ヘブライ語 (イスラエル)",
      "fa-IR": "فارسی (ایران)",
    },
  },

  "ja-JP": {
    id: "ja-JP",
    dir: "ltr",
    language: "ja",
    region: "jp",
    label: {
      "en-US": "Japanese (JP)",
      "he-IL": "יפנית (יפן)",
      "ja-JP": "日本語（日本）",
      "fa-IR": "فارسی (ایران)",
    },
  },

  "fa-IR": {
    id: "fa-IR",
    dir: "rtl",
    language: "fa",
    region: "ir",
    label: {
      "en-US": "Persian (IR)",
      "he-IL": "פרסית (איראן)",
      "ja-JP": "ペルシア語（イラン）",
      "fa-IR": "فارسی (ایران)",
    },
  },
};

const localeArray = Object.keys(locales);

export { defaultLocale, localeArray };
export default locales;
