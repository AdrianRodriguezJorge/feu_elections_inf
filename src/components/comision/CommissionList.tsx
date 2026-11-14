import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { officeLabel } from "@/lib/status-labels";

export interface CommissionMemberInfo {
  ci: string;
  name: string;
  office: string;
  brigadeCode: string;
}

/** Miembros de la Comisión Electoral (Art. 47). */
export function CommissionList({ commission }: { commission: CommissionMemberInfo[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Comisión Electoral (Art. 47)</CardTitle>
        <CardDescription>Autoridades electorales de la Facultad</CardDescription>
      </CardHeader>
      <CardContent className="py-2">
        {commission.length === 0 ? (
          <p className="py-2 text-sm text-ink-700">La Comisión Electoral aún no está registrada.</p>
        ) : (
          <ul className="divide-y divide-line">
            {commission.map((member, i) => (
              <li key={`${member.office}-${member.name}-${i}`} className="flex items-center justify-between gap-2 py-2 text-sm">
                <div>
                  <p className="font-semibold text-ink-900">{member.name}</p>
                  <p className="text-xs text-ink-600">Brigada {member.brigadeCode}</p>
                </div>
                <Badge>{officeLabel(member.office)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
