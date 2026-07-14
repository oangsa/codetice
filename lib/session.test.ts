import { expect, test } from "bun:test";

import { LEGACY_SESSION_COOKIES, SESSION_COOKIE } from "@/modules/auth/constants";

test("issues sessions under the Codetice-specific production cookie name", () => {
  expect(SESSION_COOKIE).toBe("codetice_session");
  expect(LEGACY_SESSION_COOKIES).toContain("vibe_grader_session");
});
