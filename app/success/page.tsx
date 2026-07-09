import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import SuccessAutoRefresh from "@/components/SuccessAutoRefresh";
import ClearCartStorage from "@/components/ClearCartStorage";

export const dynamic = "force-dynamic";

async function getVerifiedOrder(orderId?: string, sessionId?: string) {
  if (!orderId) return null;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, orderNumber: true, stripeSessionId: true },
  });

  if (!order) return null;

  // Guard against someone guessing/editing the orderId in the URL: if a
  // session_id is present it must match the order's own Stripe session.
  if (sessionId && order.stripeSessionId && order.stripeSessionId !== sessionId) {
    return null;
  }

  return order;
}

async function SuccessContent({
  searchParams,
}: {
  searchParams?: { orderId?: string; session_id?: string };
}) {
  const order = await getVerifiedOrder(searchParams?.orderId, searchParams?.session_id);

  const isPending = order?.status === "PENDING";
  const isCancelled = order?.status === "CANCELLED";
  const isConfirmed = !!order && !isPending && !isCancelled;

  return (
    <main className="min-h-screen bg-white px-6 py-16 text-neutral-900">
      <div className="mx-auto max-w-3xl rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
        {isConfirmed && (
          <>
            <ClearCartStorage />
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <h1 className="mt-6 text-3xl font-extrabold tracking-tight">
              Platba prebehla úspešne
            </h1>

            <p className="mt-4 text-base leading-relaxed text-neutral-600">
              Ďakujeme za objednávku. Vaša platba bola úspešne prijatá a objednávka
              je zaevidovaná.
            </p>

            <p className="mt-3 text-sm leading-relaxed text-neutral-500">
              Potvrdenie objednávky a ďalšie informácie sme vám poslali e-mailom.
            </p>
          </>
        )}

        {isPending && (
          <>
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#FFAE00]/15">
              <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="9" stroke="#B07A00" strokeWidth="2.2" />
                <path d="M12 7v5l3.5 2" stroke="#B07A00" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <h1 className="mt-6 text-3xl font-extrabold tracking-tight">
              Platba sa spracováva
            </h1>

            <p className="mt-4 text-base leading-relaxed text-neutral-600">
              Platbu sme prijali od Stripe, ale potvrdenie ešte len spracovávame.
              Táto stránka sa automaticky obnoví, len čo bude objednávka potvrdená —
              zvyčajne to trvá pár sekúnd.
            </p>

            <p className="mt-3 text-sm leading-relaxed text-neutral-500">
              Ak sa stav nezmení ani po chvíli, potvrdenie nájdete aj v histórii
              objednávok alebo vám príde e-mailom.
            </p>

            <SuccessAutoRefresh />
          </>
        )}

        {!order && (
          <>
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100">
              <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 8v5M12 16h.01" stroke="#525252" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="9" stroke="#525252" strokeWidth="2.2" />
              </svg>
            </div>

            <h1 className="mt-6 text-3xl font-extrabold tracking-tight">
              Objednávku sa nepodarilo overiť
            </h1>

            <p className="mt-4 text-base leading-relaxed text-neutral-600">
              Túto objednávku sme nenašli alebo sa nedá overiť z tohto odkazu.
              Ak ste práve dokončili platbu, skontrolujte si e-mail alebo históriu
              objednávok — v prípade problému nás kontaktujte.
            </p>
          </>
        )}

        {isCancelled && (
          <p className="mt-3 text-sm leading-relaxed text-red-500">
            Táto objednávka bola zrušená.
          </p>
        )}

        {order && (
          <div className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm">
            <div className="text-neutral-500">Číslo objednávky</div>
            <div className="mt-1 break-all font-mono text-neutral-900">
              {order.orderNumber}
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-2xl bg-[#FFAE00] px-5 py-3 text-sm font-semibold text-black shadow-sm hover:opacity-90"
          >
            Späť na hlavnú stránku
          </Link>

          <Link
            href="/#kalkulator"
            className="rounded-2xl border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-900 hover:bg-neutral-50"
          >
            Vytvoriť ďalšiu objednávku
          </Link>
        </div>
      </div>
    </main>
  );
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; session_id?: string }>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <Suspense fallback={<SuccessFallback />}>
      <SuccessContent searchParams={resolvedSearchParams} />
    </Suspense>
  );
}

function SuccessFallback() {
  return (
    <main className="min-h-screen bg-white px-6 py-16 text-neutral-900">
      <div className="mx-auto max-w-3xl rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="h-6 w-48 animate-pulse rounded bg-neutral-200" />
        <div className="mt-4 h-4 w-full animate-pulse rounded bg-neutral-100" />
        <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-neutral-100" />
      </div>
    </main>
  );
}
