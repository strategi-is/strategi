'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { analysisApi, PageRecommendation, BlogPost, RecStatus } from '@/lib/api';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, statusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GeoScoreCard } from '@/components/analysis/geo-score-card';
import { ShareOfVoiceChart } from '@/components/analysis/share-of-voice-chart';
import { StatusBanner } from '@/components/analysis/status-banner';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

const POLL_INTERVAL = 8000; // 8s

export default function AnalysisDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [revisePostId, setRevisePostId] = useState<string | null>(null);
  const [reviseInstructions, setReviseInstructions] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['analysis', id],
    queryFn: () => analysisApi.getOne(id),
    refetchInterval: (query) => {
      const status = query.state.data?.data?.data?.status;
      if (!status || status === 'COMPLETED' || status === 'FAILED') return false;
      return POLL_INTERVAL;
    },
  });

  const { data: sovRes } = useQuery({
    queryKey: ['analysis-sov', id],
    queryFn: () => analysisApi.getShareOfVoice(id),
    enabled: data?.data?.data?.status === 'COMPLETED',
  });

  const reviseMutation = useMutation({
    mutationFn: ({ postId, instructions }: { postId: string; instructions: string }) =>
      analysisApi.reviseBlogPost(id, postId, instructions),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['analysis', id] });
      setRevisePostId(null);
      setReviseInstructions('');
    },
  });

  const approveMutation = useMutation({
    mutationFn: (postId: string) => analysisApi.approveBlogPost(id, postId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['analysis', id] }),
  });

  const updateRecMutation = useMutation({
    mutationFn: ({ recId, status }: { recId: string; status: RecStatus }) =>
      analysisApi.updateRecommendation(id, recId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['analysis', id] }),
  });

  const analysis = data?.data?.data;
  const sovData = sovRes?.data?.data ?? [];

  // Auto-refresh on non-terminal statuses
  useEffect(() => {
    if (!analysis) return;
    if (analysis.status !== 'COMPLETED' && analysis.status !== 'FAILED') {
      const t = setTimeout(() => refetch(), POLL_INTERVAL);
      return () => clearTimeout(t);
    }
  }, [analysis, refetch]);

  if (isLoading) return <p className="text-sm text-gray-500">Loading...</p>;
  if (!analysis) return <p className="text-sm text-red-500">Analysis not found</p>;

  const recs: PageRecommendation[] = analysis.pageRecommendations ?? [];
  const posts: BlogPost[] = analysis.blogPosts ?? [];

  return (
    <div className="space-y-6">
      <Header
        title="Analysis Report"
        subtitle={`Started ${formatRelativeTime(analysis.createdAt)}${analysis.completedAt ? ` · Completed ${formatDate(analysis.completedAt)}` : ''}`}
        action={
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {/* Status */}
      <StatusBanner status={analysis.status} errorMsg={analysis.errorMsg} />

      {analysis.status === 'COMPLETED' && (
        <>
          {/* GEO Score + Share of Voice */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {analysis.geoScore ? (
              <GeoScoreCard score={analysis.geoScore} />
            ) : (
              <Card>
                <CardContent className="py-10 text-center text-sm text-gray-500">
                  No GEO score available
                </CardContent>
              </Card>
            )}
            <ShareOfVoiceChart byEngine={sovData?.byEngine ?? {}} />
          </div>

          {/* Page Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Page Recommendations ({recs.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {recs.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-gray-500">
                  No recommendations generated
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {recs.map((r) => (
                    <div key={r.id} className="px-6 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge variant={statusBadge(r.priority)}>{r.priority}</Badge>
                            <span className="text-xs text-gray-500 truncate">{r.pageUrl}</span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 mb-0.5">{r.issue}</p>
                          <p className="text-sm text-gray-600">{r.recommendation}</p>
                          {r.effort && (
                            <p className="mt-1 text-xs text-gray-400">Effort: {r.effort}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={statusBadge(r.status)}>{r.status}</Badge>
                          {r.status !== 'IMPLEMENTED' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                updateRecMutation.mutate({ recId: r.id, status: 'IMPLEMENTED' })
                              }
                            >
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Blog Posts */}
          <Card>
            <CardHeader>
              <CardTitle>Blog Posts ({posts.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {posts.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-gray-500">
                  No blog posts generated
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {posts.map((post) => (
                    <div key={post.id} className="px-6 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge variant={statusBadge(post.status)}>{post.status}</Badge>
                            <Badge variant="info">{post.buyerStage}</Badge>
                            <span className="text-xs text-gray-400">{post.wordCount} words</span>
                          </div>
                          <p className="text-sm font-semibold text-gray-900">{post.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Target query: {post.targetQuery}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {post.status === 'DRAFT' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => approveMutation.mutate(post.id)}
                              loading={approveMutation.isPending}
                            >
                              Approve
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setExpandedPost(expandedPost === post.id ? null : post.id)
                            }
                          >
                            {expandedPost === post.id ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Expanded post content */}
                      {expandedPost === post.id && (
                        <div className="mt-4 space-y-4">
                          <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 max-h-96 overflow-y-auto">
                            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                              {post.content}
                            </pre>
                          </div>

                          {/* Revise form */}
                          {revisePostId === post.id ? (
                            <div className="space-y-3">
                              <textarea
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                rows={3}
                                placeholder="Instructions for revision (e.g. 'Make it more concise', 'Add more examples')"
                                value={reviseInstructions}
                                onChange={(e) => setReviseInstructions(e.target.value)}
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    reviseMutation.mutate({
                                      postId: post.id,
                                      instructions: reviseInstructions,
                                    })
                                  }
                                  loading={reviseMutation.isPending}
                                  disabled={!reviseInstructions.trim()}
                                >
                                  Submit revision
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setRevisePostId(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setRevisePostId(post.id)}
                            >
                              Request revision
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
