import { QuestionForm } from "@/components/questions/question-form";
import { requireAdmin } from "@/lib/auth";

export default async function NewQuestionPage() {
  await requireAdmin();
  return <QuestionForm mode="create" />;
}
