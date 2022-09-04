const REQUIRE_REGISTRATION =
  !!process.env.NEXT_PUBLIC_REQUIRE_REGISTRATION ||
  process.env.NODE_ENV === "production";

export { REQUIRE_REGISTRATION };
