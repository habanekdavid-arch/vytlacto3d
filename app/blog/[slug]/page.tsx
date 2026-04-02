import Image from "next/image";
export const metadata = {
  title: "Koľko stojí 3D tlač | VytlačTo3D",
  description: "Kompletný prehľad cien 3D tlače. Zistite čo ovplyvňuje cenu a koľko zaplatíte.",
};
export default function BlogDetail() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      
      <article className="prose max-w-none">

        <h1>Ako funguje 3D tlač?</h1>

        {/* OBRÁZOK */}
        <div className="my-6">
          <Image
            src="/blog/print.jpg"
            alt="3D tlač"
            width={800}
            height={500}
            className="rounded-2xl"
          />
        </div>

        <p>
          3D tlač funguje vrstvením materiálu...
        </p>

        {/* ĎALŠÍ OBRÁZOK */}
        <div className="my-6">
          <Image
            src="/blog/model.jpg"
            alt="Model"
            width={800}
            height={500}
            className="rounded-2xl"
          />
        </div>

        <p>
          Výsledkom je presný fyzický objekt...
        </p>

      </article>

    </main>
  );
}