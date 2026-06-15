import { useState, useEffect } from "react";
import Layout from "@/react-app/components/Layout";
import { useAPI } from "@/react-app/hooks/useAPI";
import { FlaskConical, Calendar, CheckCircle, AlertCircle, MapPin, Search, RotateCcw, ClipboardList, Target, Beaker, TrendingUp, Clock } from "lucide-react";
import { differenceInBusinessDays, addBusinessDays, format } from "date-fns";

interface LabKPIs {
  total_completed: number;
  ready_recipes: number;
  new_recipes: number;
  avg_batches: number;
  total_batches: number;
  on_time_count: number;
  pending_ops: number;
  yield_rate: number;
}

// KPI Card component for Lab
function LabKPICard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color 
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string;
  icon: any; 
  color: "purple" | "green" | "blue" | "orange" 
}) {
  const colors = {
    purple: "from-purple-50 to-purple-100 border-purple-200",
    green: "from-green-50 to-green-100 border-green-200",
    blue: "from-blue-50 to-blue-100 border-blue-200",
    orange: "from-orange-50 to-orange-100 border-orange-200",
  };
  const iconColors = {
    purple: "bg-purple-500 text-white",
    green: "bg-green-500 text-white",
    blue: "bg-blue-500 text-white",
    orange: "bg-orange-500 text-white",
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-xl p-3 border shadow-sm`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-600">{title}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        <div className={`${iconColors[color]} p-2 rounded-lg`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

// Helper to render region badges
function RegionBadges({ op }: { op: any }) {
  const regions = [];
  if (op.region_jaragua === 1) regions.push("Jaraguá");
  if (op.region_brusque === 1) regions.push("Brusque");
  if (op.region_gaspar === 1) regions.push("Gaspar");
  
  if (regions.length === 0) return null;
  
  return (
    <div className="flex flex-wrap gap-1">
      {regions.map(region => (
        <span key={region} className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-semibold">
          <MapPin className="w-3 h-3" />
          {region}
        </span>
      ))}
    </div>
  );
}

export default function Laboratorio() {
  const { data: labOPs, request } = useAPI<any[]>();
  const { data: labKPIs, request: requestKPIs } = useAPI<LabKPIs>();
  const [selectedOP, setSelectedOP] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<"new" | "ready">("new");
  const [numBatches, setNumBatches] = useState("");
  const [isRecipeReady, setIsRecipeReady] = useState(false);
  const [recipeOriginDate, setRecipeOriginDate] = useState("");
  const [description, setDescription] = useState("");
  const [activeTab, setActiveTab] = useState<"kpis" | "pending" | "completed">("kpis");
  const [searchPending, setSearchPending] = useState("");
  const [searchCompleted, setSearchCompleted] = useState("");

  useEffect(() => {
    fetchLabOPs();
    fetchKPIs();
  }, []);

  const fetchLabOPs = async () => {
    try {
      await request("/api/laboratory/records");
    } catch (error) {
      console.error("Error fetching lab OPs:", error);
    }
  };

  const fetchKPIs = async () => {
    try {
      await requestKPIs("/api/laboratory/kpis");
    } catch (error) {
      console.error("Error fetching lab KPIs:", error);
    }
  };

  // Separate pending and completed OPs
  const pendingOPs = (labOPs || []).filter((op: any) => !op.lab_record_id);
  const completedOPs = (labOPs || []).filter((op: any) => op.lab_record_id);

  // Filter by search
  const filteredPendingOPs = pendingOPs.filter((op: any) => {
    const search = searchPending.toLowerCase();
    return (
      op.op_number?.toLowerCase().includes(search) ||
      op.client?.toLowerCase().includes(search) ||
      op.color?.toLowerCase().includes(search)
    );
  });

  const filteredCompletedOPs = completedOPs.filter((op: any) => {
    const search = searchCompleted.toLowerCase();
    return (
      op.op_number?.toLowerCase().includes(search) ||
      op.client?.toLowerCase().includes(search) ||
      op.color?.toLowerCase().includes(search)
    );
  });

  const getBusinessDaysInLab = (op: any) => {
    if (!op.lab_record_id) {
      const createdDate = new Date(op.created_at);
      const today = new Date();
      
      if (isNaN(createdDate.getTime())) {
        return 0;
      }
      
      return differenceInBusinessDays(today, createdDate);
    }
    return null;
  };

  const getLabExitDate = (op: any) => {
    const createdDate = new Date(op.created_at);
    if (isNaN(createdDate.getTime())) {
      return null;
    }
    return addBusinessDays(createdDate, 2);
  };

  const getUrgencyLevel = (op: any): "normal" | "urgent" | "delayed" => {
    if (op.lab_record_id) {
      return "normal";
    }
    const businessDays = getBusinessDaysInLab(op);
    if (businessDays === null) return "normal";
    
    if (businessDays >= 3) {
      return "delayed";
    } else if (businessDays >= 2) {
      return "urgent";
    }
    return "normal";
  };

  const handleFinalize = async (op: any) => {
    setSelectedOP(op);
    setShowForm(true);
  };

  const handleReturnToLab = async (op: any) => {
    if (!confirm(`Deseja retornar a OP ${op.op_number} para o laboratório?`)) {
      return;
    }

    try {
      await request(`/api/laboratory/${op.lab_record_id}`, {
        method: "DELETE",
      });
      alert("OP retornada para o laboratório!");
      fetchLabOPs();
    } catch (error) {
      alert("Erro ao retornar OP para o laboratório");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOP) {
      alert("Por favor, selecione uma OP");
      return;
    }

    try {
      const startTime = new Date(selectedOP.created_at).toISOString();
      const endTime = new Date().toISOString();

      await request("/api/laboratory", {
        method: "POST",
        body: JSON.stringify({
          po_id: selectedOP.id,
          num_batches: numBatches ? parseInt(numBatches) : undefined,
          is_recipe_ready: isRecipeReady,
          recipe_origin_date: recipeOriginDate || undefined,
          description: description || undefined,
          is_approved: true,
          start_time: startTime,
          end_time: endTime,
        }),
      });

      alert("OP finalizada no laboratório!");
      setSelectedOP(null);
      setNumBatches("");
      setIsRecipeReady(false);
      setRecipeOriginDate("");
      setDescription("");
      setShowForm(false);
      fetchLabOPs();
    } catch (error) {
      alert("Erro ao finalizar OP no laboratório");
    }
  };

  const getLabStatus = (op: any) => {
    if (op.lab_record_id) {
      const startDate = new Date(op.lab_start_time);
      const endDate = new Date(op.lab_end_time);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return {
          completed: true,
          businessDays: 0,
          completedDate: op.lab_end_time,
        };
      }
      
      const businessDays = differenceInBusinessDays(endDate, startDate);
      return {
        completed: true,
        businessDays,
        completedDate: op.lab_end_time,
      };
    }
    return {
      completed: false,
      businessDays: getBusinessDaysInLab(op),
      completedDate: null,
    };
  };

  if (showForm && selectedOP) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Laboratório</h1>
            <p className="text-gray-600">Finalizar processamento da OP</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* OP Info */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl shadow-lg border border-purple-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">OP Selecionada</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">OP:</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedOP.op_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Cliente:</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedOP.client}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Cor:</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedOP.color}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Previsão Saída Lab:</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {(() => {
                      const exitDate = getLabExitDate(selectedOP);
                      return exitDate ? format(exitDate, "dd/MM/yyyy") : "-";
                    })()}
                  </p>
                </div>
              </div>
            </div>

            {/* Mode Selector */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <div className="flex gap-4 mb-6">
                <button
                  type="button"
                  onClick={() => setMode("new")}
                  className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
                    mode === "new"
                      ? "bg-purple-500 text-white shadow-lg"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Desenvolvimento Nova Cor
                </button>
                <button
                  type="button"
                  onClick={() => setMode("ready")}
                  className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
                    mode === "ready"
                      ? "bg-purple-500 text-white shadow-lg"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Receita Pronta
                </button>
              </div>

              {mode === "new" ? (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Quantas Batidas?
                  </label>
                  <input
                    type="number"
                    value={numBatches}
                    onChange={(e) => setNumBatches(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              ) : (
                <>
                  <div className="flex items-center mb-4">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isRecipeReady}
                        onChange={(e) => setIsRecipeReady(e.target.checked)}
                        className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm font-semibold text-gray-700">
                        Receita Pronta
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <Calendar className="w-5 h-5 mr-2 text-purple-600" />
                      Data Origem da Receita
                    </label>
                    <input
                      type="date"
                      value={recipeOriginDate}
                      onChange={(e) => setRecipeOriginDate(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}

              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Descrição / Observações
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={3}
                  placeholder="Observações sobre o processo..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedOP(null);
                  setShowForm(false);
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all transform hover:scale-105 shadow-lg flex items-center space-x-2"
              >
                <CheckCircle className="w-6 h-6" />
                <span>Finalizar OP</span>
              </button>
            </div>
          </form>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Laboratório</h1>
          <p className="text-gray-600">Controle de OPs com laboratório</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("kpis")}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === "kpis"
                ? "bg-blue-500 text-white shadow-lg"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            Indicadores
          </button>
          <button
            onClick={() => setActiveTab("pending")}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === "pending"
                ? "bg-purple-500 text-white shadow-lg"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <FlaskConical className="w-5 h-5" />
            OPs com Laboratório
            <span className={`px-2 py-0.5 rounded-full text-sm ${
              activeTab === "pending" ? "bg-purple-400" : "bg-gray-200"
            }`}>
              {pendingOPs.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === "completed"
                ? "bg-green-500 text-white shadow-lg"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <ClipboardList className="w-5 h-5" />
            Registro de OPs
            <span className={`px-2 py-0.5 rounded-full text-sm ${
              activeTab === "completed" ? "bg-green-400" : "bg-gray-200"
            }`}>
              {completedOPs.length}
            </span>
          </button>
        </div>

        {activeTab === "kpis" ? (
          /* KPIs Dashboard */
          <div className="space-y-6">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <LabKPICard
                title="Receitas Finalizadas"
                value={labKPIs?.total_completed || 0}
                subtitle="Total processadas"
                icon={CheckCircle}
                color="green"
              />
              <LabKPICard
                title="Receitas Prontas"
                value={labKPIs?.ready_recipes || 0}
                subtitle="Já existentes"
                icon={ClipboardList}
                color="blue"
              />
              <LabKPICard
                title="Novas Cores"
                value={labKPIs?.new_recipes || 0}
                subtitle="Desenvolvidas"
                icon={Beaker}
                color="purple"
              />
              <LabKPICard
                title="OPs Pendentes"
                value={labKPIs?.pending_ops || 0}
                subtitle="Aguardando"
                icon={Clock}
                color="orange"
              />
            </div>

            {/* Performance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <Target className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Média de Tentativas</h3>
                    <p className="text-sm text-gray-500">Por nova receita</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-purple-600">{labKPIs?.avg_batches || 0}</p>
                  <p className="text-sm text-gray-500 mt-1">batidas/receita</p>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-600">
                    Total de batidas: <span className="font-semibold">{labKPIs?.total_batches || 0}</span>
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Rendimento</h3>
                    <p className="text-sm text-gray-500">Entregas no prazo</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-green-600">{labKPIs?.yield_rate || 0}%</p>
                  <p className="text-sm text-gray-500 mt-1">dentro de 2 dias úteis</p>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-600">
                    No prazo: <span className="font-semibold text-green-600">{labKPIs?.on_time_count || 0}</span> de {labKPIs?.total_completed || 0}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <FlaskConical className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Taxa de Reuso</h3>
                    <p className="text-sm text-gray-500">Receitas prontas vs novas</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-blue-600">
                    {labKPIs?.total_completed ? Math.round((labKPIs.ready_recipes / labKPIs.total_completed) * 100) : 0}%
                  </p>
                  <p className="text-sm text-gray-500 mt-1">receitas reutilizadas</p>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-600">
                    Prontas: <span className="font-semibold text-blue-600">{labKPIs?.ready_recipes || 0}</span> | 
                    Novas: <span className="font-semibold text-purple-600">{labKPIs?.new_recipes || 0}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === "pending" ? (
          /* Pending OPs Table */
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-purple-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FlaskConical className="w-6 h-6 text-purple-600 mr-3" />
                  <h2 className="text-xl font-bold text-gray-900">OPs com Laboratório</h2>
                </div>
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchPending}
                    onChange={(e) => setSearchPending(e.target.value)}
                    placeholder="Buscar OP, cliente ou cor..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent w-64"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">OP</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Cliente</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Cor</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Região</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Previsão Saída</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Dias no Lab</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPendingOPs.length > 0 ? (
                    filteredPendingOPs.map((op) => {
                      const labStatus = getLabStatus(op);
                      const urgency = getUrgencyLevel(op);
                      const labExitDate = getLabExitDate(op);
                      
                      const rowBgClass = urgency === "delayed" 
                        ? "bg-red-100 hover:bg-red-200" 
                        : urgency === "urgent" 
                          ? "bg-yellow-100 hover:bg-yellow-200" 
                          : "hover:bg-gray-50";
                      
                      return (
                        <tr key={op.id} className={`transition-colors ${rowBgClass}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`font-semibold ${
                              urgency === "delayed" ? "text-red-700" : 
                              urgency === "urgent" ? "text-yellow-700" : "text-blue-600"
                            }`}>
                              {op.op_number}
                            </span>
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap ${
                            urgency === "delayed" ? "text-red-900" : 
                            urgency === "urgent" ? "text-yellow-900" : "text-gray-900"
                          }`}>{op.client}</td>
                          <td className={`px-6 py-4 whitespace-nowrap ${
                            urgency === "delayed" ? "text-red-900" : 
                            urgency === "urgent" ? "text-yellow-900" : "text-gray-900"
                          }`}>{op.color}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <RegionBadges op={op} />
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                            urgency === "delayed" ? "text-red-700 font-semibold" : 
                            urgency === "urgent" ? "text-yellow-700 font-semibold" : "text-gray-600"
                          }`}>
                            {labExitDate ? format(labExitDate, "dd/MM/yyyy") : "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              {urgency === "delayed" && <AlertCircle className="w-4 h-4 text-red-600" />}
                              {urgency === "urgent" && <AlertCircle className="w-4 h-4 text-yellow-600" />}
                              <span className={`text-sm font-semibold ${
                                urgency === "delayed" ? "text-red-600" : 
                                urgency === "urgent" ? "text-yellow-600" : "text-blue-600"
                              }`}>
                                {urgency === "delayed" ? "Atrasado" : urgency === "urgent" ? "Urgente" : "Em Aberto"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm font-semibold ${
                              urgency === "delayed" ? "text-red-700" : 
                              urgency === "urgent" ? "text-yellow-700" : "text-gray-700"
                            }`}>
                              {labStatus.businessDays} {labStatus.businessDays === 1 ? "dia útil" : "dias úteis"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleFinalize(op)}
                              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all"
                            >
                              Finalizar
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                        {searchPending ? "Nenhuma OP encontrada" : "Nenhuma OP pendente no laboratório"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Completed OPs Table */
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-green-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ClipboardList className="w-6 h-6 text-green-600 mr-3" />
                  <h2 className="text-xl font-bold text-gray-900">Registro de OPs</h2>
                </div>
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchCompleted}
                    onChange={(e) => setSearchCompleted(e.target.value)}
                    placeholder="Buscar OP, cliente ou cor..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent w-64"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">OP</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Cliente</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Cor</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Região</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tempo no Lab</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Finalizado em</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredCompletedOPs.length > 0 ? (
                    filteredCompletedOPs.map((op) => {
                      const labStatus = getLabStatus(op);
                      
                      return (
                        <tr key={op.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-semibold text-blue-600">{op.op_number}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-900">{op.client}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-900">{op.color}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <RegionBadges op={op} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-semibold text-green-700">
                              {labStatus.businessDays} {labStatus.businessDays === 1 ? "dia útil" : "dias úteis"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {labStatus.completedDate ? format(new Date(labStatus.completedDate), "dd/MM/yyyy HH:mm") : "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleReturnToLab(op)}
                              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2"
                            >
                              <RotateCcw className="w-4 h-4" />
                              Retornar
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        {searchCompleted ? "Nenhuma OP encontrada" : "Nenhuma OP finalizada no laboratório"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
