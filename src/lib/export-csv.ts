/**
 * Universal CSV export utility for Vendora.
 * Supports both signatures:
 * 1. exportToCsv(filename, rows, customHeaders)
 * 2. exportToCsv({ filename, data/rows, columns/customHeaders })
 * Handles proper RFC 4180 escaping, commas, quotes, and newlines.
 */

export interface ExportCsvColumnConfig {
  header: string;
  key: string;
}

export interface ExportToCsvOptions<T = any> {
  filename: string;
  data?: T[];
  rows?: T[];
  columns?: ExportCsvColumnConfig[] | Record<string, string>;
  customHeaders?: Record<string, string>;
}

export function exportToCsv<T = any>(
  filenameOrOptions: string | ExportToCsvOptions<T>,
  maybeRows?: T[],
  maybeHeaders?: Record<string, string>
): void {
  let filename: string;
  let rows: T[];
  let headerMap: Record<string, string> | undefined;

  if (typeof filenameOrOptions === 'object' && filenameOrOptions !== null) {
    filename = filenameOrOptions.filename;
    rows = (filenameOrOptions.data || filenameOrOptions.rows || []) as T[];
    if (Array.isArray(filenameOrOptions.columns)) {
      headerMap = {};
      for (const col of filenameOrOptions.columns) {
        headerMap[col.key] = col.header;
      }
    } else if (filenameOrOptions.columns) {
      headerMap = filenameOrOptions.columns;
    } else if (filenameOrOptions.customHeaders) {
      headerMap = filenameOrOptions.customHeaders;
    }
  } else {
    filename = filenameOrOptions;
    rows = maybeRows || [];
    headerMap = maybeHeaders;
  }

  if (!rows || rows.length === 0) {
    const headerRow = headerMap ? Object.values(headerMap).join(',') : 'No Data';
    downloadBlob(filename, headerRow);
    return;
  }

  const firstRow = rows[0] as Record<string, unknown>;
  const keys = headerMap ? Object.keys(headerMap) : Object.keys(firstRow);
  const headerLabels = headerMap
    ? Object.values(headerMap)
    : keys.map((k) => k.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()));

  const escapeCell = (val: unknown): string => {
    if (val === null || val === undefined) return '""';
    const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const csvContent = [
    headerLabels.map((h) => `"${h}"`).join(','),
    ...rows.map((row) => {
      const rowObj = (row && typeof row === 'object' ? row : {}) as Record<string, unknown>;
      return keys.map((k) => escapeCell(rowObj[k])).join(',');
    }),
  ].join('\r\n');

  downloadBlob(filename, csvContent);
}

function downloadBlob(filename: string, content: string): void {
  if (typeof window === 'undefined') return;

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
