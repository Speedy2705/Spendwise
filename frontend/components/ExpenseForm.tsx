"use client";

import { FormEvent, useEffect, useState } from "react";
import { createExpense } from "@/lib/api";
import CategorySelector, { CategorySelection } from "@/components/CategorySelector";
import ConfirmDialog from "@/components/ConfirmDialog";
import { ExpenseCreatePayload } from "@/lib/types";

const PENDING_KEY = "expense_pending_submission";

type Props = {
  token: string;
  onCreated: () => void;
  onCreatedSuccess?: () => void;
};

type PendingSubmission = {
  idempotencyKey: string;
  payload: ExpenseCreatePayload;
};

function randomId() {
  return crypto.randomUUID();
}

export default function ExpenseForm({ token, onCreated, onCreatedSuccess }: Props) {
  const [amount, setAmount] = useState("");
  const [categorySelection, setCategorySelection] = useState<CategorySelection>({
    selectedCategory: "",
    customCategory: "",
    value: "",
  });
  const [categoryError, setCategoryError] = useState("");
  const [resetCategorySignal, setResetCategorySignal] = useState(0);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<PendingSubmission | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [highValuePending, setHighValuePending] = useState<ExpenseCreatePayload | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as PendingSubmission;
      setPending(parsed);
    } catch {
      localStorage.removeItem(PENDING_KEY);
    }
  }, []);

  async function submit(payload: ExpenseCreatePayload, idempotencyKey: string) {
    setBusy(true);
    setError("");

    localStorage.setItem(PENDING_KEY, JSON.stringify({ idempotencyKey, payload }));
    setPending({ idempotencyKey, payload });

    try {
      await createExpense(token, payload, idempotencyKey);
      localStorage.removeItem(PENDING_KEY);
      setPending(null);
      setAmount("");
      setCategoryError("");
      setResetCategorySignal((current) => current + 1);
      setDescription("");
      setDate("");
      onCreated();
      onCreatedSuccess?.();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to create expense";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = buildPayload();
    if (!payload) return;

    const value = Number(payload.amount);
    if (value > 5000) {
      setHighValuePending(payload);
      setConfirmOpen(true);
      return;
    }

    await submit(payload, randomId());
  }

  function buildPayload(): ExpenseCreatePayload | null {
    const value = Number(amount);

    if (!date) {
      setError("Date is required");
      return null;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError("Amount must be greater than 0");
      return null;
    }

    if (!categorySelection.selectedCategory) {
      setError("");
      setCategoryError("Please select a category");
      return null;
    }

    if (categorySelection.selectedCategory === "Other" && !categorySelection.customCategory.trim()) {
      setError("");
      setCategoryError("Custom category is required");
      return null;
    }

    const normalizedCategory = categorySelection.value.trim();

    const payload: ExpenseCreatePayload = {
      amount: value.toFixed(2),
      category: normalizedCategory,
      description: description.trim(),
      date,
    };

    if (!payload.description) {
      setError("Description is required");
      return null;
    }

    setCategoryError("");
    setError("");
    return payload;
  }

  async function confirmHighValue() {
    if (!highValuePending) return;
    setConfirmOpen(false);
    await submit(highValuePending, randomId());
    setHighValuePending(null);
  }

  return (
    <div className="card">
      <h2 className="form-title">Add Expense</h2>
      <form onSubmit={onSubmit}>
        <div className="form-grid">
          <div style={{ flex: 1, minWidth: 180 }}>
            <label>Amount</label>
            <div className="money-input-wrap">
              <span className="money-symbol" aria-hidden="true">₹</span>
              <input
                className="money-input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 499.50"
                type="number"
                min="0.01"
                step="0.01"
                required
              />
            </div>
          </div>
          <div style={{ minWidth: 180 }}>
            <CategorySelector
              resetSignal={resetCategorySignal}
              error={categoryError}
              disabled={busy}
              onChange={(selection) => {
                setCategorySelection(selection);
                if (categoryError) {
                  setCategoryError("");
                }
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label>Date</label>
            <input value={date} onChange={(e) => setDate(e.target.value)} type="date" required />
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label>Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What did you spend on?"
            required
          />
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <button disabled={busy} type="submit">
            {busy ? "Saving..." : "Save Expense"}
          </button>
          {pending && (
            <button
              className="btn-secondary"
              type="button"
              disabled={busy}
              onClick={() => submit(pending.payload, pending.idempotencyKey)}
            >
              Retry Pending Submission
            </button>
          )}
        </div>
        {error ? <p className="error">{error}</p> : null}
      </form>

      <ConfirmDialog
        open={confirmOpen}
        title="Large Expense Check"
        message="This expense exceeds ₹5000. Do you want to add it?"
        confirmText="Yes, add expense"
        cancelText="No, cancel"
        onConfirm={confirmHighValue}
        onCancel={() => {
          setConfirmOpen(false);
          setHighValuePending(null);
        }}
      />
    </div>
  );
}
