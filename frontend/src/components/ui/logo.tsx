import { cn } from '@/lib/utils';

interface LogoIconProps {
  className?: string;
}

export function LogoIcon({ className }: LogoIconProps) {
  return (
    <svg
      viewBox="0 0 45 45"
      fill="#f97316"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-7 w-7', className)}
      aria-hidden="true"
    >
      {/* Chess knight — standard Staunton silhouette */}
      <path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18" />
      <path d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,9.506 13.5,8.5 13.5,7.5 C 14.5,6.5 16.5,10 16.5,10 L 18.5,10 C 18.5,10 19.28,8.008 21,7 C 22,7 22,10 22,10" />
      {/* Base */}
      <rect x="7" y="39" width="31" height="4" rx="2" />
    </svg>
  );
}
