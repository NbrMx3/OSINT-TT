import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AdminProvider } from "./context/AdminContext";
import { ProtectedRoute, PublicOnlyRoute } from "./components/ProtectedRoute";
import { AdminProtectedRoute } from "./components/ProtectedRoute";
import AppLayout from "./layouts/AppLayout";
import AdminLayout from "./layouts/AdminLayout";
import DashboardPage from "./pages/DashboardPage";
import DomainIntelligencePage from "./pages/DomainIntelligencePage";
import IpIntelligencePage from "./pages/IpIntelligencePage";
import EmailIntelligencePage from "./pages/EmailIntelligencePage";
import UsernameIntelligencePage from "./pages/UsernameIntelligencePage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import IntelligenceModulePage from "./pages/IntelligenceModulePage";
import InvestigationDetailsPage from "./pages/InvestigationDetailsPage";
import InvestigationHistoryPage from "./pages/InvestigationHistoryPage";
import InvestigationResultsPage from "./pages/InvestigationResultsPage";
import InvestigationsPage from "./pages/InvestigationsPage";
import LoginPage from "./pages/auth/LoginPage";
import NewInvestigationPage from "./pages/NewInvestigationPage";
import NotFoundPage from "./pages/NotFoundPage";
import ProfilePage from "./pages/ProfilePage";
import RegisterPage from "./pages/auth/RegisterPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import GraphAnalysisPage from "./pages/GraphAnalysisPage";
import ReportsPage from "./pages/ReportsPage";
import LandingPage from "./pages/LandingPage";
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";

function App() {
  return <BrowserRouter><AuthProvider><AdminProvider><Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/admin/login" element={<AdminLoginPage />} />
    <Route element={<PublicOnlyRoute />}>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
    </Route>
    <Route element={<ProtectedRoute />}><Route element={<AppLayout />}>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/investigations" element={<InvestigationsPage />} />
      <Route path="/investigations/new" element={<NewInvestigationPage />} />
      <Route path="/investigations/:id/history" element={<InvestigationHistoryPage />} />
      <Route path="/investigations/:id/results" element={<InvestigationResultsPage />} />
      <Route path="/investigations/:id" element={<InvestigationDetailsPage />} />
      <Route path="/people" element={<IntelligenceModulePage />} />
      <Route path="/email" element={<EmailIntelligencePage />} />
      <Route path="/username" element={<UsernameIntelligencePage />} />
      <Route path="/domain" element={<DomainIntelligencePage />} />
      <Route path="/ip" element={<IpIntelligencePage />} />
      <Route path="/phone" element={<IntelligenceModulePage />} />
      <Route path="/website" element={<IntelligenceModulePage />} />
      <Route path="/social" element={<IntelligenceModulePage />} />
      <Route path="/threats" element={<IntelligenceModulePage />} />
      <Route path="/graph" element={<GraphAnalysisPage />} />
      <Route path="/reports" element={<ReportsPage />} />
      <Route path="/settings" element={<IntelligenceModulePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route></Route>
    <Route element={<AdminProtectedRoute />}><Route element={<AdminLayout />}>
      <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
    </Route></Route>
  </Routes></AdminProvider></AuthProvider></BrowserRouter>;
}

export default App;
