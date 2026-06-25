"use client";

import { CartItem } from "@/lib/types";
import { addVat, formatEur } from "@/lib/vat";

type Props = {
  items: CartItem[];
  activeItemId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onAddNew: () => void;
};

export default function CartSidebar({ items, activeItemId, onSelect, onRemove, onAddNew }: Props) {
  const totalNet = items.reduce((s, i) => s + (i.pricing?.total ?? 0), 0);
  const allPriced = items.length > 0 && items.every((i) => i.pricing !== null);

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
        <div className="text-sm font-extrabold text-neutral-800">
          Košík{" "}
          <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#FFAE00] text-xs font-bold text-black">
            {items.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onAddNew}
          className="flex items-center gap-1.5 rounded-xl bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-[#FFAE00] hover:text-black"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="5" y1="1" x2="5" y2="9" />
            <line x1="1" y1="5" x2="9" y2="5" />
          </svg>
          Pridať model
        </button>
      </div>

      {items.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-neutral-400">
          Žiadne modely v košíku.
          <br />
          Nahrajte STL súbor.
        </div>
      ) : (
        <div className="divide-y divide-neutral-100">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className={[
                "px-4 py-3 cursor-pointer transition-colors",
                activeItemId === item.id ? "bg-[#FFAE00]/10" : "hover:bg-neutral-50",
              ].join(" ")}
              onClick={() => onSelect(item.id)}
            >
              <div className="flex items-center gap-2">
                <div
                  className={[
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    activeItemId === item.id
                      ? "bg-[#FFAE00] text-black"
                      : "bg-neutral-200 text-neutral-600",
                  ].join(" ")}
                >
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-xs font-semibold text-neutral-900">{item.fileName}</div>
                  <div className="text-[11px] text-neutral-500">
                    {item.config.material} · {item.config.quality} · {item.config.quantity}ks
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {item.pricing ? (
                    <div className="text-xs font-bold text-neutral-900">
                      {formatEur(addVat(item.pricing.total))}
                    </div>
                  ) : (
                    <div className="h-3 w-12 animate-pulse rounded-full bg-neutral-200" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(item.id);
                  }}
                  className="ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-neutral-400 transition hover:bg-red-50 hover:text-red-500"
                  title="Odstrániť"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {allPriced && (
        <div className="border-t border-neutral-100 px-5 py-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">Výroba celkom (s DPH)</span>
            <span className="font-extrabold text-neutral-900">{formatEur(addVat(totalNet))}</span>
          </div>
        </div>
      )}
    </div>
  );
}
