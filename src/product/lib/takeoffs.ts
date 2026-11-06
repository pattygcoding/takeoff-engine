/**
 * Takeoffs & Ingestion API Client
 */
import { ApiError } from '@/types/api';
import type { AiAssistResult, AiAssistUsage, ColumnDefinition, TakeoffParseResult } from '@/types/models';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface ParseTakeoffPayloadParams {
  fileContent?: string | null;
  fileBase64?: string | null;
  fileName?: string | null;
  sheetName?: string | null;
  tableId?: string | null;
  customMapping?: Record<string, unknown> | null;
  customPreset?: Record<string, string | undefined> | null;
  defaultLaborRate?: number | null;
  /** Passthrough columns already held by the client, so a re-parse keeps user renames/types. */
  customColumns?: ColumnDefinition[] | null;
}

const getAuthHeaders = () => {
  return {
    'Content-Type': 'application/json',
  };
};

export const takeoffsApi = {
  /**
   * Parse CSV or Excel file payload on backend
   */
  async parseTakeoffPayload({
    fileContent,
    fileBase64,
    fileName,
    sheetName,
    tableId,
    customMapping,
    customPreset,
    defaultLaborRate,
    customColumns,
  }: ParseTakeoffPayloadParams): Promise<TakeoffParseResult> {
    const res = await fetch(`${API_BASE_URL}/takeoffs/parse`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        fileContent,
        fileBase64,
        fileName,
        sheetName,
        tableId,
        customMapping,
        customPreset,
        defaultLaborRate,
        customColumns,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to parse takeoff spreadsheet on server.');
    }

    return res.json();
  },

  /**
   * Normalize raw spreadsheet rows with user-confirmed mapping on backend
   */
  async normalizeMapping({
    rawRows,
    mapping,
    defaultLaborRate,
    headers,
    customColumns,
  }: {
    rawRows: unknown[];
    mapping: Record<string, unknown>;
    defaultLaborRate?: number | null;
    /** Source headers of `rawRows`, so passthrough columns can be re-detected on confirm. */
    headers?: string[];
    /** Passthrough columns already held by the client, so renames/types survive a confirm. */
    customColumns?: ColumnDefinition[] | null;
  }) {
    const res = await fetch(`${API_BASE_URL}/takeoffs/normalize-mapping`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        rawRows,
        mapping,
        defaultLaborRate,
        headers,
        customColumns,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to normalize rows on server.');
    }

    return res.json();
  },

  /**
   * Re-extract headers and rows at a specific row index from sample matrix on backend
   */
  async sniffHeaders({ matrix, headerRowIndex }: { matrix: unknown[]; headerRowIndex: number }) {
    const res = await fetch(`${API_BASE_URL}/takeoffs/sniff-headers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        matrix,
        headerRowIndex,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to extract headers on server.');
    }

    return res.json();
  },

  /**
   * Map a spreadsheet's columns with the AI fallback.
   *
   * Sends the same file payload as `parseTakeoffPayload` so the server owns ingestion: the model only
   * chooses the header row and column mapping, and the deterministic engine builds the rows/items.
   * Throws `ApiError` carrying the backend `code` (`AI_PARSE_UPGRADE_REQUIRED`,
   * `AI_PARSE_QUOTA_EXCEEDED`, `AI_PARSE_NO_TABLE`, ...) so the UI can branch on the reason.
   */
  async aiAssist({
    fileContent,
    fileBase64,
    fileName,
    sheetName,
    tableId,
    matrix,
    sheetNames,
    activeSheetName,
    headerRowIndex,
  }: {
    fileContent?: string | null;
    fileBase64?: string | null;
    fileName?: string | null;
    sheetName?: string | null;
    tableId?: string | null;
    /** A sheet matrix the client already holds, so Step 2 can remap without re-uploading. */
    matrix?: string[][] | null;
    sheetNames?: string[];
    activeSheetName?: string;
    headerRowIndex?: number;
  }): Promise<AiAssistResult> {
    const res = await fetch(`${API_BASE_URL}/takeoffs/ai-assist`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        fileContent,
        fileBase64,
        fileName,
        sheetName,
        tableId,
        matrix,
        sheetNames,
        activeSheetName,
        headerRowIndex,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiError(err.error || 'The AI could not map this sheet.', {
        code: err.code,
        status: res.status,
      });
    }

    return res.json();
  },

  /**
   * Current AI mapping allowance for the signed-in user.
   */
  async getAiAssistUsage(): Promise<{ enabled: boolean; model: string; usage: AiAssistUsage }> {
    const res = await fetch(`${API_BASE_URL}/takeoffs/ai-assist/usage`, { headers: getAuthHeaders() });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiError(err.error || 'Could not read the AI mapping allowance.', {
        code: err.code,
        status: res.status,
      });
    }

    return res.json();
  },

  /**
   * Record takeoff export and authorize format tier
   */
  async recordExport(formatId: string | null) {
    const res = await fetch(`${API_BASE_URL}/takeoffs/record-export`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ formatId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiError(err.error || 'Failed to record export', {
        code: err.code,
        requiredTier: err.requiredTier,
        status: res.status,
      });
    }

    return res.json();
  },
};
