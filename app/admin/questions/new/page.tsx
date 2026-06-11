import { QuestionForm } from "@/components/questions/question-form";
import { requireAdmin } from "@/lib/auth";
import { listSupportedLanguages } from "@/server/services/language-service";

export default async function NewQuestionPage() {
  await requireAdmin();
  const languages = await listSupportedLanguages();
  return <QuestionForm mode="create" languages={languages} />;
}
