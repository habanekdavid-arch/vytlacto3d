import { getT } from "@/lib/i18n/server";
export default async function LoadingAccount() {
  const { t } = await getT();
  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="text-sm text-neutral-500">{t("Načítavam zákaznícku zónu…")}</div>
    </div>
  );
}