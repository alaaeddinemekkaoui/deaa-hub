"use client";

const SEMESTERS = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10"];

type SemesterSelectProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  options?: string[];
  required?: boolean;
  includeEmpty?: boolean;
  emptyLabel?: string;
  disabled?: boolean;
};

export function SemesterSelect({
  value,
  onChange,
  label = "Semestre",
  options = SEMESTERS,
  required = false,
  includeEmpty = true,
  emptyLabel = "— Aucun semestre —",
  disabled,
}: SemesterSelectProps) {
  return (
    <div className="field-stack">
      <label className="field-label">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      <select
        className="input"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {includeEmpty ? <option value="">{emptyLabel}</option> : null}
        {options.map((semester) => (
          <option key={semester} value={semester}>
            {semester}
          </option>
        ))}
      </select>
    </div>
  );
}

export { SEMESTERS };
