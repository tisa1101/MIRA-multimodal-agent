import type { UserProfile, PlatformMetrics, PaymentTransaction } from "../types/auth";
/**
 * MIRA Frontend REST API Client
 * Connects to Phase 2 FastAPI backend (default: http://127.0.0.1:8000)
 */

export interface HealthCheckResponse {
  status: string;
  agent: string;
  version: string;
  timestamp: string;
  uptime_seconds: number;
  challenge: string;
  loop: string[];
  services: {
    api: string;
    context_core: string;
    streaming: string;
  };
}

export interface ChatRequestPayload {
  message: string;
  session_id?: string;
  my_day_context?: Record<string, unknown>;
  documents_context?: Array<Record<string, unknown>>;
}

export interface ChatResponsePayload {
  session_id: string;
  message: string;
  response: string;
  timestamp: string;
}

export interface ContextResponsePayload {
  session_id: string;
  working_memory_summary?: string;
  working_memory?: Array<Record<string, unknown>>;
  modalities?: Record<string, unknown>;
  active_anchors?: Array<Record<string, unknown>>;
  token_budget?: Record<string, unknown>;
  environment?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export class MiraApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    const metaEnv =
      typeof import.meta !== 'undefined'
        ? (import.meta as unknown as { env?: Record<string, string> }).env
        : undefined;

    let defaultUrl = 'http://127.0.0.1:8000';
    if (
      typeof window !== 'undefined' &&
      window.location &&
      window.location.hostname &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      defaultUrl = window.location.origin;
    }

    this.baseUrl = (baseUrl || metaEnv?.VITE_API_URL || defaultUrl).replace(/\/+$/, '');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  /**
   * Check backend health and agent foundation status
   */
  public async checkHealth(): Promise<HealthCheckResponse> {
    const res = await fetch(`${this.baseUrl}/api/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`Health check failed [${res.status}]: ${errText}`);
    }
    return res.json();
  }

  /**
   * Send a chat message to the Gemini-backed chat endpoint with My Day and Document RAG grounding
   */
  public async sendChatMessage(
    message: string,
    sessionId?: string,
    myDayContext?: Record<string, unknown>,
    documentsContext?: Array<Record<string, unknown>>
  ): Promise<ChatResponsePayload> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        session_id: sessionId,
        my_day_context: myDayContext,
        documents_context: documentsContext,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`Chat request failed [${res.status}]: ${errText}`);
    }
    return res.json();
  }

  /**
   * Sync My Day schedule, tasks, reminders, and reflections to ContextCore
   */
  public async syncMyDay(
    myDayContext: Record<string, unknown>,
    sessionId?: string
  ): Promise<{ status: string; session_id: string; message: string; timestamp: string }> {
    const res = await fetch(`${this.baseUrl}/api/myday/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ my_day_context: myDayContext, session_id: sessionId }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`Sync My Day failed [${res.status}]: ${errText}`);
    }
    return res.json();
  }

  /**
   * Retrieve ContextCore state for a given session
   */
  public async getContext(sessionId: string): Promise<ContextResponsePayload> {
    const res = await fetch(`${this.baseUrl}/api/context/${encodeURIComponent(sessionId)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`Get context failed [${res.status}]: ${errText}`);
    }
    return res.json();
  }

  /**
   * Create or update ContextCore state in memory
   */
  public async saveContext(payload: Record<string, unknown>): Promise<ContextResponsePayload> {
    const res = await fetch(`${this.baseUrl}/api/context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`Save context failed [${res.status}]: ${errText}`);
    }
    return res.json();
  }

  /**
   * Analyze a real image / video frame using Gemini Multimodal Vision
   */
  public async analyzeVision(
    imageBase64: string,
    mimeType: string = 'image/jpeg',
    prompt?: string,
    sessionId?: string
  ): Promise<{
    session_id: string;
    description: string;
    detected_objects: Array<{
      id: string;
      label: string;
      confidence: number;
      box: [number, number, number, number];
      category: 'ui_element' | 'text_block' | 'human_face' | 'physical_object' | 'error_region';
    }>;
    ocr_snippets: Array<{ id: string; text: string; location: string }>;
    anchors: Array<Record<string, unknown>>;
    timestamp: string;
  }> {
    const res = await fetch(`${this.baseUrl}/api/vision/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_base64: imageBase64,
        mime_type: mimeType,
        prompt,
        session_id: sessionId,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`Vision analysis failed [${res.status}]: ${errText}`);
    }
    return res.json();
  }

  /**
   * Upload and ingest a real document (PDF, DOCX, TXT, MD, etc.) into ContextCore
   */
  public async uploadDocument(
    file: File,
    sessionId?: string
  ): Promise<{
    document_id: string;
    session_id: string;
    filename: string;
    file_size: number;
    token_count: number;
    chunks_count: number;
    summary: string;
    content_snippet: string;
    chunks: Array<{
      chunk_id: string;
      index: number;
      word_count: number;
      token_weight: number;
      content: string;
    }>;
    anchor: Record<string, unknown>;
    timestamp: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    if (sessionId) {
      formData.append('session_id', sessionId);
    }

    const res = await fetch(`${this.baseUrl}/api/documents/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`Document upload failed [${res.status}]: ${errText}`);
    }
    return res.json();
  }

  /**
   * Retrieve all ingested documents for a session
   */
  public async getDocuments(sessionId: string): Promise<{
    session_id: string;
    documents: Array<Record<string, unknown>>;
    count: number;
  }> {
    const res = await fetch(`${this.baseUrl}/api/documents/${encodeURIComponent(sessionId)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`Get documents failed [${res.status}]: ${errText}`);
    }
    return res.json();
  }

  /**
   * Delete an ingested document from ContextCore
   */
  public async deleteDocument(
    sessionId: string,
    documentId: string
  ): Promise<{ session_id: string; deleted_document_id: string; status: string }> {
    const res = await fetch(
      `${this.baseUrl}/api/documents/${encodeURIComponent(sessionId)}/${encodeURIComponent(documentId)}`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      }
    );
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`Delete document failed [${res.status}]: ${errText}`);
    }
    return res.json();
  }

  /**
   * Execute an approved action tool / Python sandbox script
   */
  public async executeAction(
    actionId: string,
    toolName: string,
    parameters: Record<string, unknown> = {},
    sessionId?: string
  ): Promise<{
    action_id: string;
    session_id: string;
    tool_name: string;
    status: string;
    output: unknown;
    verification_score: number;
    verification_details: Record<string, unknown>;
    execution_time_ms: number;
    timestamp: string;
  }> {
    const res = await fetch(`${this.baseUrl}/api/actions/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action_id: actionId,
        tool_name: toolName,
        parameters,
        session_id: sessionId,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`Action execution failed [${res.status}]: ${errText}`);
    }
    return res.json();
  }
  /**
   * Authenticate or register via Google Identity Services
   */
  public async googleAuth(payload: {
    email: string;
    name: string;
    picture?: string;
    google_id?: string;
    id_token?: string;
  }): Promise<{
    status: string;
    user: UserProfile;
    session_id: string;
    is_new: boolean;
  }> {
    const res = await fetch(`${this.baseUrl}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`Google authentication failed [${res.status}]: ${errText}`);
    }
    return res.json();
  }

  /**
   * Create Razorpay / payment order for Elite Membership (₹1/mo)
   */
  public async createPaymentOrder(payload: {
    user_id: string;
    email: string;
    plan_name?: string;
    amount_inr?: number;
  }): Promise<{
    status: string;
    order_id: string;
    amount: number;
    currency: string;
    key_id: string;
    notes?: Record<string, string>;
  }> {
    const res = await fetch(`${this.baseUrl}/api/payment/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`Create payment order failed [${res.status}]: ${errText}`);
    }
    return res.json();
  }

  /**
   * Verify Razorpay payment and activate Elite status
   */
  public async verifyPayment(payload: {
    order_id: string;
    payment_id: string;
    user_id: string;
    signature?: string;
    amount_inr?: number;
  }): Promise<{
    status: string;
    subscription: Record<string, unknown>;
    transaction: PaymentTransaction;
    message: string;
  }> {
    const res = await fetch(`${this.baseUrl}/api/payment/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`Payment verification failed [${res.status}]: ${errText}`);
    }
    return res.json();
  }

  /**
   * Get Platform Overview Metrics & KPI stats for Admin Dashboard
   */
  public async getAdminStats(): Promise<{
    status: string;
    metrics: PlatformMetrics;
    system: Record<string, unknown>;
  }> {
    const res = await fetch(`${this.baseUrl}/api/admin/stats`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`Fetch admin stats failed [${res.status}]: ${errText}`);
    }
    return res.json();
  }

  /**
   * Fetch all registered users for Admin Control Center
   */
  public async getAdminUsers(): Promise<{
    status: string;
    total: number;
    users: UserProfile[];
  }> {
    const res = await fetch(`${this.baseUrl}/api/admin/users`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`Fetch admin users failed [${res.status}]: ${errText}`);
    }
    return res.json();
  }

  /**
   * Toggle a user's Elite membership tier
   */
  public async toggleUserElite(userId: string, isElite?: boolean): Promise<{
    status: string;
    user: UserProfile;
    is_elite: boolean;
    message: string;
  }> {
    const res = await fetch(`${this.baseUrl}/api/admin/users/toggle-elite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, is_elite: isElite }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`Toggle elite status failed [${res.status}]: ${errText}`);
    }
    return res.json();
  }

  /**
   * Fetch all payment audit records / transactions
   */
  public async getAdminTransactions(): Promise<{
    status: string;
    total: number;
    transactions: PaymentTransaction[];
  }> {
    const res = await fetch(`${this.baseUrl}/api/admin/transactions`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`Fetch admin transactions failed [${res.status}]: ${errText}`);
    }
    return res.json();
  }
}
export const apiClient = new MiraApiClient();
