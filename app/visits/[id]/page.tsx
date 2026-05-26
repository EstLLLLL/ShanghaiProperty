import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function VisitDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const visit = await prisma.visit.findUnique({
    where: { id },
    include: { property: true, photos: true },
  });
  if (!visit) notFound();

  const ratings: Array<[string, number | null]> = [
    ["整体", visit.overallRating],
    ["地段", visit.locationRating],
    ["户型", visit.layoutRating],
    ["价格", visit.priceRating],
    ["物业", visit.propertyMgmtRating],
    ["销售", visit.salesAttitudeRating],
  ];

  return (
    <div className="max-w-3xl mx-auto p-6 w-full">
      <Link
        href={`/property/${visit.property.id}`}
        className="text-sm text-blue-600 hover:underline"
      >
        ← {visit.property.name}
      </Link>
      <h1 className="text-2xl font-bold mt-2">
        看楼记录 · {visit.visitedAt.toISOString().slice(0, 10)}
      </h1>

      <div className="grid grid-cols-3 gap-3 mt-6">
        {ratings.map(([label, score]) => (
          <div key={label} className="border rounded p-3 text-sm">
            <div className="text-neutral-500 text-xs">{label}</div>
            <div className="text-amber-500 mt-1">
              {score ? "★".repeat(score) + "☆".repeat(5 - score) : "—"}
            </div>
          </div>
        ))}
      </div>

      {visit.notes && (
        <section className="mt-6">
          <h2 className="font-semibold mb-2">反馈</h2>
          <p className="whitespace-pre-wrap text-sm text-neutral-800">{visit.notes}</p>
        </section>
      )}

      {visit.photos.length > 0 && (
        <section className="mt-6">
          <h2 className="font-semibold mb-2">照片</h2>
          <div className="grid grid-cols-3 gap-2">
            {visit.photos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.id} src={p.url} alt="" className="rounded w-full" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
