'use client';

import { useQuery } from '@tanstack/react-query';
import { companyApi, analysisApi } from '@/lib/api';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, statusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';
import { formatRelativeTime, scoreColor } from '@/lib/utils';
import Link from 'next/link';
import { Building2, BarChart3, Plus, ArrowRight } from 'lucide-react';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data: companiesRes } = useQuery({
    queryKey: ['companies'],
    queryFn: () => companyApi.getAll(),
  });

  const companies = companiesRes?.data?.data ?? [];
  const firstCompanyId = companies[0]?.id;

  const { data: analysesRes } = useQuery({
    queryKey: ['analyses', firstCompanyId],
    queryFn: () => analysisApi.getForCompany(firstCompanyId),
    enabled: !!firstCompanyId,
  });

  const analyses = analysesRes?.data?.data ?? [];
  const latestAnalysis = analyses[0];

  return (
    <div className="space-y-6">
      <Header
        title={`Welcome back, ${user?.name?.split(' ')[0] ?? 'there'}`}
        subtitle="Here's an overview of your GEO performance"
        action={
          <Link href="/companies/new">
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Add company
            </Button>
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
              <Building2 className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{companies.length}</p>
              <p className="text-sm text-gray-500">Company profiles</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <BarChart3 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{analyses.length}</p>
              <p className="text-sm text-gray-500">Analyses run</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
              <BarChart3 className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p
                className={`text-2xl font-bold ${
                  latestAnalysis?.geoScore
                    ? scoreColor(latestAnalysis.geoScore.overallScore)
                    : 'text-gray-400'
                }`}
              >
                {latestAnalysis?.geoScore ? `${latestAnalysis.geoScore.overallScore}/100` : '—'}
              </p>
              <p className="text-sm text-gray-500">Latest GEO score</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent analyses */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Analyses</CardTitle>
            <Link href="/analyses" className="text-sm text-orange-500 hover:text-orange-600 flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {analyses.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-gray-500">No analyses yet.</p>
              {companies.length === 0 ? (
                <Link href="/companies/new">
                  <Button className="mt-4" size="sm">Add your first company</Button>
                </Link>
              ) : (
                <Link href={`/companies/${firstCompanyId}`}>
                  <Button className="mt-4" size="sm">Run first analysis</Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {analyses.slice(0, 5).map((analysis: { id: string; status: string; createdAt: string; geoScore?: { overallScore: number } | null }) => (
                <Link
                  key={analysis.id}
                  href={`/analyses/${analysis.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={statusBadge(analysis.status)}>{analysis.status}</Badge>
                    <span className="text-sm text-gray-500">
                      {formatRelativeTime(analysis.createdAt)}
                    </span>
                  </div>
                  {analysis.geoScore && (
                    <span className={`text-sm font-semibold ${scoreColor(analysis.geoScore.overallScore)}`}>
                      {analysis.geoScore.overallScore}/100
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Companies */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Company Profiles</CardTitle>
            <Link href="/companies" className="text-sm text-orange-500 hover:text-orange-600 flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {companies.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-gray-500 mb-4">
                Add your first company to start tracking GEO performance.
              </p>
              <Link href="/companies/new">
                <Button size="sm">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add company
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {companies.map((c: { id: string; name: string; industry: string; websiteUrl: string }) => (
                <Link
                  key={c.id}
                  href={`/companies/${c.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.industry} · {c.websiteUrl}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
