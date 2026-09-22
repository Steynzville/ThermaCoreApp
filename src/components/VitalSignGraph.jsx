import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
export default function VitalSignGraph({ title, dataKey, color, data = [] }) {
  const [days, setDays] = useState(30);
  const rows = data.slice(-days);
  return (
    <section className="border rounded-lg p-4 space-y-3">
      <div className="flex justify-between">
        <h3 className="font-semibold">{title}</h3>
        <label>
          Period{" "}
          <select
            aria-label={`${title} period`}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
        </label>
      </div>
      {rows.some((r) => r[dataKey] != null) ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey={dataKey}
                name={title}
                stroke={color}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p>No recorded data for this metric.</p>
      )}
    </section>
  );
}
