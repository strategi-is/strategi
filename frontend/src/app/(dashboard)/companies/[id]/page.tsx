'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companyApi, analysisApi, Analysis } from '@/lib/api';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, statusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatRelativeTime, scoreColor, statusLabel } from '@/lib/utils';
import Link from 'next/link';
import { ArrowRight, Play, Trash2, Globe, Tag, Pencil } from 'lucide-react';
import { useState } from 'react';

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const { data: companyRes, isLoading: loadingCompany } = useQuery({
    queryKey: ['company', id],
    queryFn: () => companyApi.getOne(id),
  });

  const { data: analysesRes, isLoading: loadingAnalyses } = useQuery({
    queryKey: ['analyses', id],
    queryFn: () => analysisApi.getForCompany(id),
  });

  const startMutation = useMutation({
    mutationFn: () => analysisApi.start(id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['analyses', id] });
      router.push(`/analyses/${res.data.data.id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => companyApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companies'] });
      router.push('/companies');
    },
  });

  const company = companyRes?.data?.data;
  const analyses: Analysis[] = analysesRes?.data?.data ?? [];

  if (loadingCompany) return <div className="text-sm text-gray-500">Loading...</div>;
  if (!company) return <div className="text-sm text-red-500">Company not found</div>;

  return (
    <div className="space-y-6">
      <Header
        title={company.name}
        subtitle={`${company.industry} · ${company.websiteUrl}`}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Link href={`/companies/${id}/edit`}>
              <Button variant="secondary" size="sm">
                <Pencil className="mr-1.5 h-4 w-4" />
                Edit
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={() => startMutation.mutate()}
              loading={startMutation.isPending}
            >
              <Play className="mr-1.5 h-4 w-4" />
              Run analysis
            </Button>
          </div>
        }
      />

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800 mb-3">
            Are you sure? This will delete the company and all associated analyses.
          </p>
          <div className="flex gap-2">
            <Button
              variant="danger"
              size="sm"
              onClick={() => deleteMutation.mutate()}
              loading={deleteMutation.isPending}
            >
              Yes, delete
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setDeleteConfirm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {startMutation.isError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Failed to start analysis. Please try again.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Company details */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Target Audience
              </p>
              <p className="text-sm text-gray-700">{company.targetAudience}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Products & Services
              </p>
              <p className="text-sm text-gray-700">{company.productsServices}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Key Differentiators
              </p>
              <p className="text-sm text-gray-700">{company.keyDifferentiators}</p>
            </div>
            {company.brandVoiceNotes && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Brand Voice
                </p>
                <p className="text-sm text-gray-700">{company.brandVoiceNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Competitors */}
        <Card>
          <CardHeader>
            <CardTitle>Competitors ({company.competitors?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {!company.competitors?.length ? (
              <p className="text-sm text-gray-500">No competitors configured.</p>
            ) : (
              <div className="space-y-2">
                {company.competitors.map(
                  (c: { id: string; name?: string; websiteUrl: string }, i: number) => (
                    <div
                      key={c.id ?? i}
                      className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2"
                    >
                      <Tag className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <div>
                        {c.name && (
                          <p className="text-sm font-medium text-gray-800">{c.name}</p>
                        )}
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Globe className="h-3 w-3" />
                          {c.websiteUrl}
                        </div>
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analyses list */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingAnalyses ? (
            <p className="px-6 py-4 text-sm text-gray-500">Loading...</p>
          ) : analyses.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-gray-500 mb-4">No analyses yet.</p>
              <Button
                size="sm"
                onClick={() => startMutation.mutate()}
                loading={startMutation.isPending}
              >
                <Play className="mr-1.5 h-4 w-4" />
                Run first analysis
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {analyses.map((a) => (
                <Link
                  key={a.id}
                  href={`/analyses/${a.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={statusBadge(a.status)}>{statusLabel(a.status)}</Badge>
                    <span className="text-sm text-gray-500">
                      {formatRelativeTime(a.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {a.geoScore && (
                      <span
                        className={`text-sm font-semibold ${scoreColor(a.geoScore.overallScore)}`}
                      >
                        {a.geoScore.overallScore}/100
                      </span>
                    )}
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
