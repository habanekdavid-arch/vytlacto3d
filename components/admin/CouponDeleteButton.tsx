"use client";

import { useRouter } from "next/navigation";

export default function CouponDeleteButton({ code }: { code: string }) {
  const router = useRouter();
  async function remove() {
    if (!window.confirm(`Zrušiť kupón ${code}? Potom sa už nebude dať použiť.`)) return;
    const res = await fetch(`/api/admin/coupons?code=${encodeURIComponent(code)}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) alert(data.error || "Kupón sa nepodarilo zrušiť.");
    router.refresh();
  }
  return (
    <button type="button" onClick={remove} className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
      Zrušiť
    </button>
  );
}
