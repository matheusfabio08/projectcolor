import { useEffect, useState } from "react";
import Layout from "@/react-app/components/Layout";
import KPICard from "@/react-app/components/KPICard";
import { useAPI } from "@/react-app/hooks/useAPI";
import { DashboardKPIs, ProductionOrder } from "@/shared/types";
import { Package, AlertCircle, CheckCircle, TrendingUp, Search } from "lucide-react";
import { Link } from "react-router";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Dashboard() {
  const { data: kpis, request: fetchKPIs } = useAPI<DashboardKPIs>();
  const { data: recentOPs, request: fetchRecentOPs } = useAPI<ProductionOrder[]>();
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchKPIs("/api/dashboard/kpis");
    fetchRecentOPs("/api/production-orders?limit=10");
  }, []);

  const filteredOPs = recentOPs?.filter((op) =>
    op.op_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.color.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      almoxarifado: { label: "Almoxarifado", color: "bg-blue-100 text-blue-700" },
      laboratorio: { label: "Laboratório", color: "bg-purple-100 text-purple-700" },
      preparacao: { label: "Preparação", color: "bg-indigo-100 text-indigo-700" },
      producao: { label: "Produção", color: "bg-yellow-100 text-yellow-700" },
      secadora: { label: "Secadora", color: "bg-orange-100 text-orange-700" },
      destrinchagem: { label: "Destrinchagem", color: "bg-pink-100 text-pink-700" },
      enrolagem: { label: "Enrolagem", color: "bg-cyan-100 text-cyan-700" },
      qualidade: { label: "Qualidade", color: "bg-teal-100 text-teal-700" },
      concluido: { label: "Concluído", color: "bg-green-100 text-green-700" },
    };

    const statusInfo = statusMap[status] || { label: status, color: "bg-gray-100 text-gray-700" };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  return (
    <Layout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 text-sm">Visão geral da produção</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="flex-shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <KPICard
            title="OPs em Andamento"
            value={kpis?.active_ops || 0}
            icon={Package}
            color="blue"
          />
          <KPICard
            title="OPs Atrasadas"
            value={kpis?.overdue_ops || 0}
            icon={AlertCircle}
            color="red"
          />
          <KPICard
            title="Concluídas Hoje"
            value={kpis?.completed_today || 0}
            icon={CheckCircle}
            color="green"
          />
          <KPICard
            title="Taxa de Produtividade"
            value={`${kpis?.productivity_rate || 0}%`}
            icon={TrendingUp}
            color="yellow"
          />
        </div>

        {/* Recent OPs - takes remaining space */}
        <div className="flex-1 min-h-0 bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col overflow-hidden">
          <div className="flex-shrink-0 p-3 border-b border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <h2 className="text-lg font-bold text-gray-900">Ordens de Produção Recentes</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar OP, cliente ou cor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full md:w-64"
                />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">OP</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Material</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Cliente</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Cor</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Previsão</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOPs && filteredOPs.length > 0 ? (
                  filteredOPs.map((op) => (
                    <tr key={op.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="font-semibold text-blue-600">{op.op_number}</span>
                      </td>
                      <td className="px-3 py-2 text-gray-900">{(op as any).material || '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-900">{op.client}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-900">{op.color}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{getStatusBadge(op.status)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                        {format(new Date(op.expected_date), "dd/MM/yyyy", { locale: ptBR })}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Link
                          to={`/op/${op.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Ver →
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                      Nenhuma ordem de produção encontrada
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
