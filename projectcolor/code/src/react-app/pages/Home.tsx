import { useAuth } from "@getmocha/users-service/react";
import { useNavigate } from "react-router";
import { useEffect } from "react";
import { Factory, TrendingUp, Users, Clock } from "lucide-react";

export default function Home() {
  const { user, redirectToLogin, isPending } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-950 via-red-900 to-red-800">
        <div className="animate-spin">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-950 via-red-900 to-red-800">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="flex items-center justify-center mb-6">
              <Factory className="w-16 h-16 text-white" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
              Colortim
            </h1>
            <p className="text-xl text-white mb-8">
              Sistema profissional de gestão de produção para tingimentos
            </p>
            <button
              onClick={redirectToLogin}
              className="bg-white text-red-950 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-red-50 transition-all transform hover:scale-105 shadow-2xl"
            >
              Entrar com Google
            </button>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-xl border border-white/20">
              <div className="bg-white/20 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Dashboard Completo</h3>
              <p className="text-white">
                Acompanhe KPIs em tempo real: OPs em andamento, atrasadas e produtividade
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-xl border border-white/20">
              <div className="bg-white/20 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Controle por Setor</h3>
              <p className="text-white">
                Gestão completa do fluxo: Almoxarifado, Preparação, Produção, Secadora e mais
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-xl border border-white/20">
              <div className="bg-white/20 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Histórico Completo</h3>
              <p className="text-white">
                Rastreamento total de cada OP com timeline detalhada e relatórios
              </p>
            </div>
          </div>

          {/* Info Section */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-xl border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">Setores do Sistema</h2>
            <div className="grid md:grid-cols-2 gap-4 text-white">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-white rounded-full mr-3" />
                Almoxarifado - Criação de fichas
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-white rounded-full mr-3" />
                Laboratório - Desenvolvimento de cores
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-white rounded-full mr-3" />
                Preparação - Temporizador e pesagem
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-white rounded-full mr-3" />
                Produção - Caixas e máquinas
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-white rounded-full mr-3" />
                Secadora - Roteamento
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-white rounded-full mr-3" />
                Destrinchagem - Múltiplos funcionários
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-white rounded-full mr-3" />
                Enrolagem - Controle de rolos
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-white rounded-full mr-3" />
                Qualidade - Finalização
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
