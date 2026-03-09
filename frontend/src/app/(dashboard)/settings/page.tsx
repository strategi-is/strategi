'use client';

import { useAuthStore } from '@/store/auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { billingApi } from '@/lib/api';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Bell } from 'lucide-react';

type SubscriptionStatus = 'FREE' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';

interface BillingStatus {
  subscriptionStatus: SubscriptionStatus;
  subscriptionPlan: string | null;
  subscriptionCurrentPeriodEnd: string | null;
}

function statusBadge(status: SubscriptionStatus) {
  switch (status) {
    case 'ACTIVE': return 'success' as const;
    case 'PAST_DUE': return 'warning' as const;
    case 'CANCELED': return 'danger' as const;
    default: return 'default' as const;
  }
}

function statusLabel(status: SubscriptionStatus) {
  switch (status) {
    case 'ACTIVE': return 'Active';
    case 'PAST_DUE': return 'Past due';
    case 'CANCELED': return 'Canceled';
    default: return 'Free plan';
  }
}

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);

  const { data: billingRes } = useQuery({
    queryKey: ['billing', 'status'],
    queryFn: () => billingApi.status(),
  });

  const billing: BillingStatus | undefined = billingRes?.data?.data;

  const checkoutMutation = useMutation({
    mutationFn: () => billingApi.checkout(),
    onSuccess: (res) => {
      const url: string = res.data?.data?.url;
      if (url) window.location.href = url;
    },
  });

  const portalMutation = useMutation({
    mutationFn: () => billingApi.portal(),
    onSuccess: (res) => {
      const url: string = res.data?.data?.url;
      if (url) window.location.href = url;
    },
  });

  const isPro = billing?.subscriptionStatus === 'ACTIVE';
  const isPastDue = billing?.subscriptionStatus === 'PAST_DUE';

  return (
    <div className="space-y-6">
      <Header title="Settings" subtitle="Account and workspace settings" />

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Name</p>
            <p className="text-sm text-gray-900">{user?.name}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Email</p>
            <p className="text-sm text-gray-900">{user?.email}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Role</p>
            <p className="text-sm text-gray-900">{user?.role}</p>
          </div>
        </CardContent>
      </Card>

      {/* Billing */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Billing</CardTitle>
            {billing && (
              <Badge variant={statusBadge(billing.subscriptionStatus)}>
                {statusLabel(billing.subscriptionStatus)}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPro || isPastDue ? (
            <>
              <div className="flex items-center gap-3 rounded-lg bg-orange-50 border border-orange-100 px-4 py-3">
                <Bell className="h-5 w-5 text-orange-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-orange-900">
                    {billing?.subscriptionPlan
                      ? `${billing.subscriptionPlan.charAt(0).toUpperCase()}${billing.subscriptionPlan.slice(1)} plan`
                      : 'Pro plan'}
                  </p>
                  {billing?.subscriptionCurrentPeriodEnd && (
                    <p className="text-xs text-orange-500">
                      Renews {new Date(billing.subscriptionCurrentPeriodEnd).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              {isPastDue && (
                <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
                  Your payment is past due. Please update your payment method to avoid service interruption.
                </div>
              )}
              <Button
                variant="secondary"
                onClick={() => portalMutation.mutate()}
                loading={portalMutation.isPending}
              >
                <CreditCard className="mr-1.5 h-4 w-4" />
                Manage subscription
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-500">
                You&apos;re on the <strong>Free plan</strong>. Upgrade to Pro to unlock unlimited analyses,
                weekly re-analysis, and WordPress publishing.
              </p>
              <Button
                onClick={() => checkoutMutation.mutate()}
                loading={checkoutMutation.isPending}
              >
                <Bell className="mr-1.5 h-4 w-4" />
                Upgrade to Pro
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
