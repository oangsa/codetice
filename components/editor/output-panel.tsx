import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function OutputPanel({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="border-b border-slate-100 pb-4">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <pre className="min-h-36 whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
          {value || "No output yet."}
        </pre>
      </CardContent>
    </Card>
  );
}
