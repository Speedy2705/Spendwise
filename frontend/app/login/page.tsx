"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
import Toast from "@/components/Toast";
import { consumeFlashMessage, setFlashMessage } from "@/lib/flash";
import { inferDisplayNameFromEmail, saveToken, saveUserDisplayName } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [toastVariant, setToastVariant] = useState<"success" | "error">("success");

  useEffect(() => {
    setToast(consumeFlashMessage());
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await login(email, password);
      saveToken(result.access_token);
      saveUserDisplayName(inferDisplayNameFromEmail(email));
      setFlashMessage("Login successful.");
      router.replace("/dashboard");
    } catch (err) {
      setToastVariant("error");
      setToast(err instanceof Error ? err.message : "Invalid email or password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <div className="card" style={{ maxWidth: 460, margin: "64px auto" }}>
        <h1>Login</h1>
        <form onSubmit={onSubmit}>
          <div>
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div style={{ marginTop: 10 }}>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button style={{ marginTop: 12 }} disabled={busy} type="submit">
            {busy ? "Signing in..." : "Login"}
          </button>
        </form>
        <p className="muted" style={{ marginTop: 12 }}>
          No account? <Link href="/signup">Create one</Link>
        </p>
      </div>
      <Toast message={toast} variant={toastVariant} onClose={() => setToast("")} />
    </main>
  );
}
