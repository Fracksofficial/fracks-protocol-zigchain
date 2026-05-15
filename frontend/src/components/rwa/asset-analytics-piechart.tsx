"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

type PieDatum = { name: string; value: number; color: string };

const fallbackData: PieDatum[] = [
  { name: "Real Estate", value: 44, color: "#2A5FA6" },
  { name: "Commodities", value: 22, color: "#92BFFF" },
  { name: "Private Credit", value: 18, color: "#BC953D" },
  { name: "Equity", value: 16, color: "#94E9B8" },
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-200">
        <p className="text-sm font-semibold text-gray-900">{payload[0].name}</p>
        <p className="text-sm text-gray-600">{payload[0].value}%</p>
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ payload }: any) => {
  return (
    <div className="flex flex-col gap-3 mt-4">
      {payload.map((entry: any, index: number) => (
        <div
          key={`legend-${index}`}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-700">{entry.value}</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">
            {entry.payload.value}%
          </span>
        </div>
      ))}
    </div>
  );
};

export function AssetAnalyticsPieChart({
  data = fallbackData,
}: {
  data?: PieDatum[];
}) {
  const colors = data.map((item) => item.color);

  return (
    <div className="w-full">
      <div className="flex flex-col items-center">
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={100}
              innerRadius={65}
              fill="#8884d8"
              dataKey="value"
              paddingAngle={2}
              cornerRadius={5}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
