import { Card, CardContent } from "@/components/ui/card";

interface Person {
  fullName: string;
  brigadeCode: string;
}

/** Presidente electo (Art. 63) o, si hubo sucesión, presidente actual. */
export function PresidentCard({ elected, current }: { elected: Person; current: Person | null }) {
  const shown = current ?? elected;
  return (
    <Card className="border-line-strong">
      <CardContent className="py-5">
        <p className="text-sm font-semibold text-ink-600">
          {current ? "Presidente actual" : "Presidente electo de la Facultad (Art. 63)"}
        </p>
        <h3 className="mt-1 text-2xl font-bold text-ink-900">{shown.fullName}</h3>
        <p className="text-sm text-ink-700">Brigada {shown.brigadeCode}</p>
        {current && <p className="mt-2 text-sm text-ink-700">Presidente electo: {elected.fullName}</p>}
      </CardContent>
    </Card>
  );
}
