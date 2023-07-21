// "en-IL" <-- makes this file easier to find.
import { i18n } from "@lingui/core";
import { messages as enUsMessages } from "../../locales/en-US/messages";
import { messages as heIlMessages } from "../../locales/he-IL/messages";
import { messages as jaJPMessages } from "../../locales/ja-JP/messages";
import { messages as faIRMessages } from "../../locales/fa-IR/messages";

import { I18nProvider } from "@lingui/react";

// TODO, dynamic imports for additional languages.
// But just Heb+Eng is fine to load statically.

i18n.load({
  "en-US": enUsMessages,
  "he-IL": heIlMessages,
  "ja-JP": jaJPMessages,
  "fa-IR": faIRMessages,
});

export { i18n, I18nProvider };
