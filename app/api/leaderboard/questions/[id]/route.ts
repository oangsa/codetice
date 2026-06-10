import { ok } from "@/lib/api";
import { getQuestionLeaderboard } from "@/server/services/leaderboard-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const leaderboard = await getQuestionLeaderboard(id);
  return ok({ leaderboard });
}
