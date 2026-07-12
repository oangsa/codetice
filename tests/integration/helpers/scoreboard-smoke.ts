import { closeDb } from "@/lib/db";
import { getWorkspaceScoreboardPage } from "@/server/scoreboard/service";

const [workspaceId, userId] = process.argv.slice(2);

if (!workspaceId || !userId) {
  throw new Error("workspace and user IDs are required");
}

try {
  const page = await getWorkspaceScoreboardPage({
    actor: { userId, role: "student" },
    workspaceId,
    limit: 25,
    cursor: null,
  });
  process.stdout.write(JSON.stringify(page));
} finally {
  await closeDb();
}
