import { BrowserRouter as Router, Routes, Route } from "react-router";
import { AuthProvider } from "@/react-app/contexts/AuthContext";
import LoginPage from "@/react-app/pages/Login";
import DashboardPage from "@/react-app/pages/Dashboard";
import AlmoxarifadoPage from "@/react-app/pages/Almoxarifado";
import PreparacaoPage from "@/react-app/pages/Preparacao";
import PreparacaoLotePage from "@/react-app/pages/PreparacaoLote";
import ProducaoPage from "@/react-app/pages/Producao";
import SecadoraPage from "@/react-app/pages/Secadora";
import DestrinchageMPage from "@/react-app/pages/Destrinchagem";
import EnrolagemPage from "@/react-app/pages/Enrolagem";
import QualidadePage from "@/react-app/pages/Qualidade";
import QualidadeMalhasPage from "@/react-app/pages/QualidadeMalhas";
import LaboratorioPage from "@/react-app/pages/Laboratorio";
import PesagemPage from "@/react-app/pages/Pesagem";
import AdminPage from "@/react-app/pages/Admin";
import ConfiguracoesPage from "@/react-app/pages/Configuracoes";
import PCPPage from "@/react-app/pages/PCP";
import Box4Page from "@/react-app/pages/Box4";
import Box5Page from "@/react-app/pages/Box5";
import Box6Page from "@/react-app/pages/Box6";
import GerenciamentoPage from "@/react-app/pages/Gerenciamento";
import PODetailsPage from "@/react-app/pages/PODetails";
import ProtectedRoute from "@/react-app/components/ProtectedRoute";

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/almoxarifado" element={<ProtectedRoute><AlmoxarifadoPage /></ProtectedRoute>} />
          <Route path="/preparacao" element={<ProtectedRoute><PreparacaoPage /></ProtectedRoute>} />
          <Route path="/preparacao-lote" element={<ProtectedRoute><PreparacaoLotePage /></ProtectedRoute>} />
          <Route path="/producao" element={<ProtectedRoute><ProducaoPage /></ProtectedRoute>} />
          <Route path="/secadora" element={<ProtectedRoute><SecadoraPage /></ProtectedRoute>} />
          <Route path="/destrinchagem" element={<ProtectedRoute><DestrinchageMPage /></ProtectedRoute>} />
          <Route path="/enrolagem" element={<ProtectedRoute><EnrolagemPage /></ProtectedRoute>} />
          <Route path="/qualidade" element={<ProtectedRoute><QualidadePage /></ProtectedRoute>} />
          <Route path="/qualidade-malhas" element={<ProtectedRoute><QualidadeMalhasPage /></ProtectedRoute>} />
          <Route path="/laboratorio" element={<ProtectedRoute><LaboratorioPage /></ProtectedRoute>} />
          <Route path="/pesagem" element={<ProtectedRoute><PesagemPage /></ProtectedRoute>} />
          <Route path="/box4" element={<ProtectedRoute><Box4Page /></ProtectedRoute>} />
          <Route path="/box5" element={<ProtectedRoute><Box5Page /></ProtectedRoute>} />
          <Route path="/box6" element={<ProtectedRoute><Box6Page /></ProtectedRoute>} />
          <Route path="/pcp" element={<ProtectedRoute><PCPPage /></ProtectedRoute>} />
          <Route path="/gerenciamento" element={<ProtectedRoute><GerenciamentoPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
          <Route path="/configuracoes" element={<ProtectedRoute><ConfiguracoesPage /></ProtectedRoute>} />
          <Route path="/op/:id" element={<ProtectedRoute><PODetailsPage /></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
