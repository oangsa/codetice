import { notFound, redirect } from "next/navigation";

import { QuestionForm } from "@/components/questions/question-form";
import { requireUser } from "@/lib/auth";
import { canUserEditQuestion, getQuestionById } from "@/server/services/question-service";
import { listSupportedLanguages } from "@/server/services/language-service";

export default async function EditQuestionPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ classroomId?: string; backUrl?: string }>;
}) {
  const session = await requireUser();
  const { id } = await props.params;
  const { classroomId, backUrl } = await props.searchParams;

  const [question, languages] = await Promise.all([
    getQuestionById(id),
    listSupportedLanguages(),
  ]);

  if (!question) {
    notFound();
  }

  if (!canUserEditQuestion(session, question)) {
    redirect("/classrooms");
  }

  return (
    <QuestionForm
      mode="edit"
      question={question}
      languages={languages}
      classroomId={classroomId}
      backUrl={backUrl}
    />
  );
}
