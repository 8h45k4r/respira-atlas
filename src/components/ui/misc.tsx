import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn('label-caps block', className)}
    {...props}
  />
));
Label.displayName = 'Label';

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn('inline-flex items-center gap-1 border-b border-slate-200', className)}
    {...props}
  />
));
TabsList.displayName = 'TabsList';

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'relative -mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium ' +
        'text-slate-600 transition-colors hover:text-oxford-800 ' +
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-700 ' +
        'data-[state=active]:border-brass-700 data-[state=active]:text-oxford-900',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = 'TabsTrigger';

export const TabsContent = TabsPrimitive.Content;

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { title: string; description?: string }
>(({ className, children, title, description, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay
      className="fixed inset-0 z-50 bg-oxford-950/40 animate-fade-in"
    />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 z-50 flex max-h-[88vh] w-[min(56rem,94vw)] -translate-x-1/2 ' +
          '-translate-y-1/2 flex-col overflow-hidden border border-slate-200 bg-white ' +
          'shadow-xl animate-slide-up',
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-3">
        <div>
          <DialogPrimitive.Title className="text-base font-semibold text-oxford-900">
            {title}
          </DialogPrimitive.Title>
          {description ? (
            <DialogPrimitive.Description className="mt-0.5 text-xs text-slate-600">
              {description}
            </DialogPrimitive.Description>
          ) : null}
        </div>
        <DialogPrimitive.Close
          className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-oxford-800
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-700"
          aria-label="Close"
        >
          <X className="h-4 w-4" aria-hidden />
        </DialogPrimitive.Close>
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-4">{children}</div>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = 'DialogContent';

export function Badge({
  children, tone = 'neutral', className,
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'brass' | 'warn' | 'muted';
  className?: string;
}) {
  const tones = {
    neutral: 'border-slate-300 bg-slate-50 text-slate-700',
    brass: 'border-brass-300 bg-brass-50 text-brass-800',
    warn: 'border-amber-300 bg-amber-50 text-amber-900',
    muted: 'border-slate-200 bg-white text-slate-500',
  } as const;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-2xs font-medium',
        tones[tone], className,
      )}
    >
      {children}
    </span>
  );
}

/** Announces selection and data changes to screen readers. */
export function LiveRegion({ message }: { message: string }) {
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
}
