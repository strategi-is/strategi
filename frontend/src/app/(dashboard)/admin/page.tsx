'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Users, Building2, BarChart3, ArrowRight, Activity } from 'lucide-react';

interface AdminOverview {
  users: number;
  companies: number;
  analyses: number;
  completedAnalyses: number;
  avgGeoScore: number;
}

export default function AdminPage() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== 'ADMIN') router.replace('/dashboard');
  }, [user, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => adminApi.overview(),
    enabled: user?.role === 'ADMIN',
  });

  const stats: AdminOverview | undefined = data?.data?.data;

  if (user?.role !== 'ADMIN') return null;

  return (
    <div className="space-y-6">
      <Header
        title="Admin Dashboard"
        subtitle="Platform-wide usage and health"
        action={
          <Link
            href="/admin/olostep"
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
          >
            <Activity className="h-4 w-4" />
            Olostep logs
          </Link>
        }
      />

      {isLoading ? (
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
          <StatCard
            label="Total users"
            value={stats?.users ?? 0}
            icon={<Users className="h-5 w-5 text-orange-500" />}
            bg="bg-orange-100"
          />
          <StatCard
            label="Companies"
            value={stats?.companies ?? 0}
            icon={<Building2 className="h-5 w-5 text-blue-600" />}
            bg="bg-blue-100"
          />
          <StatCard
            label="Analyses run"
            value={stats?.analyses ?? 0}
            icon={<BarChart3 className="h-5 w-5 text-green-600" />}
            bg="bg-green-100"
          />
          <StatCard
            label="Avg GEO score"
            value={stats?.avgGeoScore ?? 0}
            suffix="/100"
            icon={<Activity className="h-5 w-5 text-yellow-600" />}
            bg="bg-yellow-100"
          />
        </div>
      )}

      {/* Quick-access cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Analyses</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Total</span>
              <span className="font-semibold text-gray-900">{stats?.analyses ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Completed</span>
              <span className="font-semibold text-green-700">{stats?.completedAnalyses ?? '—'}</span>
            </div>
            {stats && stats.analyses > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Success rate</span>
                <span className="font-semibold text-gray-900">
                  {Math.round((stats.completedAnalyses / stats.analyses) * 100)}%
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Olostep API</CardTitle>
              <Link
                href="/admin/olostep"
                className="text-sm text-orange-500 hover:text-orange-600 flex items-center gap-1"
              >
                View logs <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Monitor API usage, costs, and success rates for the Olostep web scraping service.
            </p>
            <Link
              href="/admin/olostep"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-orange-500 hover:text-orange-600"
            >
              Open Olostep dashboard <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix = '',
  icon,
  bg,
}: {
  label: string;
  value: number;
  suffix?: string;
  icon: React.ReactNode;
  bg: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-5">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${bg}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">
            {value}
            {suffix && <span className="text-base font-medium text-gray-500">{suffix}</span>}
          </p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
