'use client';

import { useQuery } from '@tanstack/react-query';
import { companyApi, analysisApi, Analysis } from '@/lib/api';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, statusBadge } from '@/components/ui/badge';
import { formatRelativeTime, scoreColor, statusLabel } from '@/lib/utils';
import Link from 'next/link';
import { ArrowRight, BarChart3 } from 'lucide-react';

export default function AnalysesPage() {
  const { data: companiesRes } = useQuery({
    queryKey: ['companies'],
    queryFn: () => companyApi.getAll(),
  });

  const companies = companiesRes?.data?.data ?? [];

  const { data: analysesRes, isLoading } = useQuery({
    queryKey: ['analyses', companies[0]?.id],
    queryFn: () => analysisApi.getForCompany(companies[0]?.id),
    enabled: !!companies[0]?.id,
  });

  const analyses: Analysis[] = analysesRes?.data?.data ?? [];

  return (
    <div className="space-y-6">
      <Header
        title="Analyses"
        subtitle="All GEO analysis runs across your company profiles"
      />

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : analyses.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BarChart3 className="mx-auto h-10 w-10 text-gray-300 mb-4" />
            <p className="text-gray-500">No analyses yet. Go to a company profile and run one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {analyses.map((a) => (
            <Link key={a.id} href={`/analyses/${a.id}`}>
              <Card className="hover:border-orange-300 hover:shadow-md transition-all cursor-pointer">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <Badge variant={statusBadge(a.status)}>{statusLabel(a.status)}</Badge>
                    <span className="text-sm text-gray-500">{formatRelativeTime(a.createdAt)}</span>
                    {a.completedAt && (
                      <span className="text-xs text-gray-400">
                        Completed {formatRelativeTime(a.completedAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    {a.geoScore && (
                      <span className={`text-sm font-bold ${scoreColor(a.geoScore.overallScore)}`}>
                        GEO: {a.geoScore.overallScore}/100
                      </span>
                    )}
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
