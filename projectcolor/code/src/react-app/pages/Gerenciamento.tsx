import { useState, useEffect } from "react";
import Layout from "@/react-app/components/Layout";
import { useAPI } from "@/react-app/hooks/useAPI";
import { 
  Activity, 
  TrendingUp, 
  Clock, 
  Users, 
  Package,
  AlertTriangle,
  CheckCircle,
  BarChart3
} from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";

interface SectorStats {
  name: string;
  waiting: number;
  inProgress: number;
  completed: number;
  delayed: number;
  avgTime: number;
  employees: number;
  color: string;
}

export default function Gerenciamento() {
  const { request } = useAPI();
  const [sectors, setSectors] = useState<SectorStats[]>([]);
  const [totalOPs, setTotalOPs] = useState(0);
  const [activeOPs, setActiveOPs] = useState(0);
  const [completedToday, setCompletedToday] = useState(0);
  const [delayedOPs, setDelayedOPs] = useState(0);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      // Get all OPs
      const allOPs = await request("/api/production-orders");
      
      // Get lab records to check which OPs have been processed in lab
      const labRecords = await request("/api/laboratory/records");
      
      // Calculate totals
      setTotalOPs(allOPs.length);
      setActiveOPs(allOPs.filter((op: any) => !op.is_completed).length);
      
      const today = new Date().toISOString().split('T')[0];
      const completed = allOPs.filter((op: any) => 
        op.is_completed && op.updated_at && op.updated_at.startsWith(today)
      );
      setCompletedToday(completed.length);
      
      const delayed = allOPs.filter((op: any) => 
        !op.is_completed && new Date(op.expected_date) < new Date()
      );
      setDelayedOPs(delayed.length);

      // Calculate sector stats
      const now = new Date();
      const sectorData: SectorStats[] = [
        {
          name: "Preparação",
          waiting: allOPs.filter((op: any) => op.status === "preparacao").length,
          inProgress: 0,
          completed: allOPs.filter((op: any) => op.status !== "preparacao" && op.current_stage === "preparacao").length,
          delayed: allOPs.filter((op: any) => op.status === "preparacao" && new Date(op.expected_date) < now).length,
          avgTime: 0,
          employees: 0,
          color: "#3b82f6"
        },
        {
          name: "Produção",
          waiting: allOPs.filter((op: any) => op.status === "producao").length,
          inProgress: 0,
          completed: allOPs.filter((op: any) => op.status !== "producao" && op.current_stage === "producao").length,
          delayed: allOPs.filter((op: any) => op.status === "producao" && new Date(op.expected_date) < now).length,
          avgTime: 0,
          employees: 0,
          color: "#f59e0b"
        },
        {
          name: "Secadora",
          waiting: allOPs.filter((op: any) => op.status === "secadora").length,
          inProgress: 0,
          completed: allOPs.filter((op: any) => op.status !== "secadora" && op.current_stage === "secadora").length,
          delayed: allOPs.filter((op: any) => op.status === "secadora" && new Date(op.expected_date) < now).length,
          avgTime: 0,
          employees: 0,
          color: "#ef4444"
        },
        {
          name: "Destrinchagem",
          waiting: allOPs.filter((op: any) => op.status === "destrinchagem").length,
          inProgress: 0,
          completed: allOPs.filter((op: any) => op.status !== "destrinchagem" && op.current_stage === "destrinchagem").length,
          delayed: allOPs.filter((op: any) => op.status === "destrinchagem" && new Date(op.expected_date) < now).length,
          avgTime: 0,
          employees: 0,
          color: "#ec4899"
        },
        {
          name: "Enrolagem",
          waiting: allOPs.filter((op: any) => op.status === "enrolagem").length,
          inProgress: 0,
          completed: allOPs.filter((op: any) => op.status !== "enrolagem" && op.current_stage === "enrolagem").length,
          delayed: allOPs.filter((op: any) => op.status === "enrolagem" && new Date(op.expected_date) < now).length,
          avgTime: 0,
          employees: 0,
          color: "#06b6d4"
        },
        {
          name: "Qualidade",
          waiting: allOPs.filter((op: any) => op.status === "qualidade").length,
          inProgress: 0,
          completed: allOPs.filter((op: any) => op.status !== "qualidade" && op.current_stage === "qualidade").length,
          delayed: allOPs.filter((op: any) => op.status === "qualidade" && new Date(op.expected_date) < now).length,
          avgTime: 0,
          employees: 0,
          color: "#10b981"
        },
        {
          name: "Qualidade de Malhas",
          waiting: allOPs.filter((op: any) => op.status === "qualidade_malhas").length,
          inProgress: 0,
          completed: allOPs.filter((op: any) => op.status !== "qualidade_malhas" && op.current_stage === "qualidade_malhas").length,
          delayed: allOPs.filter((op: any) => op.status === "qualidade_malhas" && new Date(op.expected_date) < now).length,
          avgTime: 0,
          employees: 0,
          color: "#14b8a6"
        },
        {
          name: "Laboratório",
          waiting: labRecords.filter((op: any) => !op.lab_record_id).length,
          inProgress: 0,
          completed: labRecords.filter((op: any) => op.lab_record_id).length,
          delayed: labRecords.filter((op: any) => !op.lab_record_id && new Date(op.expected_date) < now).length,
          avgTime: 0,
          employees: 0,
          color: "#8b5cf6"
        }
      ];

      setSectors(sectorData);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
  };

  const pieData = sectors.map(s => ({
    name: s.name,
    value: s.waiting + s.inProgress,
    color: s.color
  }));

  const barData = sectors.map(s => ({
    name: s.name,
    Aguardando: s.waiting,
    Concluído: s.completed
  }));

  const productivity = totalOPs > 0 ? Math.round((completedToday / totalOPs) * 100) : 0;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
              <Activity className="w-8 h-8 mr-3 text-blue-600" />
              Gerenciamento
            </h1>
            <p className="text-gray-600">Dashboard de desempenho em tempo real</p>
          </div>
          <button
            onClick={loadDashboardData}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
          >
            <Activity className="w-4 h-4" />
            Atualizar
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Package className="w-8 h-8 opacity-80" />
              <span className="text-3xl font-bold">{totalOPs}</span>
            </div>
            <p className="text-blue-100 font-medium">Total de OPs</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 opacity-80" />
              <span className="text-3xl font-bold">{activeOPs}</span>
            </div>
            <p className="text-orange-100 font-medium">OPs Ativas</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 opacity-80" />
              <span className="text-3xl font-bold">{completedToday}</span>
            </div>
            <p className="text-green-100 font-medium">Concluídas Hoje</p>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-8 h-8 opacity-80" />
              <span className="text-3xl font-bold">{delayedOPs}</span>
            </div>
            <p className="text-red-100 font-medium">Atrasadas</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="w-6 h-6 mr-2 text-blue-600" />
              Distribuição por Setor
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Bar Chart */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="w-6 h-6 mr-2 text-green-600" />
              Aguardando vs Concluído
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Aguardando" fill="#f59e0b" />
                <Bar dataKey="Concluído" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sector Details */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Users className="w-6 h-6 mr-2 text-blue-600" />
              Detalhamento por Setor
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Setor
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Aguardando
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Em Andamento
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Em Atraso
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Concluído
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sectors.map((sector) => (
                  <tr key={sector.name} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-3"
                          style={{ backgroundColor: sector.color }}
                        />
                        <span className="font-semibold text-gray-900">{sector.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="px-3 py-1 rounded-full text-sm font-semibold bg-orange-100 text-orange-700">
                        {sector.waiting}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-700">
                        {sector.inProgress}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {sector.delayed > 0 ? (
                        <span className="px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-700">
                          {sector.delayed}
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-500">
                          0
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700">
                        {sector.completed}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {sector.waiting > 5 ? (
                        <span className="text-red-600 font-semibold">⚠ Sobrecarga</span>
                      ) : sector.waiting > 2 ? (
                        <span className="text-yellow-600 font-semibold">⚠ Atenção</span>
                      ) : (
                        <span className="text-green-600 font-semibold">✓ Normal</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Productivity Metric */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl shadow-lg border border-purple-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <TrendingUp className="w-6 h-6 mr-2 text-purple-600" />
              Produtividade Hoje
            </h2>
            <span className="text-4xl font-bold text-purple-600">{productivity}%</span>
          </div>
          <div className="w-full bg-purple-200 rounded-full h-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-500 to-purple-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${productivity}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {completedToday} de {totalOPs} OPs concluídas
          </p>
        </div>

        {/* Last Update */}
        <div className="text-center text-sm text-gray-500">
          <p>Última atualização: {new Date().toLocaleTimeString("pt-BR")}</p>
          <p className="text-xs mt-1">Atualização automática a cada 30 segundos</p>
        </div>
      </div>
    </Layout>
  );
}
