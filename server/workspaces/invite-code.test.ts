import { describe, expect, test } from "bun:test";

import { generateWorkspaceInviteCode, WORKSPACE_INVITE_CODE_LENGTH } from "@/server/workspaces/invite-code";

describe("workspace invite codes", () => {
  test("generates six easy-to-type uppercase characters", () => {
    for (let index = 0; index < 100; index += 1) {
      const inviteCode = generateWorkspaceInviteCode();

      expect(inviteCode).toHaveLength(WORKSPACE_INVITE_CODE_LENGTH);
      expect(inviteCode).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
    }
  });
});
