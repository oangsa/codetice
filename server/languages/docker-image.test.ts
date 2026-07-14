import { describe, expect, test } from "bun:test";

import {
  buildDockerImageInspectArgs,
  buildDockerPullArgs,
  validateDockerImage,
} from "@/server/languages/docker-image";

describe("docker image helpers", () => {
  test("accepts normal image references", () => {
    expect(() => validateDockerImage("python:3.12-alpine")).not.toThrow();
    expect(() => validateDockerImage("oven/bun:1-alpine")).not.toThrow();
    expect(() => validateDockerImage("registry.example.com/team/runtime:2026.06")).not.toThrow();
    expect(() => validateDockerImage("registry.example.com:5000/team/runtime@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")).not.toThrow();
  });

  test("rejects shell-like image references", () => {
    expect(() => validateDockerImage("python:3.12-alpine; rm -rf /")).toThrow();
    expect(() => validateDockerImage("python:3.12-alpine && whoami")).toThrow();
    expect(() => validateDockerImage("python:3.12 alpine")).toThrow();
    expect(() => validateDockerImage("--privileged")).toThrow();
    expect(() => validateDockerImage("python:")).toThrow();
    expect(() => validateDockerImage("python@sha256:abcd")).toThrow();
  });

  test("builds inspect args without shell concatenation", () => {
    expect(buildDockerImageInspectArgs("python:3.12-alpine")).toEqual([
      "image",
      "inspect",
      "python:3.12-alpine",
    ]);
  });

  test("builds pull args without shell concatenation", () => {
    expect(buildDockerPullArgs("python:3.12-alpine")).toEqual([
      "pull",
      "python:3.12-alpine",
    ]);
  });
});
