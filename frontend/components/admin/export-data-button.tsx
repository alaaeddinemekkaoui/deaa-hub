'use client';

import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { ModalShell } from '@/components/admin/modal-shell';
import { exportRecords, ExportFormat } from '@/lib/export';
import { api, PaginatedResponse } from '@/services/api';

type ExportDataButtonProps = {
  label?: string;
};

const EXPORTABLE_ROUTES = new Set([
  '/activity-logs',
  '/classes',
  '/dashboard',
  '/departments',
  '/documents',
  '/filieres',
  '/laureates',
  '/rooms',
  '/students',
  '/teachers',
  '/users',
  '/workflows',
]);

const buildTimeStamp = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}-${hour}${minute}`;
};

const routeToFileBase = (pathname: string) => {
  if (pathname === '/dashboard') {
    return 'dashboard-overview';
  }

  return pathname.replace(/^\//, '').replace(/\//g, '-') || 'export';
};

async function fetchPaginatedRows(
  endpoint: string,
  params: Record<string, unknown> = {},
): Promise<Array<Record<string, unknown>>> {
  const rows: Array<Record<string, unknown>> = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await api.get<PaginatedResponse<Record<string, unknown>>>(
      endpoint,
      {
        params: {
          page,
          limit: 200,
          ...params,
        },
      },
    );

    rows.push(...response.data.data);
    hasNextPage = response.data.meta.hasNextPage;
    page += 1;

    if (page > 100) {
      break;
    }
  }

  return rows;
}

async function fetchExportRows(pathname: string): Promise<Array<Record<string, unknown>>> {
  switch (pathname) {
    case '/activity-logs': {
      const response = await api.get<Array<Record<string, unknown>>>('/activity-logs');
      return response.data;
    }
    case '/classes':
      return fetchPaginatedRows('/classes', {
        sortBy: 'year',
        sortOrder: 'asc',
      });
    case '/dashboard': {
      const response = await api.get<Record<string, unknown>>('/dashboard/overview');
      return [response.data];
    }
    case '/departments':
      return fetchPaginatedRows('/departments', {
        sortBy: 'name',
        sortOrder: 'asc',
      });
    case '/documents': {
      const response = await api.get<Array<Record<string, unknown>>>('/documents');
      return response.data;
    }
    case '/filieres':
      return fetchPaginatedRows('/filieres', {
        sortBy: 'name',
        sortOrder: 'asc',
      });
    case '/laureates': {
      const response = await api.get<Array<Record<string, unknown>>>('/laureates');
      return response.data;
    }
    case '/rooms': {
      const response = await api.get<Array<Record<string, unknown>>>('/rooms');
      return response.data;
    }
    case '/students':
      return fetchPaginatedRows('/students');
    case '/teachers':
      return fetchPaginatedRows('/teachers', {
        sortBy: 'lastName',
        sortOrder: 'asc',
      });
    case '/users': {
      const response = await api.get<Array<Record<string, unknown>>>('/users');
      return response.data;
    }
    case '/workflows': {
      const response = await api.get<Array<Record<string, unknown>>>('/workflows');
      return response.data;
    }
    default:
      return [];
  }
}

export function ExportDataButton({ label = 'Export' }: ExportDataButtonProps) {
  const pathname = usePathname();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [isExporting, setIsExporting] = useState(false);
  const isExportSupported = useMemo(
    () => EXPORTABLE_ROUTES.has(pathname),
    [pathname],
  );

  if (!isExportSupported) {
    return null;
  }

  const handleExport = async () => {
    if (isExporting) {
      return;
    }

    setIsExporting(true);
    try {
      const rows = await fetchExportRows(pathname);
      if (!rows.length) {
        return;
      }

      exportRecords({
        rows,
        format: exportFormat,
        fileName: `${routeToFileBase(pathname)}-${buildTimeStamp()}`,
      });

      setIsExportModalOpen(false);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <button
        className="btn-outline gap-2"
        type="button"
        onClick={() => setIsExportModalOpen(true)}
      >
        <Download size={16} />
        {label}
      </button>

      <ModalShell
        open={isExportModalOpen}
        title="Export data"
        description="Choose your export format. The file includes all records for this section."
        onClose={() => setIsExportModalOpen(false)}
        footer={
          <>
            <button
              className="btn-primary"
              type="button"
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? 'Exporting...' : 'Export now'}
            </button>
            <button
              className="btn-outline"
              type="button"
              onClick={() => setIsExportModalOpen(false)}
            >
              Cancel
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            className={`rounded-2xl border px-4 py-4 text-left transition ${
              exportFormat === 'csv'
                ? 'border-emerald-300 bg-emerald-50'
                : 'border-slate-200 bg-white hover:border-emerald-200'
            }`}
            onClick={() => setExportFormat('csv')}
          >
            <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <FileText size={16} />
            </div>
            <p className="font-medium text-slate-900">CSV</p>
            <p className="text-sm text-slate-500">Lightweight and spreadsheet-friendly.</p>
          </button>

          <button
            type="button"
            className={`rounded-2xl border px-4 py-4 text-left transition ${
              exportFormat === 'excel'
                ? 'border-emerald-300 bg-emerald-50'
                : 'border-slate-200 bg-white hover:border-emerald-200'
            }`}
            onClick={() => setExportFormat('excel')}
          >
            <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <FileSpreadsheet size={16} />
            </div>
            <p className="font-medium text-slate-900">Excel</p>
            <p className="text-sm text-slate-500">Downloads as .xlsx for richer table handling.</p>
          </button>
        </div>
      </ModalShell>
    </>
  );
}
