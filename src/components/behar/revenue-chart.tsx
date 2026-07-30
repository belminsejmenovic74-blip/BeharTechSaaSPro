"use client";

import { useMemo } from "react";

import { useBeharStore } from "@/lib/behar-store";
import { repairInternalTotal, repairReturnedIsoDay, toIsoDay } from "@/lib/repair-revenue";
import { formatMoneyShort } from "@/lib/workshop-country";

const chartWidth = 720;
const chartHeight = 240;
const padding = { top: 12, right: 20, bottom: 36, left: 56 };

// Construit la liste des 30 derniers jours (dates locales, YYYY-MM-DD)
function buildLast30Days(): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let offset = 29; offset >= 0; offset--) {
    const d = new Date(now);
    d.setDate(now.getDate() - offset);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    days.push(iso);
  }
  return days;
}

function formatDayShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

export function RevenueChart({ canInvoice = true }: Readonly<{ canInvoice?: boolean }>) {
  const repairs = useBeharStore((s) => s.repairs);
  const currency = useBeharStore((s) => s.workshopInfo.currency);

  // Agrégation des montants déclarés encaissés hors Behar Tech Pro. Sans
  // facturation, le règlement déclaré n'existe pas : on agrège les dossiers
  // restitués, valorisés par leur montant interne.
  const dailyRevenue = useMemo(() => {
    const days = buildLast30Days();
    const totals = new Map<string, number>(days.map((d) => [d, 0]));
    for (const repair of repairs) {
      if (!canInvoice) {
        const returnedIso = repairReturnedIsoDay(repair);
        if (!returnedIso || !totals.has(returnedIso)) continue;
        totals.set(returnedIso, (totals.get(returnedIso) ?? 0) + repairInternalTotal(repair));
        continue;
      }
      const declaration = repair.externalSettlement;
      if (!declaration || !["Réglé", "Partiellement réglé"].includes(declaration.status)) continue;
      const iso = toIsoDay(declaration.date || declaration.recordedAt);
      if (!iso || !totals.has(iso)) continue;
      totals.set(iso, (totals.get(iso) ?? 0) + declaration.amount);
    }
    return days.map((iso) => ({ iso, amount: totals.get(iso) ?? 0 }));
  }, [canInvoice, repairs]);

  const maxRevenue = Math.max(100, ...dailyRevenue.map((point) => point.amount));
  const totalPeriod = dailyRevenue.reduce((sum, point) => sum + point.amount, 0);

  const points = dailyRevenue.map((point, index) => {
    const divisor = Math.max(1, dailyRevenue.length - 1);
    const x = padding.left + (index / divisor) * (chartWidth - padding.left - padding.right);
    const y = padding.top + (1 - point.amount / maxRevenue) * (chartHeight - padding.top - padding.bottom);
    return { ...point, x, y };
  });

  if (!points.length) return null;

  const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPath = `M ${points[0].x},${chartHeight - padding.bottom} L ${points
    .map((point) => `${point.x},${point.y}`)
    .join(" L ")} L ${points.at(-1)?.x ?? chartWidth - padding.right},${chartHeight - padding.bottom} Z`;

  const gridValues = [0, maxRevenue * 0.25, maxRevenue * 0.5, maxRevenue * 0.75, maxRevenue];

  // Labels X : on n'affiche que ~6 dates pour éviter la bouillie.
  const xLabelStep = Math.max(1, Math.ceil(points.length / 6));

  return (
    <div className="w-full">
      <p className="mb-2 text-[12px] text-[#667085]">
        Total période : <span className="font-semibold text-[#101828]">{formatMoneyShort(totalPeriod, currency)}</span>
      </p>
      <div className="h-[260px] w-full">
        <svg
          aria-label="CA encaissé déclaré par jour, 30 derniers jours"
          className="h-full w-full overflow-visible"
          role="img"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        >
          <defs>
            <linearGradient id="beharRevenueArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#2A9D8F" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#2A9D8F" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {gridValues.map((value, idx) => {
            const y = padding.top + (1 - value / maxRevenue) * (chartHeight - padding.top - padding.bottom);
            return (
              <g key={`grid-${idx}`}>
                <line
                  stroke="#E8E7E2"
                  strokeWidth="1"
                  x1={padding.left}
                  x2={chartWidth - padding.right}
                  y1={y}
                  y2={y}
                />
                <text fill="#667085" fontSize="11" textAnchor="end" x={padding.left - 10} y={y + 4}>
                  {formatMoneyShort(value, currency)}
                </text>
              </g>
            );
          })}

          <path d={areaPath} fill="url(#beharRevenueArea)" />
          <polyline
            fill="none"
            points={linePoints}
            stroke="#2A9D8F"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
          />

          {/* Points seulement sur les jours avec un montant > 0, pour éviter
              une ligne de bulles plates qui suggère un flux constant. */}
          {points.map((point) =>
            point.amount > 0 ? (
              <circle cx={point.x} cy={point.y} fill="#2A9D8F" key={point.iso} r="3.5" stroke="white" strokeWidth="2" />
            ) : null,
          )}

          {points.map((point, index) =>
            index % xLabelStep === 0 || index === points.length - 1 ? (
              <text
                fill="#667085"
                fontSize="11"
                key={`label-${point.iso}`}
                textAnchor="middle"
                x={point.x}
                y={chartHeight - 12}
              >
                {formatDayShort(point.iso)}
              </text>
            ) : null,
          )}
        </svg>
      </div>
    </div>
  );
}
