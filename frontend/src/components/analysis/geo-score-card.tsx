'use client';

import { GeoScore } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, scoreColor } from '@/lib/utils';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

const ATTRIBUTES = [
  { key: 'extractabilityScore', label: 'Extractability' },
  { key: 'entityClarityScore', label: 'Entity Clarity' },
  { key: 'specificityScore', label: 'Specificity' },
  { key: 'corroborationScore', label: 'Corroboration' },
  { key: 'coverageScore', label: 'Coverage' },
  { key: 'freshnessScore', label: 'Freshness' },
  { key: 'indexabilityScore', label: 'Indexability' },
  { key: 'machineReadabilityScore', label: 'Machine Readability' },
] as const;

interface GeoScoreCardProps {
  score: GeoScore;
}

export function GeoScoreCard({ score }: GeoScoreCardProps) {
  const radarData = ATTRIBUTES.map(({ key, label }) => ({
    attribute: label,
    value: (score[key] as number) ?? 0,
    fullMark: 5,
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>GEO Score</CardTitle>
          <span className={cn('text-3xl font-bold', scoreColor(score.overallScore))}>
            {score.overallScore}
            <span className="text-lg font-normal text-gray-400">/100</span>
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="attribute" tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${v}/5`, 'Score']} contentStyle={{ fontSize: 12 }} />
              <Radar name="Score" dataKey="value" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.25} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 space-y-2">
          {ATTRIBUTES.map(({ key, label }) => {
            const val = (score[key] as number) ?? 0;
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="w-36 text-xs text-gray-600 shrink-0">{label}</span>
                <div className="flex-1 rounded-full bg-gray-100 h-2">
                  <div className="h-2 rounded-full bg-indigo-500 transition-all" style={{ width: `${(val / 5) * 100}%` }} />
                </div>
                <span className="w-8 text-right text-xs font-medium text-gray-700">{val}/5</span>
              </div>
            );
          })}
        </div>

        {score.priorityActions.length > 0 && (
          <div className="mt-5">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Priority Actions</h4>
            <ul className="space-y-1.5">
              {score.priorityActions.map((action, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                  {action}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
