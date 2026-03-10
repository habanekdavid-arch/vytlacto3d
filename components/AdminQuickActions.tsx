"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminQuickActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function setStatus(next: string, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": (process.env.NEXT_PUBLIC_ADMIN_KEY as string) || "",
        },
        body: JSON.stringify({ status: next }),
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: text };
      }

      if (!res.ok) throw new Error(data.error || "Update failed");

      router.refresh();
    } catch (e: any) {
      alert(`Chyba: ${e?.message || "Update failed"}`);
    } finally {
      setLoading(false);
    }
  }

  // UX: nedáva zmysel ponúkať DONE ak už je DONE atď.
  const disabledAll = loading;
  const isDone = status === "DONE";
  const isCanceled = status === "CANCELED";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Btn
        disabled={disabledAll || isDone || isCanceled}
        onClick={() => setStatus("PRINTING")}
      >
        PRINTING
      </Btn>

      <Btn
        disabled={disabledAll || isDone || isCanceled}
        onClick={() => setStatus("DONE", "Naozaj označiť ako DONE?")}
        variant="ok"
      >
        DONE
      </Btn>

      <Btn
        disabled={disabledAll || isCanceled || isDone}
        onClick={() => setStatus("CANCELED", "Naozaj zrušiť objednávku?")}
        variant="danger"
      >
        CANCEL
      </Btn>
    </div>
  );
}

function Btn({
  children,
  onClick,
  disabled,
  variant,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "ok" | "danger";
}) {
  const base =
    "rounded-lg border px-2 py-1 text-xs font-medium hover:bg-white/10 disabled:opacity-50 disabled:hover:bg-transparent";
  const normal = "border-white/10 bg-white/5 text-zinc-200";
  const ok = "border-green-500/30 bg-green-500/15 text-green-200";
  const danger = "border-red-500/30 bg-red-500/15 text-red-200";

  const cls =
    base +
    " " +
    (variant === "ok" ? ok : variant === "danger" ? danger : normal);

  return (
    <button disabled={disabled} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}