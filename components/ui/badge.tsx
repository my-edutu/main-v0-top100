import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border border-transparent px-3.5 py-1.5 text-[0.75rem] font-semibold uppercase tracking-[0.14em] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-sm shadow-primary/10 hover:bg-primary/90',
        secondary:
          'border-secondary/40 bg-secondary/15 text-secondary hover:bg-secondary/20',
        destructive:
          'border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15',
        success:
          'border-success/30 bg-success/12 text-success hover:bg-success/20',
        warning:
          'border-warning/40 bg-warning/15 text-warning-foreground hover:bg-warning/25',
        info: 'border-info/30 bg-info/12 text-info hover:bg-info/18',
        soft:
          'border-primary/18 bg-primary/10 text-primary hover:bg-primary/16',
        outline:
          'border-border/70 bg-transparent text-muted-foreground hover:border-primary/30 hover:text-primary',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
