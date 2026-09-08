import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  playerChartData,
  salesChartData,
} from "@/lib/admin-demo-data";

type ChartCardProps = {
  title: string;
  subtitle: string;
  data: Record<string, string | number>[];
  dataKey: string;
  color: string;
  gradientId: string;
  currency?: boolean;
};

function ChartCard({
  title,
  subtitle,
  data,
  dataKey,
  color,
  gradientId,
  currency = false,
}: ChartCardProps) {
  return (
    <article
      className="admin-card rounded-lg border p-5 shadow-xl sm:p-6"
      style={{
        backgroundColor: "var(--control-surface, #182330)",
        borderColor: "var(--control-line, rgba(255,255,255,0.06))",
      }}
    >
      {/* CHART HEADER */}
      <div className="mb-6">
        <h2
          className="text-lg font-black uppercase tracking-tight"
          style={{ color: "#ffffff" }}
        >
          {title}
        </h2>

        <p
          className="mt-1 text-xs"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          {subtitle}
        </p>
      </div>

      {/* CHART AREA */}
      <div
        className="h-72 w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{
              top: 10,
              right: 12,
              left: currency ? 8 : 0,
              bottom: 4,
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
                <stop
                  offset="0%"
                  stopColor={color}
                  stopOpacity={0.3}
                />

                <stop
                  offset="100%"
                  stopColor={color}
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>

            {/* GRID */}
            <CartesianGrid
              stroke="rgba(255,255,255,0.08)"
              strokeDasharray="4 4"
              vertical={false}
            />

            {/* X AXIS */}
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{
                fill: "rgba(255,255,255,0.55)",
                fontSize: 12,
              }}
              dy={10}
            />

            {/* Y AXIS */}
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{
                fill: "rgba(255,255,255,0.45)",
                fontSize: 11,
              }}
              tickFormatter={(value) =>
                currency
                  ? `$${Number(value) / 1000}k`
                  : Number(value).toLocaleString()
              }
            />

            {/* TOOLTIP */}
            <Tooltip
              cursor={{
                stroke: "rgba(255,255,255,0.2)",
                strokeWidth: 1,
              }}
              contentStyle={{
                backgroundColor: "var(--control-bg, #101923)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "8px",
                boxShadow: "0 12px 30px rgba(0,0,0,0.4)",
                color: "#ffffff",
                fontSize: "12px",
              }}
              labelStyle={{
                color: "rgba(255,255,255,0.55)",
                marginBottom: "4px",
              }}
              itemStyle={{
                color: "#ffffff",
              }}
              formatter={(value) =>
                currency
                  ? [
                      `$${Number(value).toLocaleString()}`,
                      "Sales",
                    ]
                  : [
                      Number(value).toLocaleString(),
                      "Players",
                    ]
              }
            />

            {/* DATA AREA */}
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
                stroke: "#ffffff",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

export function DashboardCharts() {
  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <ChartCard
        title="Players Over Time"
        subtitle="Monthly registered player growth"
        data={playerChartData}
        dataKey="players"
        color="#d9a514"
        gradientId="playersGold"
      />

      <ChartCard
        title="Sales Overview"
        subtitle="Monthly gross store revenue"
        data={salesChartData}
        dataKey="sales"
        color="#f05a3c"
        gradientId="salesCoral"
        currency
      />
    </div>
  );
}