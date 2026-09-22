import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Brush,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  playerChartData,
  salesChartData,
  topUpsStore,
} from "@/lib/admin-demo-data";
import Link from "@/components/next-compat/link";
import { isMockMode } from "@/lib/playfab/config";
import { useAdminPlayers } from "@/lib/playfab/hooks";

type ChartKey = "players" | "sales";

type ChartConfig = {
  key: ChartKey;
  title: string;
  subtitle: string;
  data: Record<string, string | number>[];
  dataKey: string;
  color: string;
  gradientId: string;
  currency?: boolean;
  expanded?: boolean;
};

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MOCK_CHART_YEAR = 2026;

const phpCurrencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function createMonthDate(year: number, month: number) {
  return [String(year), String(month + 1).padStart(2, "0"), "01T00:00:00.000Z"].join("-");
}

function formatFullDate(value: string | number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatMonthTick(value: string | number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

function formatPhp(value: number) {
  return phpCurrencyFormatter.format(Number(value) || 0);
}

function formatPhpAxis(value: number) {
  const amount = Number(value) || 0;
  if (Math.abs(amount) >= 1000) {
    return "₱" + (amount / 1000).toLocaleString("en-PH", { maximumFractionDigits: 1 }) + "k";
  }
  return "₱" + amount.toLocaleString("en-PH", { maximumFractionDigits: 0 });
}

type AdminSalesRecord = {
  date: string;
  amount: number;
  status: string;
};

const chartConfigs: ChartConfig[] = [
  {
    key: "players",
    title: "Players Over Time",
    subtitle: "Monthly registered player growth",
    data: playerChartData,
    dataKey: "players",
    color: "#d9a514",
    gradientId: "playersGold",
  },
  {
    key: "sales",
    title: "Sales Overview",
    subtitle: "Monthly gross store revenue",
    data: salesChartData,
    dataKey: "sales",
    color: "#f05a3c",
    gradientId: "salesCoral",
    currency: true,
  },
];

function ChartVisualization({
  data,
  dataKey,
  color,
  gradientId,
  currency = false,
  expanded = false,
}: Omit<ChartConfig, "key" | "title" | "subtitle">) {
  return (
    <div
      className={`w-full overflow-x-auto overscroll-x-contain rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral ${
        expanded ? "h-[30rem] min-h-[420px]" : "h-72"
      }`}
      tabIndex={expanded ? 0 : undefined}
      aria-label={expanded ? "Pan and inspect the full analytics graph" : undefined}
    >
      <div className={expanded ? "h-full min-w-[960px] pr-2" : "h-full min-w-full"}>
        <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{
            top: 10,
            right: 12,
            left: 8,
            bottom: expanded ? 28 : 4,
          }}
        >
          <defs>
            <linearGradient
              id={gradientId}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid
            stroke="var(--control-line-soft, rgba(255,255,255,0.08))"
            strokeDasharray="4 4"
            vertical={false}
          />

          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tickFormatter={formatMonthTick}
            tick={{
              fill: "var(--control-muted, rgba(255,255,255,0.55))",
              fontSize: 12,
            }}
            dy={10}
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{
              fill: "var(--control-muted, rgba(255,255,255,0.45))",
              fontSize: 11,
            }}
            tickFormatter={(value) =>
              currency
                ? formatPhpAxis(Number(value))
                : Number(value).toLocaleString()
            }
          />

          <Tooltip
            cursor={{
              stroke: "var(--control-line-soft, rgba(255,255,255,0.2))",
              strokeWidth: 1,
            }}
            contentStyle={{
              backgroundColor: "var(--control-bg, #101923)",
              border: "1px solid var(--control-line, rgba(255,255,255,0.12))",
              borderRadius: "8px",
              boxShadow:
                "var(--control-tooltip-shadow, 0 12px 30px rgba(0,0,0,0.4))",
              color: "var(--control-ink, #ffffff)",
              fontSize: "12px",
            }}
            labelStyle={{
              color: "var(--control-muted, rgba(255,255,255,0.55))",
              marginBottom: "4px",
            }}
            itemStyle={{
              color: "var(--control-ink, #ffffff)",
            }}
            labelFormatter={(label) => formatFullDate(String(label))}
            formatter={(value) =>
              currency
                ? [formatPhp(Number(value)), "Sales"]
                : [Number(value).toLocaleString(), "Players"]
            }
          />

          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={3}
            fill={`url(#${gradientId})`}
            dot={{
              r: 4,
              fill: color,
              stroke: "var(--control-surface, #182330)",
              strokeWidth: 2,
            }}
            activeDot={{
              r: 6,
              fill: color,
              stroke: "var(--control-active-dot, #ffffff)",
              strokeWidth: 2,
            }}
          />

          {expanded && (
            <Brush
              dataKey="date"
              height={20}
              stroke={color}
              fill="var(--control-surface, #182330)"
              travellerWidth={12}
            />
          )}
        </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ChartCard({
  chart,
  showViewMore,
}: {
  chart: ChartConfig;
  showViewMore: boolean;
}) {
  return (
    <article
      className="admin-card rounded-lg border p-5 shadow-xl sm:p-6"
      style={{
        backgroundColor: "var(--control-surface, #182330)",
        borderColor: "var(--control-line, rgba(255,255,255,0.06))",
      }}
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2
            className="text-lg font-black uppercase tracking-tight"
            style={{ color: "var(--control-ink, #ffffff)" }}
          >
            {chart.title}
          </h2>
          <p
            className="mt-1 text-xs"
            style={{ color: "var(--control-muted, rgba(255,255,255,0.45))" }}
          >
            {chart.subtitle}
          </p>
        </div>

        {showViewMore && (
          <Link
            href={"/admin/analytics?chart=" + chart.key}
            className="shrink-0 text-[10px] font-black uppercase tracking-wide text-coral transition hover:text-white"
          >
            View More →
          </Link>
        )}
      </div>

      <ChartVisualization {...chart} />
    </article>
  );
}

export function DashboardCharts({
  showViewMore = false,
  unified = false,
  expanded = false,
  initialActiveKey = "players",
}: {
  showViewMore?: boolean;
  unified?: boolean;
  expanded?: boolean;
  initialActiveKey?: ChartKey;
}) {
  const [activeKey, setActiveKey] = useState<ChartKey>(initialActiveKey);
  const [topUps] = topUpsStore.useStore();
  const mockMode = isMockMode();
  const adminPlayersQuery = useAdminPlayers();
  const realSalesQuery = useQuery({
    queryKey: ["admin", "paymongo-orders", "chart"],
    queryFn: async (): Promise<AdminSalesRecord[]> => {
      try {
        const response = await fetch("/api/admin/paymongo-orders", {
          cache: "no-store",
        });
        if (!response.ok) return [];
        const result = (await response.json().catch(() => ({}))) as { data?: unknown };
        return Array.isArray(result.data) ? result.data as AdminSalesRecord[] : [];
      } catch {
        return [];
      }
    },
    enabled: !mockMode,
    staleTime: 60 * 1000,
  });

  const playerData = useMemo(() => {
    if (mockMode) {
      const seededByMonth = new Map(playerChartData.map((point) => [point.date, point.players]));
      return MONTH_LABELS.map((label, index) => ({
        date: createMonthDate(MOCK_CHART_YEAR, index),
        players: seededByMonth.get(label) ?? 0,
      }));
    }

    const dates = (adminPlayersQuery.data ?? [])
      .map((player) => new Date(player.joinedAt))
      .filter((date) => !Number.isNaN(date.getTime()));
    const years = dates.map((date) => date.getUTCFullYear());
    const latestYear = years.length > 0
      ? Math.max(...years)
      : new Date().getUTCFullYear();
    const registrationsByMonth = new Map<number, number>();

    for (const date of dates) {
      if (date.getUTCFullYear() !== latestYear) continue;
      const month = date.getUTCMonth();
      registrationsByMonth.set(month, (registrationsByMonth.get(month) ?? 0) + 1);
    }

    let cumulative = 0;
    return MONTH_LABELS.map((_, index) => {
      cumulative += registrationsByMonth.get(index) ?? 0;
      return { date: createMonthDate(latestYear, index), players: cumulative };
    });
  }, [adminPlayersQuery.data, mockMode]);

  const salesData = useMemo(() => {
    const salesByMonth = new Map<number, number>();
    const realSales = realSalesQuery.data ?? [];
    const realSaleYears = realSales
      .map((sale) => new Date(sale.date).getUTCFullYear())
      .filter((year) => Number.isFinite(year));
    const latestSalesYear = realSaleYears.length > 0
      ? Math.max(...realSaleYears)
      : new Date().getUTCFullYear();

    if (mockMode) {
      for (const topUp of topUps) {
        if (topUp.status !== "Completed") continue;
        const date = new Date(topUp.date);
        if (Number.isNaN(date.getTime())) continue;
        const month = date.getUTCMonth();
        salesByMonth.set(month, (salesByMonth.get(month) ?? 0) + topUp.amount);
      }

      for (const point of salesChartData) {
        const month = MONTH_LABELS.indexOf(point.date);
        if (month >= 0) {
          salesByMonth.set(month, (salesByMonth.get(month) ?? 0) + point.sales);
        }
      }
    } else {
      // Real mode treats every PayMongo ledger row as a recorded money event,
      // including simulated pending/failed states, so the admin's sales view
      // reflects the complete financial ledger.
      for (const sale of realSales) {
        const date = new Date(sale.date);
        const amount = Number(sale.amount);
        if (Number.isNaN(date.getTime()) || !Number.isFinite(amount)) continue;
        if (date.getUTCFullYear() !== latestSalesYear) continue;
        const month = date.getUTCMonth();
        salesByMonth.set(month, (salesByMonth.get(month) ?? 0) + amount);
      }
    }

    const chartYear = mockMode ? MOCK_CHART_YEAR : latestSalesYear;
    return MONTH_LABELS.map((_, index) => ({
      date: createMonthDate(chartYear, index),
      sales: salesByMonth.get(index) ?? 0,
    }));
  }, [mockMode, realSalesQuery.data, topUps]);

  const charts = useMemo(
    () =>
      chartConfigs.map((chart) => ({
        ...chart,
        data: chart.key === "sales" ? salesData : playerData,
      })),
    [playerData, salesData],
  );
  useEffect(() => {
    setActiveKey(initialActiveKey);
  }, [initialActiveKey]);

  const activeChart = charts.find((chart) => chart.key === activeKey) ?? charts[0];
  if (!activeChart) return null;

  if (!unified) {
    return (
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {charts.map((chart) => (
          <ChartCard
            key={chart.key}
            chart={chart}
            showViewMore={showViewMore}
          />
        ))}
      </div>
    );
  }

  return (
    <article
      className="admin-card mt-6 rounded-lg border p-5 shadow-xl sm:p-6"
      style={{
        backgroundColor: "var(--control-surface, #182330)",
        borderColor: "var(--control-line, rgba(255,255,255,0.06))",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2
            className="text-lg font-black uppercase tracking-tight"
            style={{ color: "var(--control-ink, #ffffff)" }}
          >
            {activeChart.title}
          </h2>

          <p
            className="mt-1 text-xs"
            style={{ color: "var(--control-muted, rgba(255,255,255,0.45))" }}
          >
            {activeChart.subtitle}
          </p>
        </div>

        {showViewMore && (
          <Link
            href={"/admin/analytics?chart=" + activeKey}
            className="shrink-0 text-[10px] font-black uppercase tracking-wide text-coral transition hover:text-white"
          >
            View More →
          </Link>
        )}
      </div>

      <div
        className="mt-5 flex flex-wrap gap-2 border-b pb-3"
        style={{ borderColor: "var(--control-line-soft, rgba(255,255,255,0.08))" }}
        role="tablist"
        aria-label="Analytics charts"
      >
        {chartConfigs.map((chart) => {
          const isActive = chart.key === activeKey;

          return (
            <button
              key={chart.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveKey(chart.key)}
              className="rounded-md border px-3 py-2 text-[10px] font-black uppercase tracking-wide transition"
              style={{
                borderColor: isActive
                  ? "var(--accent-coral, #f05a3c)"
                  : "var(--control-line-soft, rgba(255,255,255,0.12))",
                backgroundColor: isActive
                  ? "var(--accent-coral, #f05a3c)"
                  : "transparent",
                color: isActive
                  ? "#ffffff"
                  : "var(--control-muted, rgba(255,255,255,0.55))",
              }}
            >
              {chart.title}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        {expanded && (
          <p
            className="mb-2 text-[10px] font-bold uppercase tracking-wide"
            style={{ color: "var(--control-muted, rgba(255,255,255,0.45))" }}
          >
            Use the timeline control or horizontal scroll to inspect the graph in detail.
          </p>
        )}
        <ChartVisualization {...activeChart} expanded={expanded} />
      </div>
    </article>
  );
}
