"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ExpenseForm from "@/components/ExpenseForm";
import ExpenseTable from "@/components/ExpenseTable";
import Toast from "@/components/Toast";
import { listExpenses } from "@/lib/api";
import { clearToken, getToken, getUserDisplayName } from "@/lib/auth";
import { consumeFlashMessage, setFlashMessage } from "@/lib/flash";
import { Expense } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [total, setTotal] = useState("0.00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("");
  const [sortDateDesc, setSortDateDesc] = useState(true);
  const [displayName, setDisplayName] = useState("User");
  const [toast, setToast] = useState("");

  useEffect(() => {
    const t = getToken();
    if (!t) {
      router.replace("/login");
      return;
    }
    setToken(t);
    setDisplayName(getUserDisplayName());
    setToast(consumeFlashMessage());
  }, [router]);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [filtered, all] = await Promise.all([
        listExpenses(token, category || undefined, sortDateDesc ? "date_desc" : undefined),
        listExpenses(token, undefined, undefined),
      ]);

      const categories = Array.from(new Set(all.expenses.map((item) => item.category))).sort();

      setAllCategories(categories);
      setExpenses(filtered.expenses);
      setTotal(filtered.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load expenses";
      setError(message);
      if (message.toLowerCase().includes("invalid") || message.toLowerCase().includes("expired")) {
        clearToken();
        router.replace("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [token, category, sortDateDesc, router]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function logout() {
    setFlashMessage("Logout successful.");
    clearToken();
    router.replace("/login");
  }

  return (
    <main>
      <div className="topbar">
        <div>
          <p className="brand-kicker">Spendwise</p>
          <h1 className="topbar-title">Welcome, {displayName}</h1>
        </div>
        <button className="btn-secondary" onClick={logout}>Logout</button>
      </div>

      {token ? (
        <ExpenseForm
          token={token}
          onCreated={refresh}
          onCreatedSuccess={() => setToast("Expense added successfully.")}
        />
      ) : null}

      <div className="card" style={{ marginTop: 16 }}>
        <div className="filter-bar">
          <div className="filter-field">
            <label>Filter by category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {allCategories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <label className="checkbox-line">
            <input
              type="checkbox"
              checked={sortDateDesc}
              onChange={(e) => setSortDateDesc(e.target.checked)}
            />
            Sort by date (newest first)
          </label>
        </div>

        <div className="total-strip">
          <span className="total-label">Total Spend</span>
          <strong className="total-value">₹{Number(total).toFixed(2)}</strong>
        </div>

        {loading ? (
          <div className="skeleton-list" aria-hidden="true">
            <div className="skeleton-row" />
            <div className="skeleton-row" />
            <div className="skeleton-row" />
            <div className="skeleton-row" />
          </div>
        ) : (
          <ExpenseTable expenses={expenses} />
        )}

        {error ? <div className="error-banner" role="alert">{error}</div> : null}
      </div>

      <Toast message={toast} onClose={() => setToast("")} />
    </main>
  );
}
