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
    },
  },

  "he-IL": {
    id: "he-IL",
    dir: "rtl",
    language: "he",
    region: "il",
    label: {
      "en-US": "English (US)",
      "he-IL": "ישראל (עברית)",
    },
  },
};

export { defaultLocale };
export default locales;
