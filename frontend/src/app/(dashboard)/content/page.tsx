'use client';

import { useQuery } from '@tanstack/react-query';
import { companyApi, analysisApi, BlogPost, Analysis } from '@/lib/api';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, statusBadge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils';
import Link from 'next/link';
import { FileText, ArrowRight } from 'lucide-react';

export default function ContentPage() {
  const { data: companiesRes } = useQuery({
    queryKey: ['companies'],
    queryFn: () => companyApi.getAll(),
  });
  const companies = companiesRes?.data?.data ?? [];
  const firstId = companies[0]?.id;

  const { data: analysesRes, isLoading } = useQuery({
    queryKey: ['analyses', firstId],
    queryFn: () => analysisApi.getForCompany(firstId),
    enabled: !!firstId,
  });

  const analyses: Analysis[] = analysesRes?.data?.data ?? [];
  const allPosts: (BlogPost & { analysisId: string })[] = analyses.flatMap((a) =>
    (a.blogPosts ?? []).map((p) => ({ ...p, analysisId: a.id })),
  );

  return (
    <div className="space-y-6">
      <Header
        title="Content"
        subtitle="AI-generated blog posts and page recommendations"
      />

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : allPosts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="mx-auto h-10 w-10 text-gray-300 mb-4" />
            <p className="text-gray-500">
              No content generated yet. Run an analysis to generate blog posts.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {allPosts.map((post) => (
            <Link key={post.id} href={`/analyses/${post.analysisId}`}>
              <Card className="hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer">
                <CardContent className="flex items-start justify-between py-4 gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant={statusBadge(post.status)}>{post.status}</Badge>
                      <Badge variant="info">{post.buyerStage}</Badge>
                      <span className="text-xs text-gray-400">{post.wordCount} words</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 truncate">{post.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{post.targetQuery}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatRelativeTime(post.createdAt)}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 shrink-0 mt-1" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
