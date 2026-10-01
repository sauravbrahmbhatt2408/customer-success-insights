"use client";

import { useTheme } from "next-themes";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PALETTES = {
  light: {
    blue: "#2a78d6",
    red: "#e34948",
    neutral: "#898781",
    grid: "#e1e0d9",
    axis: "#898781",
    baseline: "#c3c2b7",
    label: "#52514e",
    cursor: "#f0efec",
  },
  dark: {
    blue: "#3987e5",
    red: "#e66767",
    neutral: "#a8a79f",
    grid: "#2c2c2a",
    axis: "#898781",
    baseline: "#383835",
    label: "#c3c2b7",
    cursor: "#2c2c2a",
  },
};

const tooltipStyle = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--popover-foreground)",
    fontSize: 12,
  },
  labelStyle: { color: "var(--popover-foreground)" },
  itemStyle: { color: "var(--popover-foreground)" },
};

function useChartColors() {
  const { resolvedTheme } = useTheme();
  return PALETTES[resolvedTheme === "dark" ? "dark" : "light"];
}

function shortDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function InteractionsLine({ data }: { data: { date: string; count: number }[] }) {
  const colors = useChartColors();
  const tick = { fill: colors.axis, fontSize: 12 };

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid stroke={colors.grid} vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={shortDate}
          tick={tick}
          tickLine={false}
          axisLine={{ stroke: colors.baseline }}
          minTickGap={24}
        />
        <YAxis allowDecimals={false} tick={tick} tickLine={false} axisLine={false} />
        <Tooltip
          {...tooltipStyle}
          labelFormatter={(label) => shortDate(String(label))}
          formatter={(value) => [value, "Interactions"]}
          cursor={{ stroke: colors.baseline }}
        />
        <Line
          type="linear"
          dataKey="count"
          stroke={colors.blue}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function CountBars({
  data,
  sentiment = false,
}: {
  data: { label: string; value: number }[];
  sentiment?: boolean;
}) {
  const colors = useChartColors();
  // Sentiment runs positive, neutral, negative: blue, gray, red.
  const fills = sentiment ? [colors.blue, colors.neutral, colors.red] : [];

  return (
    <ResponsiveContainer width="100%" height={data.length * 40 + 8}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 32, bottom: 0, left: 0 }}>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={88}
          tick={{ fill: colors.axis, fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          {...tooltipStyle}
          cursor={{ fill: colors.cursor }}
          formatter={(value) => [value, "Count"]}
        />
        <Bar dataKey="value" barSize={16} radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => (
            <Cell key={entry.label} fill={fills[i] ?? colors.blue} />
          ))}
          <LabelList dataKey="value" position="right" fill={colors.label} fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
