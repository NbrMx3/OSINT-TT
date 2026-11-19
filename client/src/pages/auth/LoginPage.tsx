import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { AuthShell } from "../../components/auth/AuthShell";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useAuth } from "../../context/useAuth";
import { getApiErrorMessage } from "../../utils/errors";

function LoginPage() {
  const { login } = useAuth(); const navigate = useNavigate(); const location = useLocation(); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); setError(""); setPending(true); try { await login({ email, password }); const state = location.state as { from?: string } | null; navigate(state?.from ?? "/dashboard", { replace: true }); } catch (reason) { setError(getApiErrorMessage(reason, "Unable to sign in.")); } finally { setPending(false); } }
  return <AuthShell eyebrow="Secure access" title="Welcome back, analyst." description="Sign in to continue to your intelligence workspace."><form className="space-y-4" onSubmit={submit}><Field label="Work email"><Input autoComplete="email" placeholder="analyst@organization.com" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field><Field label="Password"><Input autoComplete="current-password" placeholder="Enter your password" required type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></Field><div className="flex justify-end"><Link className="text-[10px] font-medium text-cyan-300 hover:text-cyan-200" to="/forgot-password">Forgot password?</Link></div>{error && <p className="rounded-md border border-rose-400/20 bg-rose-400/[0.08] px-3 py-2.5 text-xs text-rose-200">{error}</p>}<Button className="w-full" disabled={pending} type="submit">{pending ? <LoaderCircle className="animate-spin" size={15} /> : <ArrowRight size={15} />} {pending ? "Signing in..." : "Sign in"}</Button><p className="pt-4 text-center text-xs text-slate-600">New to OSINT-X? <Link className="font-medium text-cyan-300 hover:text-cyan-200" to="/register">Create an account</Link></p></form></AuthShell>;
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block space-y-2"><span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</span>{children}</label>; }
export default LoginPage;
