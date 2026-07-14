const INVITE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const WORKSPACE_INVITE_CODE_LENGTH = 6;

export function generateWorkspaceInviteCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(WORKSPACE_INVITE_CODE_LENGTH));

  return Array.from(bytes, (byte) => INVITE_CODE_ALPHABET[byte & 31]).join("");
}
