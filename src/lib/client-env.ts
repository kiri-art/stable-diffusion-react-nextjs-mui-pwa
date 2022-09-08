const isDev =
  process.env.NODE_ENV === "development" ||
  (typeof location === "object" && !!location.href.match(/localhost/));

const REQUIRE_REGISTRATION =
  !!process.env.NEXT_PUBLIC_REQUIRE_REGISTRATION ||
  process.env.NODE_ENV === "production";

export { isDev, REQUIRE_REGISTRATION };
