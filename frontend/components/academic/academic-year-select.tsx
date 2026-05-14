'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AcademicYearOption = {
  id: number;
  label: string;
  isCurrent: boolean;
};

type AcademicYearSelectProps = {
  value: string;
  years: AcademicYearOption[];
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  includeAllOption?: boolean;
  allLabel?: string;
  className?: string;
  disabled?: boolean;
};

export function sortAcademicYearsCurrentFirst(years: AcademicYearOption[]) {
  return [...years].sort((a, b) => {
    if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
    return b.label.localeCompare(a.label);
  });
}

export function getDefaultAcademicYear(years: AcademicYearOption[]) {
  return sortAcademicYearsCurrentFirst(years)[0]?.label ?? '';
}

export function AcademicYearSelect({
  value,
  years,
  onChange,
  label = 'Année académique',
  required = false,
  includeAllOption = false,
  allLabel = 'Toutes les années académiques',
  className,
  disabled,
}: AcademicYearSelectProps) {
  const sortedYears = sortAcademicYearsCurrentFirst(years);
  const currentYear = sortedYears.find((year) => year.isCurrent);

  return (
    <div className={cn('field-stack', className)}>
      <label className="field-label">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      <select
        className={cn(
          'input',
          value && currentYear?.label === value && 'border-emerald-300 bg-emerald-50/60',
        )}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {includeAllOption ? <option value="">{allLabel}</option> : null}
        {!includeAllOption ? <option value="">Sélectionner une année académique</option> : null}
        {sortedYears.map((year) => (
          <option key={year.id} value={year.label}>
            {year.isCurrent ? '★ ' : ''}
            {year.label}
            {year.isCurrent ? ' · Actuelle' : ''}
          </option>
        ))}
      </select>
      {currentYear ? (
        <p className="flex items-center gap-1 text-[11px] font-medium text-emerald-700">
          <Star size={12} fill="currentColor" />
          Année actuelle : {currentYear.label}
        </p>
      ) : null}
    </div>
  );
}
