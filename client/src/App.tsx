import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute, PublicOnlyRoute } from "./components/ProtectedRoute";
import AppLayout from "./layouts/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import DomainIntelligencePage from "./pages/DomainIntelligencePage";
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

function App() {
  return <BrowserRouter><AuthProvider><Routes><Route element={<PublicOnlyRoute />}><Route path="/login" element={<LoginPage />} /><Route path="/register" element={<RegisterPage />} /><Route path="/forgot-password" element={<ForgotPasswordPage />} /><Route path="/reset-password" element={<ResetPasswordPage />} /></Route><Route element={<ProtectedRoute />}><Route element={<AppLayout />}><Route index element={<Navigate replace to="/dashboard" />} /><Route path="/dashboard" element={<DashboardPage />} /><Route path="/profile" element={<ProfilePage />} /><Route path="/investigations" element={<InvestigationsPage />} /><Route path="/investigations/new" element={<NewInvestigationPage />} /><Route path="/investigations/:id/history" element={<InvestigationHistoryPage />} /><Route path="/investigations/:id/results" element={<InvestigationResultsPage />} /><Route path="/investigations/:id" element={<InvestigationDetailsPage />} /><Route path="/people" element={<IntelligenceModulePage />} /><Route path="/email" element={<IntelligenceModulePage />} /><Route path="/username" element={<IntelligenceModulePage />} /><Route path="/domain" element={<DomainIntelligencePage />} /><Route path="/ip" element={<IntelligenceModulePage />} /><Route path="/phone" element={<IntelligenceModulePage />} /><Route path="/website" element={<IntelligenceModulePage />} /><Route path="/social" element={<IntelligenceModulePage />} /><Route path="/threats" element={<IntelligenceModulePage />} /><Route path="/graph" element={<IntelligenceModulePage />} /><Route path="/reports" element={<IntelligenceModulePage />} /><Route path="/settings" element={<IntelligenceModulePage />} /><Route path="*" element={<NotFoundPage />} /></Route></Route></Routes></AuthProvider></BrowserRouter>;
}

export default App;
