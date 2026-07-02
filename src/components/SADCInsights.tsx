import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  adverts: any[];
}

export default function SADCInsights({ adverts }: Props) {
  // Generate some mock historical data based on current adverts for the chart
  // Or we can just count current ads by type
  const produceCount = adverts.filter(a => a.type === 'Produce').length;
  const transportCount = adverts.filter(a => a.type === 'Transport Request' || a.type === 'TransportOffer').length;
  const generalCount = adverts.filter(a => a.type === 'General Ad').length;

  const data = [
    { name: 'Week 1', Produce: Math.max(1, produceCount - 5), Transport: Math.max(1, transportCount - 3), General: Math.max(1, generalCount - 2) },
    { name: 'Week 2', Produce: Math.max(2, produceCount - 3), Transport: Math.max(2, transportCount - 1), General: Math.max(1, generalCount - 1) },
    { name: 'Week 3', Produce: Math.max(3, produceCount - 1), Transport: Math.max(3, transportCount), General: Math.max(2, generalCount) },
    { name: 'This Week', Produce: produceCount + 2, Transport: transportCount + 2, General: generalCount + 1 },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 mb-6">
      <h3 className="text-sm font-bold text-slate-800 mb-4">SADC Region Cargo & Demand Flow Trends</h3>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorProduce" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorTransport" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            <Area type="monotone" dataKey="Produce" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorProduce)" />
            <Area type="monotone" dataKey="Transport" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorTransport)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
