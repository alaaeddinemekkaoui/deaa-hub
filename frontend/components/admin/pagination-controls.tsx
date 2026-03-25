type PaginationControlsProps = {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
};

export function PaginationControls({
  page,
  totalPages,
  total,
  onPageChange,
}: PaginationControlsProps) {
  const safeTotalPages = Math.max(totalPages, 1);

  return (
    <div className="flex flex-col gap-3 border-t border-white/70 pt-4 md:flex-row md:items-center md:justify-between">
      <p className="text-sm text-slate-500">
        {total} record{total === 1 ? '' : 's'} • page {page} of {safeTotalPages}
      </p>
      <div className="flex items-center gap-2">
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
