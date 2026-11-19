import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import IntelligenceModulePage from "./pages/IntelligenceModulePage";
import NotFoundPage from "./pages/NotFoundPage";

function App() {
  return <BrowserRouter><Routes><Route element={<AppLayout />}><Route index element={<Navigate replace to="/dashboard" />} /><Route path="/dashboard" element={<DashboardPage />} /><Route path="/investigations" element={<IntelligenceModulePage />} /><Route path="/people" element={<IntelligenceModulePage />} /><Route path="/email" element={<IntelligenceModulePage />} /><Route path="/username" element={<IntelligenceModulePage />} /><Route path="/domain" element={<IntelligenceModulePage />} /><Route path="/ip" element={<IntelligenceModulePage />} /><Route path="/phone" element={<IntelligenceModulePage />} /><Route path="/website" element={<IntelligenceModulePage />} /><Route path="/social" element={<IntelligenceModulePage />} /><Route path="/threats" element={<IntelligenceModulePage />} /><Route path="/graph" element={<IntelligenceModulePage />} /><Route path="/reports" element={<IntelligenceModulePage />} /><Route path="/settings" element={<IntelligenceModulePage />} /><Route path="*" element={<NotFoundPage />} /></Route></Routes></BrowserRouter>;
}

export default App;
