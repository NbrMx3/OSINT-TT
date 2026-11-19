import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { getApiErrorMessage } from "../utils/errors";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";

function ProfilePage() {
  const { user, updateUser, logout } = useAuth(); const navigate = useNavigate(); const [name, setName] = useState(user?.name ?? ""); const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); setPending(true); setMessage(""); setError(""); try { await updateUser({ name }); setMessage("Profile updated successfully."); } catch (reason) { setError(getApiErrorMessage(reason, "Unable to update profile.")); } finally { setPending(false); } }
  async function signOut() { await logout(); navigate("/login", { replace: true }); }
  return <div className="mx-auto max-w-4xl space-y-7"><section className="border-b border-white/[0.07] pb-6"><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300">Account settings</p><h2 className="text-2xl font-semibold tracking-tight text-white">Your profile</h2><p className="mt-2 text-xs leading-5 text-slate-500">Manage your analyst identity and workspace access.</p></section><div className="grid gap-4 md:grid-cols-[1fr_1.5fr]"><Card><CardHeader><div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300"><UserRound size={22} /></div><CardTitle className="mt-4">{user?.name}</CardTitle><CardDescription>{user?.email}</CardDescription></CardHeader><CardContent><Badge className="border-cyan-400/15 bg-cyan-400/[0.06] text-cyan-300">{user?.role.replace("_", " ")}</Badge><div className="mt-5 flex items-start gap-2 text-[10px] leading-5 text-slate-600"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-cyan-300" />Tenant-isolated analyst account</div></CardContent></Card><Card><CardHeader><CardTitle>Profile details</CardTitle><CardDescription className="mt-2">Changes are saved to your authenticated account.</CardDescription></CardHeader><CardContent><form className="space-y-4" onSubmit={submit}><label className="block space-y-2"><span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Display name</span><Input required value={name} onChange={(event) => setName(event.target.value)} /></label><label className="block space-y-2"><span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Email</span><Input disabled value={user?.email ?? ""} /></label>{message && <p className="flex items-center gap-2 text-xs text-cyan-300"><CheckCircle2 size={14} />{message}</p>}{error && <p className="text-xs text-rose-300">{error}</p>}<div className="flex flex-wrap gap-2"><Button disabled={pending} type="submit">{pending ? "Saving..." : "Save changes"}</Button><Button type="button" variant="destructive" onClick={signOut}><LogOut size={14} /> Sign out</Button></div></form></CardContent></Card></div></div>;
}
export default ProfilePage;
