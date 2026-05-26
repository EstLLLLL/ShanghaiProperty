import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function VisitsPage() {
  const visits = await prisma.visit.findMany({
    orderBy: { visitedAt: "desc" },
    include: {
      property: { select: { id: true, name: true, district: true } },
      photos: true,
    },
  });

  return (
    <div className="max-w-4xl mx-auto p-6 w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">看楼记录</h1>
        <Link
          href="/visits/new"
          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
        >
          + 新增看楼记录
        </Link>
      </div>

      {visits.length === 0 ? (
        <p className="mt-12 text-center text-neutral-500">
          还没有看楼记录。从地图上选一个楼盘，或者点上面的按钮开始。
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {visits.map((v) => (
            <li key={v.id} className="border rounded bg-white p-4">
              <div className="flex justify-between items-start">
                <div>
                  <Link
                    href={`/property/${v.property.id}`}
                    className="font-medium text-base hover:text-blue-600"
                  >
                    {v.property.name}
                  </Link>
                  <p className="text-xs text-neutral-500 mt-1">
                    {v.property.district} · {v.visitedAt.toISOString().slice(0, 10)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {v.overallRating && (
                    <span className="text-amber-500 text-sm">{"★".repeat(v.overallRating)}</span>
                  )}
                  <Link href={`/visits/${v.id}`} className="text-blue-600 text-xs">
                    详情 →
                  </Link>
                </div>
              </div>
              {v.notes && (
                <p className="mt-2 text-sm text-neutral-700 line-clamp-3 whitespace-pre-wrap">
                  {v.notes}
                </p>
              )}
              {v.photos.length > 0 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {v.photos.slice(0, 6).map((p) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={p.id}
                      src={p.url}
                      alt=""
                      className="h-16 rounded object-cover"
                    />
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
