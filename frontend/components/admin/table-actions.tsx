import Link from 'next/link';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type ActionTone = 'profile' | 'docs' | 'edit' | 'account' | 'delete';

const actionToneClass: Record<ActionTone, string> = {
  profile: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
  docs: 'border-sky-200 text-sky-700 hover:bg-sky-50',
  edit: 'border-amber-200 text-amber-700 hover:bg-amber-50',
  account: 'border-indigo-200 text-indigo-700 hover:bg-indigo-50',
  delete: 'border-red-200 text-red-700 hover:bg-red-50',
};

const actionIconClass =
  'inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-white transition disabled:pointer-events-none disabled:opacity-50';

type ActionIconContentProps = {
  icon: LucideIcon;
};

function ActionIconContent({ icon: Icon }: ActionIconContentProps) {
  return <Icon size={15} />;
}

export function TableActionGrid({ children }: { children: ReactNode }) {
  return <div className="grid w-fit grid-cols-2 gap-2">{children}</div>;
}

type TableActionLinkProps = {
  href: string;
  icon: LucideIcon;
  tone: ActionTone;
  label: string;
} & Omit<ComponentPropsWithoutRef<typeof Link>, 'href' | 'className' | 'children' | 'aria-label' | 'title'>;

export function TableActionLink({
  href,
  icon,
  tone,
  label,
  ...props
}: TableActionLinkProps) {
  return (
    <Link
      className={cn(actionIconClass, actionToneClass[tone])}
      href={href}
      title={label}
      aria-label={label}
      {...props}
    >
      <ActionIconContent icon={icon} />
    </Link>
  );
}

type TableActionButtonProps = {
  icon: LucideIcon;
  tone: ActionTone;
  label: string;
} & Omit<ComponentPropsWithoutRef<'button'>, 'className' | 'children' | 'aria-label' | 'title'>;

export function TableActionButton({
  icon,
  tone,
  label,
  type = 'button',
  ...props
}: TableActionButtonProps) {
  return (
    <button
      className={cn(actionIconClass, actionToneClass[tone])}
      type={type}
      title={label}
      aria-label={label}
      {...props}
    >
      <ActionIconContent icon={icon} />
    </button>
  );
}
