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

  async uploadFile(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

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
      throw new Error("Upload failed");
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
}

export const apiClient = new ApiClient();
