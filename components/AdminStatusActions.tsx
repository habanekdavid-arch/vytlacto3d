"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminStatusActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function setStatus(next: string) {
    setLoading(true);
    setMsg(null);

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

      if (!res.ok) {
        throw new Error(`${res.status} ${data.error || "Update failed"}`);
      }

      setMsg(`✅ Status zmenený na ${next}.`);
      router.refresh(); // ✅ refresh bez F5
    } catch (e: any) {
      setMsg(`❌ ${e.message || "Chyba"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-sm text-zinc-300">Status akcie</div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Btn disabled={loading} onClick={() => setStatus("PRINTING")}>
          Začať tlač
        </Btn>
        <Btn disabled={loading} onClick={() => setStatus("DONE")}>
          Hotovo
        </Btn>
        <Btn disabled={loading} onClick={() => setStatus("CANCELED")}>
          Zrušiť
        </Btn>
      </div>

      <div className="mt-2 text-xs text-zinc-400">
        Aktuálne: <span className="text-zinc-200">{status}</span>
      </div>

      {msg ? <div className="mt-2 text-sm text-zinc-200">{msg}</div> : null}
    </div>
  );
}

function Btn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 hover:bg-white/10 disabled:opacity-60"
    >
      {children}
    </button>
  );
}