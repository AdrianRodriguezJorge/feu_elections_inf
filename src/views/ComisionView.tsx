"use client";

import { AdminPanel } from "@/components/AdminPanel";
import { useElection } from "@/components/ElectionProvider";
import { ElectionGate } from "./ElectionGate";

export function ComisionView() {
  const { user, reload } = useElection();
  return (
    <ElectionGate>
      {(d) => (
        <AdminPanel
          summary={d.summary}
          quorum={d.quorum}
          candidates={d.candidates}
          commission={d.commission}
          onRefresh={reload}
          role={user.role}
        />
      )}
    </ElectionGate>
  );
}
