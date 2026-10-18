import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-medium ' +
    'transition-colors disabled:pointer-events-none disabled:opacity-50 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-700 ' +
    'focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-oxford-800 text-white hover:bg-oxford-900',
        outline: 'border border-slate-300 bg-white text-oxford-800 hover:bg-slate-50',
        subtle: 'bg-slate-100 text-oxford-800 hover:bg-slate-200',
        ghost: 'text-oxford-700 hover:bg-slate-100',
        brass: 'bg-brass-600 text-white hover:bg-brass-700',
        link: 'text-brass-700 underline underline-offset-2 hover:text-brass-800',
      },
      size: {
        // 44px tall at md and up on touch targets; never below 32px.
        sm: 'h-8 rounded px-2.5 text-xs',
        md: 'h-9 rounded px-3 text-sm',
        lg: 'h-11 rounded px-4 text-sm',
        icon: 'h-9 w-9 rounded',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Component = asChild ? Slot : 'button';
    return (
      <Component
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        type={asChild ? undefined : (type ?? 'button')}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
