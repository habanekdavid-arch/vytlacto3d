import { Suspense } from "react";
import Link from "next/link";

function SuccessContent({
  searchParams,
}: {
  searchParams?: { orderId?: string; session_id?: string };
}) {
  const orderId = searchParams?.orderId;
  const sessionId = searchParams?.session_id;

  return (
    <main className="min-h-screen bg-white px-6 py-16 text-neutral-900">
      <div className="mx-auto max-w-3xl rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-7 w-7"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M20 6L9 17L4 12"
              stroke="#16A34A"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1 className="mt-6 text-3xl font-extrabold tracking-tight">
          Platba prebehla úspešne
        </h1>

        <p className="mt-4 text-base leading-relaxed text-neutral-600">
          Ďakujeme za objednávku. Vašu objednávku sme prijali a budeme ju ďalej
          spracovávať. V prípade potreby vás budeme kontaktovať.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {orderId ? (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm">
              <div className="text-neutral-500">ID objednávky</div>
              <div className="mt-1 break-all font-mono text-neutral-900">
                {orderId}
              </div>
            </div>
          ) : null}

          {sessionId ? (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm">
              <div className="text-neutral-500">Stripe session</div>
              <div className="mt-1 break-all font-mono text-neutral-900">
                {sessionId}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-2xl bg-[#FFAE00] px-5 py-3 text-sm font-semibold text-black shadow-sm hover:opacity-90"
          >
            Späť na hlavnú stránku
          </Link>

          <Link
            href="/admin/orders"
            className="rounded-2xl border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-900 hover:bg-neutral-50"
          >
            Skontrolovať objednávky
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