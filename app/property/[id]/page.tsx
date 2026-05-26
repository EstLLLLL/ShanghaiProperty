import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

function lianjiaSearchUrl(name: string) {
  return `https://sh.lianjia.com/xiaoqu/rs${encodeURIComponent(name)}/`;
}

export default async function PropertyDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      batches: { orderBy: { openDate: "desc" } },
      houseTypes: true,
      visits: {
        orderBy: { visitedAt: "desc" },
        include: { photos: true },
      },
      tags: { include: { tag: true } },
    },
  });

  if (!property) notFound();

  return (
    <div className="max-w-4xl mx-auto p-6 w-full">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{property.name}</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {property.district ?? "—"} · {property.address ?? "—"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={property.lianjiaUrl ?? lianjiaSearchUrl(property.name)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm border px-3 py-1 rounded hover:bg-neutral-50"
          >
            在链家查看 →
          </Link>
          <Link
            href={`/property/${property.id}/edit`}
            className="text-sm bg-neutral-100 px-3 py-1 rounded hover:bg-neutral-200"
          >
            编辑
          </Link>
          <Link
            href={`/visits/new?propertyId=${property.id}`}
            className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
          >
            + 新增看楼记录
          </Link>
        </div>
      </div>

      <section className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <Info label="开发商" value={property.developer} />
        <Info label="物业公司" value={property.propertyCompany} />
        <Info label="电话" value={property.phone} />
        <Info label="建成年代" value={property.yearBuilt} />
        <Info label="容积率" value={property.plotRatio} />
        <Info label="绿化率" value={property.greenRatio ? `${property.greenRatio}%` : null} />
        <Info
          label="手动录入单价"
          value={
            property.manualUnitPrice
              ? `${Math.round(property.manualUnitPrice).toLocaleString()} 元/㎡`
              : null
          }
        />
        <Info
          label="交付时间"
          value={property.deliveryDate ? property.deliveryDate.toISOString().slice(0, 10) : null}
        />
      </section>

      {property.batches.length > 0 && (
        <section className="mt-8">
          <h2 className="font-semibold text-lg mb-3">新房批次 / 备案价</h2>
          <div className="overflow-x-auto border rounded">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left">
                <tr>
                  <th className="px-3 py-2">预售证</th>
                  <th className="px-3 py-2">批次</th>
                  <th className="px-3 py-2">套数</th>
                  <th className="px-3 py-2">已售</th>
                  <th className="px-3 py-2">备案均价</th>
                  <th className="px-3 py-2">开盘</th>
                </tr>
              </thead>
              <tbody>
                {property.batches.map((b) => (
                  <tr key={b.id} className="border-t">
                    <td className="px-3 py-2">{b.presaleLicense ?? "—"}</td>
                    <td className="px-3 py-2">{b.batchName ?? "—"}</td>
                    <td className="px-3 py-2">{b.totalUnits ?? "—"}</td>
                    <td className="px-3 py-2">{b.soldUnits ?? "—"}</td>
                    <td className="px-3 py-2">
                      {b.avgPrice ? `${Math.round(b.avgPrice).toLocaleString()} 元/㎡` : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {b.openDate ? b.openDate.toISOString().slice(0, 10) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {property.houseTypes.length > 0 && (
        <section className="mt-8">
          <h2 className="font-semibold text-lg mb-3">户型</h2>
          <ul className="grid grid-cols-2 gap-2 text-sm">
            {property.houseTypes.map((h) => (
              <li key={h.id} className="border rounded px-3 py-2">
                <div>
                  {h.rooms ?? "—"} · {h.area ? `${h.area} ㎡` : "—"} · {h.orientation ?? "—"}
                </div>
                {h.totalPriceEst && (
                  <div className="text-neutral-500 text-xs mt-1">
                    总价约 {(h.totalPriceEst / 10000).toFixed(0)} 万
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-semibold text-lg mb-3">看楼记录 ({property.visits.length})</h2>
        {property.visits.length === 0 ? (
          <p className="text-sm text-neutral-500">还没记录过。</p>
        ) : (
          <ul className="space-y-3">
            {property.visits.map((v) => (
              <li key={v.id} className="border rounded p-3">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">
                    {v.visitedAt.toISOString().slice(0, 10)}
                    {v.overallRating && (
                      <span className="ml-2 text-amber-500">{"★".repeat(v.overallRating)}</span>
                    )}
                  </span>
                  <Link href={`/visits/${v.id}`} className="text-blue-600 text-xs">
                    详情 →
                  </Link>
                </div>
                {v.notes && (
                  <p className="mt-2 text-sm text-neutral-700 whitespace-pre-wrap line-clamp-4">
                    {v.notes}
                  </p>
                )}
                {v.photos.length > 0 && (
                  <div className="mt-2 flex gap-2 overflow-x-auto">
                    {v.photos.map((p) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={p.id}
                        src={p.url}
                        alt={p.caption ?? ""}
                        className="h-20 rounded object-cover"
                      />
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {property.notes && (
        <section className="mt-8">
          <h2 className="font-semibold text-lg mb-3">备注</h2>
          <p className="text-sm whitespace-pre-wrap text-neutral-700">{property.notes}</p>
        </section>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <dt className="text-neutral-500 text-xs">{label}</dt>
      <dd>{value ?? "—"}</dd>
    </div>
  );
}
