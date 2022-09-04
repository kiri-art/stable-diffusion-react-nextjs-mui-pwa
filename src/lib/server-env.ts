const REQUIRE_REGISTRATION =
  !!process.env.REQUIRE_REGISTRATION || process.env.NODE_ENV === "production";

export { REQUIRE_REGISTRATION };
