import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";

const posts: Record<
  string,
  {
    title: string;
    category: string;
    content: string[];
  }
> = {
  "ako-pripravit-stl-subor-na-3d-tlac": {
    title: "Ako pripraviť STL súbor na 3D tlač",
    category: "Príprava modelu",
    content: [
      "Pred odoslaním modelu na 3D tlač je dôležité skontrolovať, či je model uzavretý, nemá diery a obsahuje korektnú geometriu.",
      "Odporúča sa exportovať model v správnej mierke a ešte pred nahratím si overiť rozmery modelu v milimetroch.",
      "Pri funkčných dieloch myslite aj na tolerancie, hrúbky stien a orientáciu modelu pri tlači.",
    ],
  },
  "aky-material-zvolit-na-3d-tlac": {
    title: "Aký materiál zvoliť na 3D tlač?",
    category: "Materiály",
    content: [
      "PLA je vhodné na prototypy, dekoračné modely a bežné použitie. Je ľahko tlačiteľné a cenovo dostupné.",
      "PETG je odolnejší a vhodný tam, kde je potrebná vyššia pevnosť a lepšia tepelná alebo mechanická odolnosť.",
      "ABS sa hodí na technickejšie použitie, ale vyžaduje presnejšie podmienky tlače. TPU je flexibilný materiál vhodný na mäkké a ohybné diely.",
    ],
  },
  "ako-funguje-kalkulacia-ceny-3d-tlace": {
    title: "Ako funguje kalkulácia ceny 3D tlače",
    category: "Cenník",
    content: [
      "Cena tlače závisí najmä od objemu modelu, zvoleného materiálu, kvality tlače, percenta výplne a počtu kusov.",
      "Pri väčšom množstve kusov môže byť výsledná cena nižšia vďaka množstevnej zľave.",
      "Do ceny vstupuje aj základ za spracovanie modelu, prípravu výroby a reálny čas tlače.",
    ],
  },
};

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = posts[slug];

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <Navbar />

      <main className="mx-auto max-w-3xl px-6 pb-20 pt-10">
        <Link
          href="/blog"
          className="text-sm font-medium text-neutral-600 underline underline-offset-4"
        >
          ← Späť na blog
        </Link>

        <div className="mt-6 inline-flex rounded-full bg-[#FFAE00]/15 px-3 py-1 text-xs font-semibold text-neutral-800">
          {post.category}
        </div>

        <h1 className="mt-4 text-4xl font-extrabold tracking-tight">
          {post.title}
        </h1>

        <div className="mt-8 space-y-5 text-base leading-relaxed text-neutral-700">
          {post.content.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </main>
    </div>
  );
}