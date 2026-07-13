import { describe, expect, test } from "bun:test";

import { resolveWorkspaceAccess } from "./access";

describe("resolveWorkspaceAccess", () => {
  test("global admins are workspace staff without membership", () => {
    expect(resolveWorkspaceAccess("admin", null)).toEqual({ member: true, staff: true, admin: true, owner: false });
  });

  test("TAs are staff but cannot perform global-admin mutations", () => {
    expect(resolveWorkspaceAccess("student", "ta")).toEqual({ member: true, staff: true, admin: false, owner: false });
  });

  test("students are members and outsiders have no access", () => {
    expect(resolveWorkspaceAccess("student", "student")).toEqual({ member: true, staff: false, admin: false, owner: false });
    expect(resolveWorkspaceAccess("student", null)).toEqual({ member: false, staff: false, admin: false, owner: false });
  });

  test("workspace owners are full administrators even without a membership row", () => {
    expect(resolveWorkspaceAccess("student", null, true)).toEqual({ member: true, staff: true, admin: true, owner: true });
  });
});
