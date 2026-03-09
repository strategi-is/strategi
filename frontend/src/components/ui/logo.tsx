import { cn } from '@/lib/utils';

interface LogoIconProps {
  className?: string;
}

export function LogoIcon({ className }: LogoIconProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="#f97316"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-7 w-7', className)}
      aria-hidden="true"
    >
      {/* Chess knight silhouette */}
      <path d="M30,85 L30,75 Q20,70 18,58 Q16,46 24,36 Q28,30 26,22 Q30,18 36,20 Q38,15 44,14 Q50,13 54,18 Q62,16 66,22 Q70,28 66,36 Q72,42 72,52 Q72,64 62,72 L62,75 L70,75 L70,85 Z" />
    </svg>
  );
}
