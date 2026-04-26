"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signup } from "@/lib/api";
import { saveToken, saveUserDisplayName } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await signup(fullName, email, password);
      saveToken(result.access_token);
      saveUserDisplayName(fullName);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <div className="card" style={{ maxWidth: 460, margin: "64px auto" }}>
        <h1>Signup</h1>
        <form onSubmit={onSubmit}>
          <div>
            <label>Full Name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div style={{ marginTop: 10 }}>
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div style={{ marginTop: 10 }}>
            <label>Password</label>
            <input
              type="password"
              value={password}
              minLength={8}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button style={{ marginTop: 12 }} disabled={busy} type="submit">
            {busy ? "Creating account..." : "Signup"}
          </button>
          {error ? <p className="error">{error}</p> : null}
        </form>
        <p className="muted" style={{ marginTop: 12 }}>
          Already have an account? <Link href="/login">Login</Link>
        </p>
      </div>
    </main>
  );
}
