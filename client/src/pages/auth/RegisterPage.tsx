import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { AuthShell } from "../../components/auth/AuthShell";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useAuth } from "../../context/useAuth";
import { getApiErrorMessage } from "../../utils/errors";

function RegisterPage() {
  const { register } = useAuth(); const navigate = useNavigate(); const [form, setForm] = useState({ name: "", email: "", password: "", organizationName: "" }); const [error, setError] = useState(""); const [pending, setPending] = useState(false); const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  async function submit(event: FormEvent) { event.preventDefault(); setError(""); setPending(true); try { await register(form); navigate("/dashboard", { replace: true }); } catch (reason) { setError(getApiErrorMessage(reason, "Unable to create your account.")); } finally { setPending(false); } }
  return <AuthShell eyebrow="Create workspace" title="Start your intelligence workspace." description="Create a tenant-isolated analyst account for OSINT-X."><form className="space-y-4" onSubmit={submit}><Field label="Full name"><Input autoComplete="name" placeholder="Alex Morgan" required value={form.name} onChange={(event) => update("name", event.target.value)} /></Field><Field label="Work email"><Input autoComplete="email" placeholder="analyst@organization.com" required type="email" value={form.email} onChange={(event) => update("email", event.target.value)} /></Field><Field label="Organization name"><Input autoComplete="organization" placeholder="Optional workspace name" value={form.organizationName} onChange={(event) => update("organizationName", event.target.value)} /></Field><Field label="Password"><Input autoComplete="new-password" minLength={8} placeholder="8+ chars, upper/lowercase and number" required type="password" value={form.password} onChange={(event) => update("password", event.target.value)} /></Field>{error && <p className="rounded-md border border-rose-400/20 bg-rose-400/[0.08] px-3 py-2.5 text-xs text-rose-200">{error}</p>}<Button className="w-full" disabled={pending} type="submit">{pending ? <LoaderCircle className="animate-spin" size={15} /> : <ArrowRight size={15} />} {pending ? "Creating workspace..." : "Create account"}</Button><p className="pt-4 text-center text-xs text-slate-600">Already have an account? <Link className="font-medium text-cyan-300 hover:text-cyan-200" to="/login">Sign in</Link></p></form></AuthShell>;
}
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block space-y-2"><span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</span>{children}</label>; }
export default RegisterPage;
