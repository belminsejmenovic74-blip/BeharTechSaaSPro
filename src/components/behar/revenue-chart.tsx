"use client";

import { useMemo } from "react";

import { useBeharStore } from "@/lib/behar-store";

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

// Tente d'extraire une date locale YYYY-MM-DD depuis le format libre des paiements.
// Formats rencontrés : "17 mai 2026, 14:30", "Aujourd'hui, 14:30", "Hier, 10:00",
// "2026-05-17", "17/05/2026", etc.
const FR_MONTHS: Record<string, number> = {
  janv: 0,
  "janv.": 0,
  janvier: 0,
  févr: 1,
  "févr.": 1,
  fevr: 1,
  "fevr.": 1,
  février: 1,
  fevrier: 1,
  mars: 2,
  avr: 3,
  "avr.": 3,
  avril: 3,
  mai: 4,
  juin: 5,
  juil: 6,
  "juil.": 6,
  juillet: 6,
  août: 7,
  aout: 7,
  sept: 8,
  "sept.": 8,
  septembre: 8,
  oct: 9,
  "oct.": 9,
  octobre: 9,
  nov: 10,
  "nov.": 10,
  novembre: 10,
  déc: 11,
  "déc.": 11,
  dec: 11,
  "dec.": 11,
  décembre: 11,
  decembre: 11,
};

function toLocalIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function paymentDateToIso(raw: string): string | null {
  if (!raw) return null;
  const value = raw.trim();
  // "Aujourd'hui" / "Hier"
  if (/^aujourd['’]hui/i.test(value)) return toLocalIso(new Date());
  if (/^hier/i.test(value)) {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return toLocalIso(y);
  }
  // ISO direct : "2026-05-17" ou "2026-05-17T..."
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  // jj/mm/aaaa
  const slashMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    return `${slashMatch[3]}-${slashMatch[2].padStart(2, "0")}-${slashMatch[1].padStart(2, "0")}`;
  }
  // "17 mai 2026" / "17 mai 2026, 14:30" / "17 mai. 2026"
  const frMatch = value.match(/^(\d{1,2})\s+([A-Za-zÀ-ÿ.]+)\s+(\d{4})/);
  if (frMatch) {
    const day = Number(frMatch[1]);
    const monthKey = frMatch[2].toLowerCase();
    const month = FR_MONTHS[monthKey];
    if (month !== undefined && Number.isFinite(day)) {
      return `${frMatch[3]}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  // Fallback : tentative Date()
  const fallback = new Date(value);
  if (!Number.isNaN(fallback.getTime())) return toLocalIso(fallback);
  return null;
}

function formatEuroShort(amount: number): string {
  if (amount >= 1000) {
    const k = amount / 1000;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k€`;
  }
  return `${Math.round(amount)}€`;
}

function formatDayShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

export function RevenueChart() {
  const payments = useBeharStore((s) => s.payments);

  // Agrégation par jour des règlements indiqués sur les 30 derniers jours.
  // Source : uniquement payments.status === "Payé" — les factures impayées
  // n'entrent pas dans le total réglé.
  const dailyRevenue = useMemo(() => {
    const days = buildLast30Days();
    const totals = new Map<string, number>(days.map((d) => [d, 0]));
    for (const payment of payments) {
      if (payment.status !== "Payé") continue;
      const iso = paymentDateToIso(payment.date);
      if (!iso || !totals.has(iso)) continue;
      const amount = Number.isFinite(payment.amount) ? Math.max(0, payment.amount) : 0;
      totals.set(iso, (totals.get(iso) ?? 0) + amount);
    }
    return days.map((iso) => ({ iso, amount: totals.get(iso) ?? 0 }));
  }, [payments]);

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
      <p className="mb-2 text-[12px] text-[#6B6B6B]">
        Total période : <span className="font-semibold text-[#1A1916]">{formatEuroShort(totalPeriod)}</span>
      </p>
      <div className="h-[260px] w-full">
        <svg
          aria-label="Règlements indiqués par jour, 30 derniers jours"
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
                <text fill="#6B6B6B" fontSize="11" textAnchor="end" x={padding.left - 10} y={y + 4}>
                  {formatEuroShort(value)}
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
                fill="#6B6B6B"
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
