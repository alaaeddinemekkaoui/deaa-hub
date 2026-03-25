import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  description,
  className,
}: PageHeaderProps) {
  return (
    <section className={cn('space-y-2', className)}>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
        {title}
      </h1>
      <p className="max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
        {description}
      </p>
    </section>
  );
}
