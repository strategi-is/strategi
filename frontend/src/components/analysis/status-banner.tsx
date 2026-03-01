'use client';

import { AnalysisStatus } from '@/lib/api';
import { statusLabel } from '@/lib/utils';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';

const STEP_ORDER: AnalysisStatus[] = [
  'PENDING',
  'SCRAPING',
  'QUERYING_AI',
  'SCORING',
  'GENERATING_CONTENT',
  'COMPLETED',
];

interface StatusBannerProps {
  status: AnalysisStatus;
  errorMsg?: string | null;
}

export function StatusBanner({ status, errorMsg }: StatusBannerProps) {
  if (status === 'COMPLETED') {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Analysis completed successfully
      </div>
    );
  }

  if (status === 'FAILED') {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 shrink-0" />
          Analysis failed
        </div>
        {errorMsg && <p className="mt-1 ml-6 text-red-600">{errorMsg}</p>}
      </div>
    );
  }

  const currentStep = STEP_ORDER.indexOf(status);

  return (
    <div className="rounded-lg bg-indigo-50 border border-indigo-200 px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-medium text-indigo-800">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        {statusLabel(status)}
      </div>

      <div className="mt-3 flex items-center gap-1">
        {STEP_ORDER.filter((s) => s !== 'PENDING').map((s) => {
          const idx = STEP_ORDER.indexOf(s);
          const done = currentStep > idx;
          const active = status === s;
          return (
            <div key={s} className="flex flex-1 items-center gap-1">
              <div
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  done ? 'bg-indigo-500' : active ? 'bg-indigo-300' : 'bg-indigo-100'
                }`}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-xs text-indigo-600">
        <Clock className="h-3 w-3" />
        Full analysis typically completes in 3-4 hours
      </div>
    </div>
  );
}
