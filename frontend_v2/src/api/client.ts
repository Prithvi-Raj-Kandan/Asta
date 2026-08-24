/**
 * API client for communicating with the Asta backend
 */

const API_BASE_URL = "http://localhost:8000/api/v1";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  business_name: string;
  business_type: string;
  phone?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    business_name: string;
    business_type: string;
    phone?: string;
  };
}

export interface UploadResponse {
  id: string;
  user_id: string;
  filename: string;
  filetype: string;
  filesize: number;
  status: string;
  upload_date: string;
  file_path?: string;
  document_type?: string;
  ocr_engine?: string;
}

export interface GSTR1DraftRow {
  gstin_uin: string;
  trade_name: string;
  invoice_no: string;
  date_of_invoice: string;
  invoice_value: string;
  gst_percent: string;
  taxable_value: string;
  cess: string;
  place_of_supply: string;
  rcm_applicable: string;
  invoice_type: string;
  e_commerce_gstin: string;
}

export interface ExtractionIssue {
  field: string;
  message: string;
  severity: string;
}

export interface UploadDraftResponse extends UploadResponse {
  document_type: string;
  ocr_engine: string;
  draft_row: GSTR1DraftRow;
  extraction_issues: ExtractionIssue[];
}

export interface InvoiceRow {
  id: string;
  document_type: string;
  source_type: string;
  invoice_number: string;
  invoice_date?: string | null;
  party_name?: string | null;
  party_gstin?: string | null;
  taxable_value?: number | null;
  cgst_amount?: number | null;
  sgst_amount?: number | null;
  igst_amount?: number | null;
  total_value?: number | null;
  status: string;
  confirmed_at?: string | null;
}

export interface UploadListRow {
  id: string;
  filename: string;
  filetype: string;
  filesize: number;
  status: string;
  upload_date: string;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage on init
    this.token = localStorage.getItem("auth_token");
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem("auth_token", token);
  }

  getToken(): string | null {
    return this.token;
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem("auth_token");
  }

  private getHeaders(includeAuth = true): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (includeAuth && this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    return headers;
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: this.getHeaders(false),
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.detail || "Login failed";
      console.error("Login error:", errorData);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    this.setToken(data.access_token);
    return data;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: this.getHeaders(false),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.detail || "Registration failed";
      console.error("Registration error:", errorData);
      throw new Error(errorMessage);
    }

    const result = await response.json();
    this.setToken(result.access_token);
    return result;
  }

  async getCurrentUser() {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: "GET",
      headers: this.getHeaders(true),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch user");
    }

    return response.json();
  }

  async uploadFile(file: File, documentType: string): Promise<UploadDraftResponse> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("document_type", documentType);

    const headers: HeadersInit = {};
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}/uploads/`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.detail || `Upload failed (${response.status})`);
    }

    return response.json();
  }

  async confirmUpload(uploadId: string, documentType: string, draftRow: GSTR1DraftRow, extractionIssues: ExtractionIssue[] = []): Promise<InvoiceRow> {
    const response = await fetch(`${API_BASE_URL}/uploads/${uploadId}/confirm`, {
      method: "POST",
      headers: this.getHeaders(true),
      body: JSON.stringify({ document_type: documentType, draft_row: draftRow, extraction_issues: extractionIssues }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Failed to confirm upload");
    }

    return response.json();
  }

  async listUploads() {
    const response = await fetch(`${API_BASE_URL}/uploads/`, {
      method: "GET",
      headers: this.getHeaders(true),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch uploads");
    }

    return response.json();
  }

  async getUploadDrafts(): Promise<UploadDraftResponse[]> {
    const response = await fetch(`${API_BASE_URL}/uploads/`, {
      method: "GET",
      headers: this.getHeaders(true),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch uploads");
    }

    return response.json();
  }

  async getUpload(uploadId: string): Promise<UploadResponse> {
    const response = await fetch(`${API_BASE_URL}/uploads/${uploadId}`, {
      method: "GET",
      headers: this.getHeaders(true),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch upload");
    }

    return response.json();
  }

  async downloadFile(uploadId: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/uploads/${uploadId}/file`, {
      method: "GET",
      headers: this.getHeaders(true),
    });

    if (!response.ok) {
      throw new Error("Failed to download file");
    }

    return response.blob();
  }

  async getFileMetadata(fileId: string) {
    const response = await fetch(`${API_BASE_URL}/files/${fileId}/metadata`, {
      method: "GET",
      headers: this.getHeaders(true),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch metadata");
    }

    return response.json();
  }

  async getGeneratedDocuments(fileId: string) {
    const response = await fetch(`${API_BASE_URL}/files/${fileId}/documents`, {
      method: "GET",
      headers: this.getHeaders(true),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch documents");
    }

    return response.json();
  }

  async getAllGeneratedDocuments() {
    const response = await fetch(`${API_BASE_URL}/files/generated/documents`, {
      method: "GET",
      headers: this.getHeaders(true),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch documents");
    }

    return response.json();
  }

  async listInvoices(): Promise<InvoiceRow[]> {
    const response = await fetch(`${API_BASE_URL}/invoices/`, {
      method: "GET",
      headers: this.getHeaders(true),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch invoices");
    }

    return response.json();
  }

  async previewGstr1(filingPeriod: string): Promise<{ filing_period: string; row_count: number; rows: Record<string, string>[] }> {
    const response = await fetch(`${API_BASE_URL}/filings/gstr1/preview`, {
      method: "POST",
      headers: this.getHeaders(true),
      body: JSON.stringify({ filing_period: filingPeriod }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.detail || "GSTR-1 preview failed");
    }
    return response.json();
  }

  async exportGstr1(filingPeriod: string, format: "csv" | "xlsx" = "csv"): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/filings/gstr1/export`, {
      method: "POST",
      headers: this.getHeaders(true),
      body: JSON.stringify({ filing_period: filingPeriod, format, triggered_by: "user" }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.detail || "GSTR-1 export failed");
    }
    return response.blob();
  }

  async listObligations() {
    const response = await fetch(`${API_BASE_URL}/compliance/obligations`, {
      method: "GET",
      headers: this.getHeaders(true),
    });
    if (!response.ok) throw new Error("Failed to load obligations");
    return response.json();
  }

  async seedObligations(monthsAhead = 3) {
    const response = await fetch(`${API_BASE_URL}/compliance/obligations/seed`, {
      method: "POST",
      headers: this.getHeaders(true),
      body: JSON.stringify({ months_ahead: monthsAhead }),
    });
    if (!response.ok) throw new Error("Failed to seed obligations");
    return response.json();
  }

  async markObligationFiled(id: string, filingReference?: string) {
    const response = await fetch(`${API_BASE_URL}/compliance/obligations/${id}/filed`, {
      method: "POST",
      headers: this.getHeaders(true),
      body: JSON.stringify({ filing_reference: filingReference }),
    });
    if (!response.ok) throw new Error("Failed to mark filed");
    return response.json();
  }

  async listNotifications() {
    const response = await fetch(`${API_BASE_URL}/compliance/notifications`, {
      method: "GET",
      headers: this.getHeaders(true),
    });
    if (!response.ok) throw new Error("Failed to load notifications");
    return response.json();
  }

  async chat(message: string, sessionId?: string) {
    const response = await fetch(`${API_BASE_URL}/chat/`, {
      method: "POST",
      headers: this.getHeaders(true),
      body: JSON.stringify({ message, session_id: sessionId }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.detail || "Chat failed");
    }
    return response.json();
  }

  async getAnalyticsSummary() {
    const response = await fetch(`${API_BASE_URL}/analytics/summary`, {
      method: "GET",
      headers: this.getHeaders(true),
    });
    if (!response.ok) throw new Error("Failed to load analytics");
    return response.json();
  }

  async runAgent(intent: string | null, message: string, payload: Record<string, unknown> = {}) {
    const response = await fetch(`${API_BASE_URL}/agents/run`, {
      method: "POST",
      headers: this.getHeaders(true),
      body: JSON.stringify({ intent, message, payload }),
    });
    if (!response.ok) throw new Error("Agent run failed");
    return response.json();
  }
}

export const apiClient = new ApiClient();
