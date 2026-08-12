const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("canopy_token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed: ${res.status}`);
  }

  return res.json();
}

// ===== AUTH =====
export interface UserDetail {
  nis: string;
  name: string;
  major: string;
  class: string;
  role: string;
  division_id: number | null;
  management_period: string;
}

export interface LoginResponse {
  token: string;
  user: UserDetail;
}

export const api = {
  // Auth
  login: (nis: string, password: string) =>
    request<LoginResponse>("/user/login", {
      method: "POST",
      body: JSON.stringify({ nis, password }),
    }),

  register: (data: {
    nis: string;
    name: string;
    major: string;
    class: string;
    role: string;
    division_id?: number;
    management_period: string;
    password: string;
  }) =>
    request<{ message: string }>("/user/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getProfile: () => request<UserDetail>("/user/profile"),

  listUsers: () =>
    request<{ users: UserDetail[] }>("/users"),

  // Divisions
  listDivisions: () =>
    request<{
      divisions: {
        id: number;
        name: string;
        description: string;
        chair_nis: string | null;
      }[];
    }>("/division"),

  // Proker
  listProkers: () =>
    request<{
      prokers: {
        id: number;
        name: string;
        description: string;
        division_id: number;
        budget: number;
        status: string;
        start_date: string;
        end_date: string;
        created_by: string;
        created_at: string;
      }[];
    }>("/prokers"),

  createProker: (data: {
    name: string;
    description: string;
    division_id: number;
    budget: number;
    start_date: string;
    end_date: string;
  }) =>
    request<unknown>("/proker", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Approvals
  submitProposal: (proker_id: number) =>
    request<{ message: string }>("/approvals/submit-proposal", {
      method: "POST",
      body: JSON.stringify({ proker_id }),
    }),

  listPendingApprovals: () =>
    request<{
      approvals: {
        id: number;
        document_type: string;
        document_id: number;
        step: number;
        status: string;
        approver_role: string;
        approved_by: string | null;
        revision_notes: string | null;
        created_at: string;
        updated_at: string;
      }[];
    }>("/approvals/list-pending"),

  actionApproval: (id: number, status: string, revision_notes: string) =>
    request<{ message: string }>(`/approvals/action/${id}`, {
      method: "POST",
      body: JSON.stringify({ status, revision_notes }),
    }),

  // Finance
  listTransactions: () =>
    request<{
      transactions: {
        id: number;
        date: string;
        type: string;
        amount: number;
        description: string;
        proker_id: number | null;
        proof_url: string | null;
        created_by: string;
        created_at: string;
      }[];
      total_debit: number;
      total_credit: number;
      balance: number;
    }>("/finance/transactions"),

  createTransaction: (data: {
    date: string;
    type: string;
    amount: number;
    description: string;
    proker_id?: number;
    proof_url?: string;
  }) =>
    request<unknown>("/finance/transaction", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getBalance: () =>
    request<{
      total_debit: number;
      total_credit: number;
      balance: number;
    }>("/finance/balance"),

  // Meetings
  listMeetings: () =>
    request<{
      meetings: {
        id: number;
        title: string;
        schedule: string;
        division_id: number | null;
        proker_id: number | null;
        minutes: string;
        qc_status: string;
        created_by: string;
        created_at: string;
      }[];
    }>("/meetings"),

  createMeeting: (data: {
    title: string;
    schedule: string;
    division_id?: number;
    proker_id?: number;
  }) =>
    request<unknown>("/meeting", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Assets
  listAssets: () =>
    request<{
      assets: {
        id: number;
        name: string;
        description: string;
        status: string;
        created_at: string;
      }[];
    }>("/assets"),

  bookAsset: (data: {
    asset_id: number;
    start_time: string;
    end_time: string;
    proker_id?: number;
  }) =>
    request<unknown>("/asset/book", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Public
  listEvents: () =>
    request<{
      events: {
        id: number;
        name: string;
        description: string;
        date: string;
        created_by: string;
        created_at: string;
      }[];
    }>("/public/events"),

  listAspirations: () =>
    request<{
      aspirations: {
        id: number;
        content: string;
        is_anonymous: boolean;
        user_nis: string | null;
        status: string;
        created_at: string;
      }[];
    }>("/public/aspirations"),

  submitAspiration: (content: string, is_anonymous: boolean) =>
    request<unknown>("/public/aspiration", {
      method: "POST",
      body: JSON.stringify({ content, is_anonymous }),
    }),

  // Handover
  listHandovers: () =>
    request<{
      handovers: {
        id: number;
        period: string;
        final_balance: number;
        unfinished_proker: unknown[];
        vendor_contacts: unknown[];
        signature_old_ketua: string;
        signature_new_ketua: string;
        signature_pembina: string;
        created_at: string;
      }[];
    }>("/handovers"),
};
