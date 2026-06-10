import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function OutputPanel({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="min-h-36 whitespace-pre-wrap rounded-md bg-slate-950 p-4 text-sm text-slate-100">
          {value || "No output yet."}
        </pre>
      </CardContent>
    </Card>
  );
}
