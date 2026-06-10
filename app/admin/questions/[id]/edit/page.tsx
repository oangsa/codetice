import { notFound } from "next/navigation";

import { QuestionForm } from "@/components/questions/question-form";
import { requireAdmin } from "@/lib/auth";
import { getQuestionById } from "@/server/services/question-service";

export default async function EditQuestionPage(props: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await props.params;

  const question = await getQuestionById(id);
  if (!question) {
    notFound();
  }

  return <QuestionForm mode="edit" question={question} />;
}
