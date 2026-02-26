import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-stone-600 text-stone-100',
        secondary: 'border-transparent bg-stone-700 text-stone-300',
        destructive: 'border-transparent bg-red-800 text-red-100',
        success: 'border-transparent bg-emerald-800 text-emerald-100',
        warning: 'border-transparent bg-amber-800 text-amber-100',
        outline: 'border-stone-600 text-stone-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };