import { describe, expect, test } from "bun:test";

import { Messages } from "@/lib/api.constants";
import { createAppUrl } from "@/lib/app-url";

function withAppUrlEnv(
  env: {
    APP_URL?: string;
    NEXT_PUBLIC_APP_URL?: string;
  },
  run: () => void,
) {
  const originalAppUrl = process.env.APP_URL;
  const originalPublicAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  try {
    if (env.APP_URL === undefined) {
      delete process.env.APP_URL;
    } else {
      process.env.APP_URL = env.APP_URL;
    }

    if (env.NEXT_PUBLIC_APP_URL === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = env.NEXT_PUBLIC_APP_URL;
    }

    run();
  } finally {
    if (originalAppUrl === undefined) {
      delete process.env.APP_URL;
    } else {
      process.env.APP_URL = originalAppUrl;
    }

    if (originalPublicAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = originalPublicAppUrl;
    }
  }
}

describe("createAppUrl", () => {
  test("prefers APP_URL when both app URL variables are configured", () => {
    withAppUrlEnv(
      {
        APP_URL: "https://codetice.example.com",
        NEXT_PUBLIC_APP_URL: "https://public.example.com",
      },
      () => {
        const url = createAppUrl("/reset-password");
        url.searchParams.set("token", "abc");

        expect(url.toString()).toBe("https://codetice.example.com/reset-password?token=abc");
      },
    );
  });

  test("falls back to NEXT_PUBLIC_APP_URL when APP_URL is not configured", () => {
    withAppUrlEnv(
      {
        NEXT_PUBLIC_APP_URL: "https://public.example.com",
      },
      () => {
        const url = createAppUrl("/reset-password");

        expect(url.toString()).toBe("https://public.example.com/reset-password");
      },
    );
  });

  test("rejects missing or invalid app URLs", () => {
    withAppUrlEnv({}, () => {
      expect(() => createAppUrl("/reset-password")).toThrow(Messages.unableToGenerateResetLink);
    });

    withAppUrlEnv({ APP_URL: "codetice.example.com" }, () => {
      expect(() => createAppUrl("/reset-password")).toThrow(Messages.unableToGenerateResetLink);
    });
  });
});
