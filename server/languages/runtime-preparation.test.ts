import { describe, expect, test } from "bun:test";

import { prepareLanguageRuntime } from "./runtime-preparation";

describe("prepareLanguageRuntime", () => {
  test("prepares the selected image and marks that exact runtime ready", async () => {
    const calls: string[] = [];
    const result = await prepareLanguageRuntime(
      { id: "language-id", dockerImage: "python:3.12-alpine" },
      {
        prepareImage: async (image) => {
          calls.push(`prepare:${image}`);
          return { image, output: "pulled", pulled: true };
        },
        markReady: async (id, image) => {
          calls.push(`ready:${id}:${image}`);
        },
        markError: async () => {
          calls.push("unexpected-error");
        },
      },
    );

    expect(result.pulled).toBe(true);
    expect(calls).toEqual([
      "prepare:python:3.12-alpine",
      "ready:language-id:python:3.12-alpine",
    ]);
  });

  test("records image preparation errors and preserves the failure", async () => {
    const calls: string[] = [];
    const failure = new Error("pull failed");

    await expect(prepareLanguageRuntime(
      { id: "language-id", dockerImage: "gcc:13" },
      {
        prepareImage: async () => {
          calls.push("prepare");
          throw failure;
        },
        markReady: async () => {
          calls.push("unexpected-ready");
        },
        markError: async (id, image, message) => {
          calls.push(`error:${id}:${image}:${message}`);
        },
      },
    )).rejects.toBe(failure);

    expect(calls).toEqual([
      "prepare",
      "error:language-id:gcc:13:pull failed",
    ]);
  });
});
