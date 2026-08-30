/**
 * Takeoffs & Ingestion API Client
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('takeoff_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  }) {
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
  async normalizeMapping({ rawRows, mapping, defaultLaborRate }) {
    const res = await fetch(`${API_BASE_URL}/takeoffs/normalize-mapping`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        rawRows,
        mapping,
        defaultLaborRate,
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
  async sniffHeaders({ matrix, headerRowIndex }) {
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
   * Record takeoff export and authorize format tier
   */
  async recordExport(formatId) {
    const res = await fetch(`${API_BASE_URL}/takeoffs/record-export`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ formatId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const error = new Error(err.error || 'Failed to record export');
      error.code = err.code;
      error.requiredTier = err.requiredTier;
      error.status = res.status;
      throw error;
    }

    return res.json();
  },
};
