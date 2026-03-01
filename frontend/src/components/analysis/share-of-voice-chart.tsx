'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ShareOfVoiceChartProps {
  byEngine: Record<string, { total: number; mentioned: number; avgSov: number }>;
}

export function ShareOfVoiceChart({ byEngine }: ShareOfVoiceChartProps) {
  const rows = Object.entries(byEngine);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Share of Voice by AI Engine</CardTitle>
        <p className="text-sm text-gray-500 mt-0.5">Engine-level mention and share-of-voice metrics</p>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">No share-of-voice data available yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-2 text-left font-medium text-gray-500">Engine</th>
                  <th className="pb-2 text-right font-medium text-gray-500">Queries</th>
                  <th className="pb-2 text-right font-medium text-gray-500">Mentioned</th>
                  <th className="pb-2 text-right font-medium text-gray-500">Avg SoV</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([engine, stats]) => (
                  <tr key={engine} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{engine}</td>
                    <td className="py-2 text-right text-gray-700">{stats.total}</td>
                    <td className="py-2 text-right text-gray-700">{stats.mentioned}</td>
                    <td className="py-2 text-right font-medium text-gray-900">{stats.avgSov.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
