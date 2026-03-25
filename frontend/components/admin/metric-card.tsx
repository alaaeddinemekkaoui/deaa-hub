import { LucideIcon } from 'lucide-react';

type MetricCardProps = {
  label: string;
  value: number | string;
  hint?: string;
  icon: LucideIcon;
};

export function MetricCard({ label, value, hint, icon: Icon }: MetricCardProps) {
  return (
    <article className="metric-card">
      <div className="metric-card__icon">
        <Icon size={18} />
      </div>
      <div className="space-y-1">
        <p className="metric-card__label">{label}</p>
        <p className="metric-card__value">{value}</p>
        {hint ? <p className="metric-card__hint">{hint}</p> : null}
      </div>
    </article>
  );
}
