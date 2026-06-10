import { requireUser } from "@/lib/auth";
import { computeQuestionProgress, listQuestionsForUser } from "@/server/services/question-service";
import { QuestionCard } from "@/components/questions/question-card";

export default async function QuestionsPage() {
  const session = await requireUser();
  const questions = await listQuestionsForUser(session);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Questions</h1>
        <p className="text-sm text-slate-500">Open a problem, run sample tests, and submit your Python solution.</p>
      </div>
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
