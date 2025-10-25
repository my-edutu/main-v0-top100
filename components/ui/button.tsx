import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-3xl text-base font-semibold tracking-tight ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 hover:shadow-lg active:translate-y-[1px]',
        destructive:
          'bg-destructive text-destructive-foreground shadow-md shadow-destructive/20 hover:bg-destructive/90 active:translate-y-[1px]',
        outline:
          'border border-border/70 bg-surface text-foreground shadow-sm hover:border-primary/30 hover:text-primary',
        secondary:
          'bg-secondary text-secondary-foreground shadow-md shadow-secondary/20 hover:bg-secondary/90 active:translate-y-[1px]',
        ghost:
          'bg-transparent text-foreground hover:bg-primary/8 hover:text-primary',
        link: 'text-primary underline underline-offset-8 hover:text-primary/70',
        soft:
          'bg-primary/12 text-primary shadow-sm shadow-primary/10 backdrop-blur-sm hover:bg-primary/16',
      },
      size: {
        default: 'h-12 px-6 text-base',
        sm: 'h-10 px-5 text-sm',
        lg: 'h-14 px-8 text-lg',
        icon: 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
