import { describe, expect, test } from "bun:test";

import { resolveWorkspaceAccess } from "./access";

describe("resolveWorkspaceAccess", () => {
  test("global admins are workspace staff without membership", () => {
    expect(resolveWorkspaceAccess("admin", null)).toEqual({ member: true, staff: true, admin: true });
  });

  test("TAs are staff but cannot perform global-admin mutations", () => {
    expect(resolveWorkspaceAccess("student", "ta")).toEqual({ member: true, staff: true, admin: false });
  });

  test("students are members and outsiders have no access", () => {
    expect(resolveWorkspaceAccess("student", "student")).toEqual({ member: true, staff: false, admin: false });
    expect(resolveWorkspaceAccess("student", null)).toEqual({ member: false, staff: false, admin: false });
  });
});
