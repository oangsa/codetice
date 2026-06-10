import { PageHeader } from "@/components/commons/page-header";
import { requireUser } from "@/lib/auth";
import { computeQuestionProgress, listQuestionsForUser } from "@/server/services/question-service";
import { QuestionCard } from "@/components/questions/question-card";

export default async function QuestionsPage() {
  const session = await requireUser();
  const questions = await listQuestionsForUser(session);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Problemset"
        title="Questions"
        description="Open a problem, run sample tests, and submit solutions from a contest-style workspace."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {questions.map((question) => (
          <QuestionCard
            key={question.id}
            question={question}
            progress={computeQuestionProgress(question.bestScore ?? "0", question.totalScore)}
          />
        ))}
      </div>
    </div>
  );
}
