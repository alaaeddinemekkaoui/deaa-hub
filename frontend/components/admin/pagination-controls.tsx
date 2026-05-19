export type PageSizeValue = number | 'all';

type PaginationControlsProps = {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  pageSize?: PageSizeValue;
  pageSizeOptions?: PageSizeValue[];
  onPageSizeChange?: (pageSize: PageSizeValue) => void;
};

export function PaginationControls({
  page,
  totalPages,
  total,
  onPageChange,
  pageSize,
  pageSizeOptions = [5, 10, 25, 50, 100, 'all'],
  onPageSizeChange,
}: PaginationControlsProps) {
  const safeTotalPages = Math.max(totalPages, 1);

  return (
    <div className="flex flex-col gap-3 border-t border-white/70 pt-4 md:flex-row md:items-center md:justify-between">
      <p className="text-sm text-slate-500">
        {total} record{total === 1 ? '' : 's'} • page {page} of {safeTotalPages}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {onPageSizeChange && pageSize !== undefined ? (
          <label className="flex items-center gap-2 text-sm text-slate-500">
            <span>Par page</span>
            <select
              className="input h-9 w-24 py-1 text-sm"
              value={String(pageSize)}
              onChange={(event) => {
                const value = event.target.value;
                onPageSizeChange(value === 'all' ? 'all' : Number(value));
              }}
            >
              {pageSizeOptions.map((option) => (
                <option key={String(option)} value={String(option)}>
                  {option === 'all' ? 'Tout' : option}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button
          className="btn-outline"
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Previous
        </button>
        <button
          className="btn-outline"
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= safeTotalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
