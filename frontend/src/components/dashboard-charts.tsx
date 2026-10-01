"use client";

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

const BLUE = "#2a78d6";
const RED = "#e34948";
const GRAY = "#c3c2b7";
const GRID = "#e1e0d9";
const AXIS = "#898781";

const tick = { fill: AXIS, fontSize: 12 };

function shortDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function InteractionsLine({ data }: { data: { date: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={shortDate}
          tick={tick}
          tickLine={false}
          axisLine={{ stroke: GRAY }}
          minTickGap={24}
        />
        <YAxis allowDecimals={false} tick={tick} tickLine={false} axisLine={false} />
        <Tooltip
          labelFormatter={(label) => shortDate(String(label))}
          formatter={(value) => [value, "Interactions"]}
          cursor={{ stroke: GRAY }}
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke={BLUE}
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
  colors,
}: {
  data: { label: string; value: number }[];
  colors?: string[];
}) {
  return (
    <ResponsiveContainer width="100%" height={data.length * 40 + 8}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 32, bottom: 0, left: 0 }}>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={88}
          tick={tick}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip cursor={{ fill: "#f0efec" }} formatter={(value) => [value, "Count"]} />
        <Bar dataKey="value" barSize={16} radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => (
            <Cell key={entry.label} fill={colors?.[i] ?? BLUE} />
          ))}
          <LabelList dataKey="value" position="right" fill="#52514e" fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export const SENTIMENT_COLORS = [BLUE, GRAY, RED];
