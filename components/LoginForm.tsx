"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/write/actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, null);
  return (
    <form action={action} className="login">
      <label className="field">
        <span className="label">Password</span>
        <input className="input" type="password" name="password" autoComplete="current-password" autoFocus required />
      </label>
      <button className="btn" disabled={pending}>{pending ? "Checking…" : "Sign in"}</button>
      {state?.error && <p className="error" role="alert">{state.error}</p>}
    </form>
  );
}
