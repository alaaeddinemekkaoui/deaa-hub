'use client';

import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export type ExportFormat = 'csv' | 'excel';

type ExportRecordsOptions = {
  rows: Array<Record<string, unknown>>;
  fileName: string;
  format: ExportFormat;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeKey = (prefix: string, key: string) =>
  prefix ? `${prefix}.${key}` : key;

const flattenRow = (
  value: Record<string, unknown>,
  prefix = '',
  acc: Record<string, unknown> = {},
): Record<string, unknown> => {
  Object.entries(value).forEach(([key, rawValue]) => {
    const nextKey = normalizeKey(prefix, key);

    if (rawValue === null || rawValue === undefined) {
      acc[nextKey] = null;
      return;
    }

    if (rawValue instanceof Date) {
      acc[nextKey] = rawValue.toISOString();
      return;
    }

    if (Array.isArray(rawValue)) {
      if (rawValue.length === 0) {
        acc[nextKey] = '';
        return;
      }

      const allPrimitive = rawValue.every(
        (item) =>
          item === null ||
          item === undefined ||
          ['string', 'number', 'boolean'].includes(typeof item),
      );

      acc[nextKey] = allPrimitive
        ? rawValue.map((item) => (item === null || item === undefined ? '' : String(item))).join(' | ')
        : JSON.stringify(rawValue);
      return;
    }

    if (isPlainObject(rawValue)) {
      flattenRow(rawValue, nextKey, acc);
      return;
    }

    acc[nextKey] = rawValue;
  });

  return acc;
};

const normalizeRows = (rows: Array<Record<string, unknown>>) =>
  rows.map((row) => flattenRow(row));

const sanitizeFileName = (value: string) =>
  value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .toLowerCase();

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const exportRecords = ({ rows, fileName, format }: ExportRecordsOptions) => {
  const normalizedRows = normalizeRows(rows);
  const safeFileName = sanitizeFileName(fileName);

  if (format === 'csv') {
    const csv = Papa.unparse(normalizedRows);
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${safeFileName}.csv`);
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(normalizedRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Export');
  XLSX.writeFile(workbook, `${safeFileName}.xlsx`);
};
