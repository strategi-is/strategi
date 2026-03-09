'use client';

import { useQuery } from '@tanstack/react-query';
import { companyApi, Company } from '@/lib/api';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, Building2, Globe, Plus } from 'lucide-react';

export default function CompaniesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: () => companyApi.getAll(),
  });

  const companies: Company[] = data?.data?.data ?? [];

  return (
    <div className="space-y-6">
      <Header
        title="Companies"
        subtitle="Manage your company profiles for GEO analysis"
        action={
          <Link href="/companies/new">
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Add company
            </Button>
          </Link>
        }
      />

      {isLoading ? (
        <div className="text-sm text-gray-500">Loading...</div>
      ) : companies.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Building2 className="mx-auto h-10 w-10 text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">No companies yet. Add one to get started.</p>
            <Link href="/companies/new">
              <Button>
                <Plus className="mr-1.5 h-4 w-4" />
                Add first company
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {companies.map((c) => (
            <Link key={c.id} href={`/companies/${c.id}`}>
              <Card className="hover:border-orange-300 hover:shadow-md transition-all cursor-pointer">
                <CardContent className="flex items-center justify-between py-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100">
                      <Building2 className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{c.name}</p>
                      <p className="text-sm text-gray-500">{c.industry}</p>
                      <div className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                        <Globe className="h-3 w-3" />
                        {c.websiteUrl}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
