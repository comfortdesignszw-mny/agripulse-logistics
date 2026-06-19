import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Bid } from "../types";

interface MarketAnalysisChartProps {
  bids: Bid[];
}

export default function MarketAnalysisChart({
  bids,
}: MarketAnalysisChartProps) {
  if (!bids || bids.length === 0) {
    return (
      <div className="h-40 w-full flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase tracking-wider border border-dashed border-slate-200 rounded-xl bg-slate-50">
        No competitive bid data available
      </div>
    );
  }

  // Create distribution buckets
  const minPrice = Math.floor(Math.min(...bids.map((b) => b.offerPrice)));
  const maxPrice = Math.ceil(Math.max(...bids.map((b) => b.offerPrice)));

  const bucketSize = Math.max(1, Math.ceil((maxPrice - minPrice) / 6));
  const buckets: Record<string, number> = {};

  let currentBin = minPrice;
  while (currentBin <= maxPrice) {
    const range = `${currentBin}-${currentBin + bucketSize - 1}`;
    buckets[range] = 0;
    currentBin += bucketSize;
  }

  bids.forEach((bid) => {
    let binStart = minPrice;
    while (binStart <= maxPrice) {
      if (
        bid.offerPrice >= binStart &&
        bid.offerPrice < binStart + bucketSize
      ) {
        buckets[`${binStart}-${binStart + bucketSize - 1}`] += 1;
        break;
      }
      binStart += bucketSize;
    }
  });

  const chartData = Object.keys(buckets).map((key) => ({
    priceRange: key,
    count: buckets[key],
  }));

  return (
    <div className="w-full h-40 mt-3 p-3 bg-white border border-slate-100 rounded-xl shadow-3xs text-[10px]">
      <h4 className="font-bold text-slate-600 mb-2 uppercase tracking-wide">
        Market Pricing Distribution
      </h4>
      <ResponsiveContainer width="100%" height="80%">
        <BarChart data={chartData}>
          <XAxis dataKey="priceRange" tick={{ fontSize: 9 }} stroke="#94a3b8" />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 9 }}
            stroke="#94a3b8"
          />
          <Tooltip
            cursor={{ fill: "#f1f5f9" }}
            contentStyle={{
              borderRadius: "8px",
              border: "none",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              fontSize: "10px",
              fontWeight: "bold",
            }}
          />
          <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
