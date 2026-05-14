"use client";

import { useMemo } from "react";

import { useBeharStore } from "@/lib/behar-store";

const chartWidth = 720;
const chartHeight = 240;
const padding = { top: 12, right: 20, bottom: 36, left: 46 };
export function RevenueChart() {
  const store = useBeharStore();
  const paidPayments = store.payments.filter((payment) => payment.status === "Payé");
  const revenueData = useMemo(() => {
    if (!paidPayments.length) {
      return [{ day: "Aujourd'hui", revenue: 0 }];
    }
    const recent = [...paidPayments].slice(0, 9).reverse();
    return recent.map((payment, index) => ({
      day: `P${index + 1}`,
      revenue: payment.amount,
    }));
  }, [paidPayments]);
  const maxRevenue = Math.max(100, ...revenueData.map((point) => point.revenue));
  const points = revenueData.map((point, index) => {
    const divisor = Math.max(1, revenueData.length - 1);
    const x = padding.left + (index / divisor) * (chartWidth - padding.left - padding.right);
    const y = padding.top + (1 - point.revenue / maxRevenue) * (chartHeight - padding.top - padding.bottom);
    return { ...point, x, y };
  });
  const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPath = `M ${points[0].x},${chartHeight - padding.bottom} L ${points
    .map((point) => `${point.x},${point.y}`)
    .join(" L ")} L ${points.at(-1)?.x ?? chartWidth - padding.right},${chartHeight - padding.bottom} Z`;
  const gridLines = [0, maxRevenue * 0.25, maxRevenue * 0.5, maxRevenue * 0.75, maxRevenue].map((value) =>
    Math.round(value),
  );

  return (
    <div className="h-[260px] w-full">
      <svg
        aria-label="Chiffre d'affaires"
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

        {gridLines.map((line) => {
          const y = padding.top + (1 - line / maxRevenue) * (chartHeight - padding.top - padding.bottom);

          return (
            <g key={line}>
              <line stroke="#E8E7E2" strokeWidth="1" x1={padding.left} x2={chartWidth - padding.right} y1={y} y2={y} />
              <text fill="#6B6B6B" fontSize="12" textAnchor="end" x={padding.left - 10} y={y + 4}>
                {line === 0 ? "0€" : `${Math.round(line)}€`}
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
          strokeWidth="3"
        />
        {points.map((point) => (
          <circle cx={point.x} cy={point.y} fill="#2A9D8F" key={point.day} r="4" stroke="white" strokeWidth="2" />
        ))}

        {points.map((point, index) => (
          <text fill="#6B6B6B" fontSize="12" key={point.day} textAnchor="middle" x={point.x} y={chartHeight - 12}>
            {index % 2 === 0 || index === points.length - 1 ? point.day : ""}
          </text>
        ))}
      </svg>
    </div>
  );
}
