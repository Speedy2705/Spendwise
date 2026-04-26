import { ExpenseCreatePayload, ExpenseListResponse } from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

async function apiRequest<T>(
  path: string,
  init: RequestInit,
  { retries = 0 }: { retries?: number } = {}
): Promise<T> {
  let attempt = 0;

  while (true) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ detail: "Request failed" }));
        throw new Error(body.detail || "Request failed");
      }

      return (await response.json()) as T;
    } catch (error) {
      if (attempt >= retries) {
        throw error;
      }
      attempt += 1;
      await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
    } finally {
      clearTimeout(timeout);
    }
  }
}

export async function signup(full_name: string, email: string, password: string) {
  return apiRequest<{ access_token: string }>("/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ full_name, email, password }),
  });
}

export async function login(email: string, password: string) {
  return apiRequest<{ access_token: string }>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export async function listExpenses(token: string, category?: string, sort?: string) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (sort) params.set("sort", sort);
  const query = params.toString() ? `?${params.toString()}` : "";

  return apiRequest<ExpenseListResponse>(`/expenses${query}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }, { retries: 1 });
}

export async function createExpense(
  token: string,
  payload: ExpenseCreatePayload,
  idempotencyKey: string
) {
  return apiRequest("/expenses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
}
