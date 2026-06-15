import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import Layout from "@/react-app/components/Layout";
import { useAPI } from "@/react-app/hooks/useAPI";
import { 
  Clock, AlertCircle, CheckCircle2, TrendingUp, Target, BarChart3, 
  Calendar, Flag, ArrowUpCircle, Package, Users, AlertTriangle,
  Activity, Eye, Edit2, Save, X, FlaskConical, MapPin, Truck, Plus, Trash2
} from "lucide-react";
import { format, parseISO, addBusinessDays, differenceInBusinessDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OP {
  id: number;
  op_number: string;
  client: string;
  color: string;
  material: string;
  quantity: number;
  unit: string;
  status: string;
  entry_date: string;
  expected_date: string;
  requires_lab: number;
  is_completed: number;
  priority: number;
  priority_notes: string;
  sequence_order: number;
  region_jaragua: number;
  region_brusque: number;
  region_gaspar: number;
}

// Helper to render region badges
function RegionBadges({ op }: { op: OP }) {
  const regions = [];
  if (op.region_jaragua === 1) regions.push("Jaraguá");
  if (op.region_brusque === 1) regions.push("Brusque");
  if (op.region_gaspar === 1) regions.push("Gaspar");
  
  if (regions.length === 0) return null;
  
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {regions.map(region => (
        <span key={region} className="inline-flex items-center gap-0.5 bg-orange-100 text-orange-700 text-xs px-1.5 py-0.5 rounded-full font-semibold">
          <MapPin className="w-2.5 h-2.5" />
          {region}
        </span>
      ))}
    </div>
  );
}

interface ListaSaida {
  id: number;
  op_id: number;
  exit_date: string;
  transportadora_id: number | null;
  regiao_id: number | null;
  op_number: string;
  client: string;
  color: string;
  material: string;
  quantity: number;
  unit: string;
  transportadora_name: string | null;
  regiao_name: string | null;
}

interface Transportadora {
  id: number;
  name: string;
  is_active: number;
}

interface Regiao {
  id: number;
  name: string;
  is_active: number;
}

interface CapacityData {
  [key: string]: {
    total: number;
    urgent: number;
  };
}

interface KPIs {
  active_ops: number;
  overdue_ops: number;
  completed_today: number;
  productivity_rate: number;
}

const stages = [
  { key: "almoxarifado", label: "Almoxarifado", color: "bg-slate-100 border-slate-300" },
  { key: "qualidade_malhas", label: "Qualidade Malhas", color: "bg-pink-50 border-pink-300" },
  { key: "preparacao", label: "Preparação", color: "bg-blue-50 border-blue-300" },
  { key: "box5", label: "Box 5", color: "bg-yellow-50 border-yellow-300" },
  { key: "producao", label: "Produção", color: "bg-purple-50 border-purple-300" },
  { key: "secadora", label: "Secadora", color: "bg-orange-50 border-orange-300" },
  { key: "destrinchagem", label: "Destrinchagem", color: "bg-teal-50 border-teal-300" },
  { key: "enrolagem", label: "Enrolagem", color: "bg-indigo-50 border-indigo-300" },
  { key: "qualidade", label: "Qualidade", color: "bg-green-50 border-green-300" },
  { key: "concluido", label: "Concluído", color: "bg-emerald-50 border-emerald-300" },
];

const priorityLabels = [
  { value: 0, label: "Normal", color: "bg-gray-100 text-gray-700" },
  { value: 1, label: "Média", color: "bg-blue-100 text-blue-700" },
  { value: 2, label: "Alta", color: "bg-orange-100 text-orange-700" },
  { value: 3, label: "Urgente", color: "bg-red-100 text-red-700" },
];

export default function PCPPage() {
  const { request } = useAPI();
  const navigate = useNavigate();
  const [view, setView] = useState<"kanban" | "planning" | "deadlines" | "capacity" | "indicators" | "lab_deadlines" | "lista_saida">("indicators");
  const [ops, setOps] = useState<OP[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPIs>({ active_ops: 0, overdue_ops: 0, completed_today: 0, productivity_rate: 0 });
  const [capacityData, setCapacityData] = useState<CapacityData>({});
  const [overdueOps, setOverdueOps] = useState<OP[]>([]);
  const [priorityOps, setPriorityOps] = useState<OP[]>([]);
  const [finalizedLabOps, setFinalizedLabOps] = useState<number[]>([]);
  const [listaSaida, setListaSaida] = useState<ListaSaida[]>([]);
  const [transportadoras, setTransportadoras] = useState<Transportadora[]>([]);
  const [regioes, setRegioes] = useState<Regiao[]>([]);
  
  // Lista de Saída form state
  const [selectedOpForLista, setSelectedOpForLista] = useState<OP | null>(null);
  const [selectedOpsForLista, setSelectedOpsForLista] = useState<number[]>([]);
  const [exitDate, setExitDate] = useState("");
  const [exitTime, setExitTime] = useState("");
  const [selectedTransportadoraRegiao, setSelectedTransportadoraRegiao] = useState("");
  
  // Edit priority state
  const [editingPriority, setEditingPriority] = useState<number | null>(null);
  const [editPriorityValue, setEditPriorityValue] = useState(0);
  const [editPriorityNotes, setEditPriorityNotes] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [opsData, kpisData, capacityData, overdueData, priorityData, labData, listaSaidaData, transportadorasData, regioesData] = await Promise.all([
        request("/api/production-orders"),
        request("/api/dashboard/kpis"),
        request("/api/pcp/capacity-analysis"),
        request("/api/pcp/overdue-ops"),
        request("/api/pcp/priority-ops"),
        request("/api/laboratory/records"),
        request("/api/lista-saida"),
        request("/api/transportadoras"),
        request("/api/regioes"),
      ]);
      setOps(opsData);
      setKpis(kpisData);
      setCapacityData(capacityData);
      setOverdueOps(overdueData);
      setPriorityOps(priorityData);
      setFinalizedLabOps((labData || []).filter((r: any) => r.lab_record_id != null).map((r: any) => r.id));
      setListaSaida(listaSaidaData || []);
      setTransportadoras((transportadorasData || []).filter((t: Transportadora) => t.is_active === 1));
      setRegioes((regioesData || []).filter((r: Regiao) => r.is_active === 1));
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }

  function getOPsByStage(stage: string) {
    return ops.filter(op => op.status === stage);
  }

  function isOverdue(expectedDate: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expected = new Date(expectedDate);
    expected.setHours(0, 0, 0, 0);
    return expected < today;
  }

  function getDaysUntilDue(expectedDate: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expected = new Date(expectedDate);
    expected.setHours(0, 0, 0, 0);
    const diff = expected.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  function handleOPClick(opId: number) {
    navigate(`/op/${opId}`);
  }

  async function handleSavePriority(opId: number) {
    try {
      await request(`/api/pcp/priority/${opId}`, {
        method: "PUT",
        body: JSON.stringify({
          priority: editPriorityValue,
          priority_notes: editPriorityNotes || null,
        }),
      });
      setEditingPriority(null);
      loadData();
    } catch (error) {
      alert("Erro ao salvar prioridade");
    }
  }

  function startEditPriority(op: OP) {
    setEditingPriority(op.id);
    setEditPriorityValue(op.priority || 0);
    setEditPriorityNotes(op.priority_notes || "");
  }

  function cancelEditPriority() {
    setEditingPriority(null);
    setEditPriorityValue(0);
    setEditPriorityNotes("");
  }

  // Lista de Saída functions
  function toggleOpSelection(opId: number) {
    setSelectedOpsForLista(prev => 
      prev.includes(opId) 
        ? prev.filter(id => id !== opId)
        : [...prev, opId]
    );
  }

  function toggleSelectAllOps() {
    if (selectedOpsForLista.length === availableOpsForLista.length) {
      setSelectedOpsForLista([]);
    } else {
      setSelectedOpsForLista(availableOpsForLista.map(op => op.id));
    }
  }

  async function handleAddToListaSaida() {
    const opsToAdd = selectedOpsForLista.length > 0 
      ? selectedOpsForLista 
      : selectedOpForLista ? [selectedOpForLista.id] : [];
    
    if (opsToAdd.length === 0 || !exitDate) {
      alert("Selecione pelo menos uma OP e uma data de saída");
      return;
    }
    // Parse transportadora/regiao combined value (format: "t_1" or "r_2")
    let transportadora_id = null;
    let regiao_id = null;
    if (selectedTransportadoraRegiao) {
      const [type, id] = selectedTransportadoraRegiao.split("_");
      if (type === "t") transportadora_id = parseInt(id);
      if (type === "r") regiao_id = parseInt(id);
    }
    try {
      // Add all selected OPs
      for (const opId of opsToAdd) {
        await request("/api/lista-saida", {
          method: "POST",
          body: JSON.stringify({
            op_id: opId,
            exit_date: exitDate,
            exit_time: exitTime || null,
            transportadora_id,
            regiao_id,
          }),
        });
      }
      setSelectedOpForLista(null);
      setSelectedOpsForLista([]);
      setExitDate("");
      setExitTime("");
      setSelectedTransportadoraRegiao("");
      loadData();
    } catch (error: any) {
      alert(error.message || "Erro ao adicionar à lista de saída");
    }
  }

  async function handleRemoveFromListaSaida(id: number) {
    if (!confirm("Remover esta OP da lista de saída?")) return;
    try {
      await request(`/api/lista-saida/${id}`, { method: "DELETE" });
      loadData();
    } catch (error) {
      alert("Erro ao remover da lista de saída");
    }
  }

  function getDayOfWeek(dateStr: string): string {
    try {
      const date = parseISO(dateStr);
      return format(date, "EEEE", { locale: ptBR });
    } catch {
      return "";
    }
  }

  // Get OPs that are not yet in lista_saida
  const availableOpsForLista = ops.filter(
    op => op.is_completed === 0 && !listaSaida.some(ls => ls.op_id === op.id)
  );

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Carregando dados do PCP...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">PCP - Planejamento e Controle</h1>
            <p className="text-gray-600 mt-1">Sistema completo de gestão da produção</p>
          </div>
        </div>

        {/* View Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setView("indicators")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
              view === "indicators"
                ? "bg-blue-500 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <Activity className="w-5 h-5" />
            Indicadores
          </button>
          <button
            onClick={() => setView("kanban")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
              view === "kanban"
                ? "bg-blue-500 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <Package className="w-5 h-5" />
            Kanban
          </button>
          <button
            onClick={() => setView("planning")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
              view === "planning"
                ? "bg-blue-500 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <Target className="w-5 h-5" />
            Planejamento
          </button>
          <button
            onClick={() => setView("deadlines")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
              view === "deadlines"
                ? "bg-blue-500 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <Calendar className="w-5 h-5" />
            Prazos
          </button>
          <button
            onClick={() => setView("capacity")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
              view === "capacity"
                ? "bg-blue-500 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            Capacidade
          </button>
          <button
            onClick={() => setView("lab_deadlines")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
              view === "lab_deadlines"
                ? "bg-purple-500 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <FlaskConical className="w-5 h-5" />
            Prazos Laboratório
          </button>
          <button
            onClick={() => setView("lista_saida")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
              view === "lista_saida"
                ? "bg-green-500 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <Truck className="w-5 h-5" />
            Lista de Saída
          </button>
        </div>

        {/* Indicators View */}
        {view === "indicators" && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg border-2 border-blue-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-blue-600">
                    <Package className="w-8 h-8" />
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-blue-900">{kpis.active_ops}</div>
                    <div className="text-sm text-blue-700">OPs Ativas</div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl shadow-lg border-2 border-red-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-red-600">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-red-900">{kpis.overdue_ops}</div>
                    <div className="text-sm text-red-700">Atrasadas</div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-lg border-2 border-green-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-green-600">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-green-900">{kpis.completed_today}</div>
                    <div className="text-sm text-green-700">Concluídas Hoje</div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl shadow-lg border-2 border-purple-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-purple-600">
                    <TrendingUp className="w-8 h-8" />
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-purple-900">{kpis.productivity_rate}%</div>
                    <div className="text-sm text-purple-700">Produtividade</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Priority OPs */}
            {priorityOps.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Flag className="w-6 h-6 text-red-600" />
                  OPs Prioritárias
                </h2>
                <div className="space-y-3">
                  {priorityOps.slice(0, 10).map((op) => (
                    <div
                      key={op.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all cursor-pointer"
                      onClick={() => handleOPClick(op.id)}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                          priorityLabels[op.priority]?.color || priorityLabels[0].color
                        }`}>
                          {priorityLabels[op.priority]?.label || "Normal"}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">OP {op.op_number}</div>
                          <div className="text-sm text-gray-600">{op.client} - {op.color}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">{op.status}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(op.expected_date).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Overdue OPs */}
            {overdueOps.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-red-200 p-6">
                <h2 className="text-xl font-bold text-red-900 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                  OPs Atrasadas ({overdueOps.length})
                </h2>
                <div className="space-y-3">
                  {overdueOps.slice(0, 10).map((op) => {
                    const daysOverdue = Math.abs(getDaysUntilDue(op.expected_date));
                    return (
                      <div
                        key={op.id}
                        className="flex items-center justify-between p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-all cursor-pointer border border-red-200"
                        onClick={() => handleOPClick(op.id)}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                            {daysOverdue}d
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">OP {op.op_number}</div>
                            <div className="text-sm text-gray-600">{op.client} - {op.color}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">{op.status}</div>
                          <div className="text-xs text-red-600 font-semibold">
                            Previsão: {new Date(op.expected_date).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Kanban View */}
        {view === "kanban" && (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {stages.map((stage) => {
              const stageOPs = getOPsByStage(stage.key);
              return (
                <div key={stage.key} className="flex-shrink-0 w-80">
                  <div className={`rounded-lg border-2 ${stage.color} p-4 shadow-sm`}>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-semibold text-gray-900">{stage.label}</h2>
                      <span className="bg-white text-gray-700 px-2 py-1 rounded-full text-sm font-medium">
                        {stageOPs.length}
                      </span>
                    </div>

                    <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
                      {stageOPs.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 text-sm">
                          Nenhuma OP
                        </div>
                      ) : (
                        stageOPs.map((op) => (
                          <button
                            key={op.id}
                            onClick={() => handleOPClick(op.id)}
                            className="w-full bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all text-left"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="font-semibold text-gray-900">OP {op.op_number}</div>
                              <div className="flex gap-1">
                                {op.priority > 0 && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                    priorityLabels[op.priority]?.color || priorityLabels[0].color
                                  }`}>
                                    {priorityLabels[op.priority]?.label || "Normal"}
                                  </span>
                                )}
                                {op.requires_lab === 1 && (
                                  <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full">
                                    Lab
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="text-sm text-gray-700 mb-1">
                              <div className="font-medium">{op.client}</div>
                              <div className="text-gray-600">{op.color}</div>
                              <RegionBadges op={op} />
                            </div>

                            <div className="text-xs text-gray-600 mb-2">
                              {op.material} • {op.quantity} {op.unit}
                            </div>

                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1 text-gray-600">
                                <Clock className="w-3 h-3" />
                                {new Date(op.expected_date).toLocaleDateString('pt-BR')}
                              </div>
                              {op.is_completed === 1 ? (
                                <div className="flex items-center gap-1 text-green-600">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Concluído</span>
                                </div>
                              ) : isOverdue(op.expected_date) ? (
                                <div className="flex items-center gap-1 text-red-600">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>Atrasado</span>
                                </div>
                              ) : null}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Planning View */}
        {view === "planning" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="w-6 h-6 text-blue-600" />
                Gestão de Prioridades
              </h2>
              <p className="text-gray-600 mb-6">
                Defina prioridades para OPs ativas e organize o sequenciamento da produção
              </p>

              <div className="space-y-3">
                {ops.filter(op => op.is_completed === 0).map((op) => (
                  <div
                    key={op.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {editingPriority === op.id ? (
                        <div className="flex items-center gap-3 flex-1">
                          <select
                            value={editPriorityValue}
                            onChange={(e) => setEditPriorityValue(parseInt(e.target.value))}
                            className="px-3 py-2 border border-gray-300 rounded-lg"
                          >
                            {priorityLabels.map((label) => (
                              <option key={label.value} value={label.value}>
                                {label.label}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={editPriorityNotes}
                            onChange={(e) => setEditPriorityNotes(e.target.value)}
                            placeholder="Observações..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                          />
                          <button
                            onClick={() => handleSavePriority(op.id)}
                            className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg transition-all"
                          >
                            <Save className="w-5 h-5" />
                          </button>
                          <button
                            onClick={cancelEditPriority}
                            className="bg-gray-300 hover:bg-gray-400 text-gray-700 p-2 rounded-lg transition-all"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                            priorityLabels[op.priority || 0]?.color || priorityLabels[0].color
                          }`}>
                            {priorityLabels[op.priority || 0]?.label || "Normal"}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">OP {op.op_number}</div>
                            <div className="text-sm text-gray-600">{op.client} - {op.color}</div>
                            {op.priority_notes && (
                              <div className="text-xs text-gray-500 mt-1 italic">{op.priority_notes}</div>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {editingPriority !== op.id && (
                      <div className="flex items-center gap-2">
                        <div className="text-right mr-3">
                          <div className="text-sm font-medium text-gray-900">{op.status}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(op.expected_date).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                        <button
                          onClick={() => startEditPriority(op)}
                          className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition-all"
                          title="Editar prioridade"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleOPClick(op.id)}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-700 p-2 rounded-lg transition-all"
                          title="Ver detalhes"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Deadlines View */}
        {view === "deadlines" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-blue-600" />
                Controle de Prazos
              </h2>

              <div className="space-y-3">
                {ops
                  .filter(op => op.is_completed === 0)
                  .sort((a, b) => new Date(a.expected_date).getTime() - new Date(b.expected_date).getTime())
                  .map((op) => {
                    const daysUntil = getDaysUntilDue(op.expected_date);
                    const overdue = daysUntil < 0;
                    const urgent = daysUntil <= 2 && daysUntil >= 0;

                    return (
                      <div
                        key={op.id}
                        className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all ${
                          overdue
                            ? "bg-red-50 border-2 border-red-300 hover:bg-red-100"
                            : urgent
                            ? "bg-orange-50 border-2 border-orange-300 hover:bg-orange-100"
                            : "bg-gray-50 border border-gray-200 hover:bg-gray-100"
                        }`}
                        onClick={() => handleOPClick(op.id)}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                            overdue
                              ? "bg-red-600 text-white"
                              : urgent
                              ? "bg-orange-600 text-white"
                              : "bg-blue-100 text-blue-700"
                          }`}>
                            {overdue ? `${Math.abs(daysUntil)}d atraso` : urgent ? `${daysUntil}d restantes` : `${daysUntil}d`}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">OP {op.op_number}</div>
                            <div className="text-sm text-gray-600">{op.client} - {op.color}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">{op.status}</div>
                          <div className={`text-xs font-semibold ${
                            overdue ? "text-red-600" : urgent ? "text-orange-600" : "text-gray-500"
                          }`}>
                            {new Date(op.expected_date).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* Capacity View */}
        {view === "capacity" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-blue-600" />
                Análise de Capacidade por Setor
              </h2>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(capacityData).map(([stage, data]) => {
                  const stageInfo = stages.find(s => s.key === stage);
                  if (!stageInfo) return null;

                  const utilizationPercent = data.total > 0 ? Math.min((data.total / 20) * 100, 100) : 0;
                  const isOverloaded = utilizationPercent > 80;
                  const isUrgent = data.urgent > 0;

                  return (
                    <div
                      key={stage}
                      className={`p-6 rounded-xl border-2 ${
                        isOverloaded
                          ? "bg-red-50 border-red-300"
                          : isUrgent
                          ? "bg-orange-50 border-orange-300"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <h3 className="font-semibold text-gray-900 mb-3">{stageInfo.label}</h3>
                      
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">Total de OPs</span>
                            <span className="font-bold text-gray-900">{data.total}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full transition-all ${
                                isOverloaded ? "bg-red-500" : "bg-blue-500"
                              }`}
                              style={{ width: `${utilizationPercent}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {utilizationPercent.toFixed(0)}% de capacidade
                          </div>
                        </div>

                        {data.urgent > 0 && (
                          <div className="flex items-center justify-between bg-white rounded-lg p-2 border border-orange-200">
                            <span className="text-sm text-gray-600">Urgentes</span>
                            <span className="bg-orange-600 text-white text-xs px-2 py-1 rounded-full font-bold">
                              {data.urgent}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg border-2 border-blue-200 p-6">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-600" />
                Recomendações do Sistema
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                {Object.entries(capacityData).some(([_, data]) => (data.total / 20) > 0.8) && (
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <span>Alguns setores estão com sobrecarga. Considere redistribuir ou priorizar OPs urgentes.</span>
                  </li>
                )}
                {overdueOps.length > 0 && (
                  <li className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span>Existem {overdueOps.length} OPs atrasadas que requerem atenção imediata.</span>
                  </li>
                )}
                {priorityOps.length > 5 && (
                  <li className="flex items-start gap-2">
                    <Flag className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Há {priorityOps.length} OPs prioritárias em andamento. Monitore o progresso constantemente.</span>
                  </li>
                )}
                <li className="flex items-start gap-2">
                  <ArrowUpCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Taxa de produtividade atual: {kpis.productivity_rate}%. Continue mantendo o ritmo!</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Lab Deadlines View */}
        {view === "lab_deadlines" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-purple-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FlaskConical className="w-6 h-6 text-purple-600" />
                Prazos do Laboratório
              </h2>
              <p className="text-gray-600 mb-4">
                Previsão de saída: 2 dias úteis. Amarelo = urgente (2 dias). Vermelho = atrasado (3+ dias).
              </p>

              <div className="space-y-3">
                {ops
                  .filter(op => op.requires_lab === 1 && !finalizedLabOps.includes(op.id))
                  .sort((a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime())
                  .map((op) => {
                    const entryDate = new Date(op.entry_date);
                    const today = new Date();
                    const labExitDate = addBusinessDays(entryDate, 2);
                    const daysInLab = differenceInBusinessDays(today, entryDate);
                    
                    const isDelayed = daysInLab >= 3;
                    const isUrgent = daysInLab === 2;

                    return (
                      <div
                        key={op.id}
                        className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all ${
                          isDelayed
                            ? "bg-red-100 border-2 border-red-400 hover:bg-red-200"
                            : isUrgent
                            ? "bg-yellow-100 border-2 border-yellow-400 hover:bg-yellow-200"
                            : "bg-gray-50 border border-gray-200 hover:bg-gray-100"
                        }`}
                        onClick={() => handleOPClick(op.id)}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                            isDelayed
                              ? "bg-red-600 text-white"
                              : isUrgent
                              ? "bg-yellow-600 text-white"
                              : "bg-purple-100 text-purple-700"
                          }`}>
                            {isDelayed ? "Atrasado" : isUrgent ? "Urgente" : `${daysInLab}d no lab`}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">OP {op.op_number}</div>
                            <div className="text-sm text-gray-600">{op.client} - {op.color}</div>
                            <RegionBadges op={op} />
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-700">
                            Entrada: {entryDate.toLocaleDateString('pt-BR')}
                          </div>
                          <div className={`text-xs font-semibold ${
                            isDelayed ? "text-red-600" : isUrgent ? "text-yellow-700" : "text-purple-600"
                          }`}>
                            Previsão Saída: {labExitDate.toLocaleDateString('pt-BR')}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Status: {op.status}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                {ops.filter(op => op.requires_lab === 1 && !finalizedLabOps.includes(op.id)).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Nenhuma OP com marcação de laboratório pendente
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Lista de Saída View */}
        {view === "lista_saida" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left side - Available OPs list */}
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-green-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="w-6 h-6 text-green-600" />
                  OPs Disponíveis
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-center py-3 px-2 font-semibold text-gray-700">
                          <input
                            type="checkbox"
                            checked={selectedOpsForLista.length === availableOpsForLista.length && availableOpsForLista.length > 0}
                            onChange={toggleSelectAllOps}
                            className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                        </th>
                        <th className="text-left py-3 px-3 font-semibold text-gray-700">OP</th>
                        <th className="text-left py-3 px-3 font-semibold text-gray-700">Cliente</th>
                        <th className="text-left py-3 px-3 font-semibold text-gray-700">Cor</th>
                        <th className="text-left py-3 px-3 font-semibold text-gray-700">Material</th>
                        <th className="text-left py-3 px-3 font-semibold text-gray-700">Qtd</th>
                        <th className="text-left py-3 px-3 font-semibold text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {availableOpsForLista.map((op) => (
                        <tr 
                          key={op.id} 
                          className={`border-b border-gray-100 hover:bg-green-50 cursor-pointer transition-colors ${
                            selectedOpsForLista.includes(op.id) ? "bg-green-100" : ""
                          }`}
                          onClick={() => toggleOpSelection(op.id)}
                        >
                          <td className="py-3 px-2 text-center">
                            <input
                              type="checkbox"
                              checked={selectedOpsForLista.includes(op.id)}
                              onChange={() => toggleOpSelection(op.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                          </td>
                          <td className="py-3 px-3 font-medium text-gray-900">{op.op_number}</td>
                          <td className="py-3 px-3 text-gray-700">{op.client}</td>
                          <td className="py-3 px-3 text-gray-700">{op.color}</td>
                          <td className="py-3 px-3 text-gray-700">{op.material}</td>
                          <td className="py-3 px-3 text-gray-700">{op.quantity} {op.unit}</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              {op.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {availableOpsForLista.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-gray-500">
                            Todas as OPs já estão na lista de saída
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right side - Selection panel */}
              <div className="bg-white rounded-2xl shadow-lg border border-green-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Plus className="w-6 h-6 text-green-600" />
                  Agendar Saída
                </h2>
                
                {selectedOpsForLista.length > 0 ? (
                  <div className="space-y-4">
                    {/* Selected OPs info */}
                    <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                      <div className="font-bold text-lg text-gray-900 mb-2">
                        {selectedOpsForLista.length} OP{selectedOpsForLista.length > 1 ? 's' : ''} selecionada{selectedOpsForLista.length > 1 ? 's' : ''}
                      </div>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {availableOpsForLista
                          .filter(op => selectedOpsForLista.includes(op.id))
                          .map(op => (
                            <div key={op.id} className="text-sm text-gray-600 flex items-center justify-between">
                              <span>OP {op.op_number} - {op.client}</span>
                              <button
                                onClick={() => toggleOpSelection(op.id)}
                                className="text-red-500 hover:text-red-700 text-xs"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Data de Saída</label>
                      <input
                        type="date"
                        value={exitDate}
                        onChange={(e) => setExitDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                      {exitDate && (
                        <div className="mt-1 text-sm text-green-700 capitalize">
                          {getDayOfWeek(exitDate)}
                        </div>
                      )}
                    </div>

                    {/* Time */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Horário (opcional)</label>
                      <input
                        type="time"
                        value={exitTime}
                        onChange={(e) => setExitTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    {/* Combined Transportadora/Região */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Transportadora / Região</label>
                      <select
                        value={selectedTransportadoraRegiao}
                        onChange={(e) => setSelectedTransportadoraRegiao(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="">Selecione...</option>
                        {transportadoras.length > 0 && (
                          <optgroup label="Transportadoras">
                            {transportadoras.map(t => (
                              <option key={`t_${t.id}`} value={`t_${t.id}`}>{t.name}</option>
                            ))}
                          </optgroup>
                        )}
                        {regioes.length > 0 && (
                          <optgroup label="Regiões">
                            {regioes.map(r => (
                              <option key={`r_${r.id}`} value={`r_${r.id}`}>{r.name}</option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleAddToListaSaida}
                        className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar {selectedOpsForLista.length > 1 ? `(${selectedOpsForLista.length})` : ''}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedOpsForLista([]);
                          setExitDate("");
                          setExitTime("");
                          setSelectedTransportadoraRegiao("");
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Truck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Selecione OPs na lista ao lado para agendar a saída</p>
                  </div>
                )}
              </div>
            </div>

            {/* Exit list table */}
            <div className="bg-white rounded-2xl shadow-lg border border-green-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Truck className="w-6 h-6 text-green-600" />
                Lista de Saída Agendada
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">OP</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Cliente</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Cor</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Material</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Qtd</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Data Saída</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Dia</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Horário</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Transp./Região</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listaSaida.map((item) => (
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">{item.op_number}</td>
                        <td className="py-3 px-4 text-gray-700">{item.client}</td>
                        <td className="py-3 px-4 text-gray-700">{item.color}</td>
                        <td className="py-3 px-4 text-gray-700">{item.material}</td>
                        <td className="py-3 px-4 text-gray-700">{item.quantity} {item.unit}</td>
                        <td className="py-3 px-4 text-gray-900 font-medium">
                          {item.exit_date ? new Date(item.exit_date).toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td className="py-3 px-4 text-gray-700 capitalize">
                          {item.exit_date ? getDayOfWeek(item.exit_date) : '-'}
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {(item as any).exit_time || '-'}
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {item.transportadora_name || item.regiao_name || '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleRemoveFromListaSaida(item.id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Remover da lista"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {listaSaida.length === 0 && (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-gray-500">
                          Nenhuma OP na lista de saída
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
