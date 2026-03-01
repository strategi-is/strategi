'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

interface OlostepStats {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  totalCredits: number;
  avgResponseMs: number;
}

interface OlostepLog {
  id: string;
  url: string;
  status: number;
  responseTimeMs: number;
  creditsUsed: number | null;
  success: boolean;
  errorMsg: string | null;
  calledAt: string;
}

export default function OlostepPage() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== 'ADMIN') router.replace('/dashboard');
  }, [user, router]);

  const { data: statsRes, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'olostep-stats'],
    queryFn: () => adminApi.olostepStats(30),
    enabled: user?.role === 'ADMIN',
  });

  const { data: logsRes, isLoading: logsLoading } = useQuery({
    queryKey: ['admin', 'olostep-logs'],
    queryFn: () => adminApi.olostepLogs(),
    enabled: user?.role === 'ADMIN',
  });

  const stats: OlostepStats | undefined = statsRes?.data?.data;
  const logs: OlostepLog[] = logsRes?.data?.data ?? [];

  if (user?.role !== 'ADMIN') return null;

  return (
    <div className="space-y-6">
      <Header
        title="Olostep API"
        subtitle="Usage stats and recent logs (last 30 days)"
        action={
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to admin
          </Link>
        }
      />

      {/* Stats */}
      {statsLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="py-5">
                <div className="h-8 w-16 animate-pulse rounded bg-gray-200 mb-1" />
                <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MetricCard label="Total calls" value={stats?.totalCalls ?? 0} />
          <MetricCard label="Successful" value={stats?.successfulCalls ?? 0} valueClass="text-green-700" />
          <MetricCard label="Failed" value={stats?.failedCalls ?? 0} valueClass="text-red-600" />
          <MetricCard
            label="Credits used"
            value={stats ? stats.totalCredits.toFixed(2) : '—'}
          />
        </div>
      )}

      {/* Logs table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent API Calls</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {logsLoading ? (
            <div className="px-6 py-8 text-center text-sm text-gray-500">Loading…</div>
          ) : logs.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-gray-500">No API calls logged yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">URL</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">HTTP</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Time (ms)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Credits</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Called</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {log.success ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate text-gray-700" title={log.url}>
                        {log.url}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={log.status >= 200 && log.status < 300 ? 'success' : 'danger'}>
                          {log.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{log.responseTimeMs}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {log.creditsUsed != null ? log.creditsUsed.toFixed(3) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {formatRelativeTime(log.calledAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  label,
  value,
  valueClass = 'text-gray-900',
}: {
  label: string;
  value: number | string;
  valueClass?: string;
}) {
  return (
    <Card>
      <CardContent className="py-5">
        <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </CardContent>
    </Card>
  );
}
