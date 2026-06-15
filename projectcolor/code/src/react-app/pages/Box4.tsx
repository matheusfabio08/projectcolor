import { useState, useEffect } from "react";
import Layout from "@/react-app/components/Layout";
import { useAPI } from "@/react-app/hooks/useAPI";
import { Search, Users, AlertCircle, RefreshCcw, CheckCircle2, Play, Square, Factory, FlaskConical, Scale } from "lucide-react";
import { ProductionOrder, Employee } from "@/shared/types";
import { RegionBadges } from "@/react-app/components/RegionBadges";
import { DensityCalculator } from "@/react-app/components/DensityCalculator";

export default function Box4() {
  const { request } = useAPI();
  const [view, setView] = useState<"kanban" | "process" | "calculator">("kanban");
  const [opSearch, setOpSearch] = useState("");
  const [selectedOP, setSelectedOP] = useState<ProductionOrder | null>(null);
  const [isInProgress, setIsInProgress] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [employee, setEmployee] = useState("");
  const [hasAdjustment, setHasAdjustment] = useState(false);
  const [adjustmentDetails, setAdjustmentDetails] = useState("");
  const [isReprocess, setIsReprocess] = useState(false);
  const [reprocessReason, setReprocessReason] = useState("");
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([]);

  // Kanban states
  const [waitingOPs, setWaitingOPs] = useState<ProductionOrder[]>([]);
  const [inProgressOPs, setInProgressOPs] = useState<ProductionOrder[]>([]);
  const [completedOPs, setCompletedOPs] = useState<ProductionOrder[]>([]);
  const [finalizedLabOPs, setFinalizedLabOPs] = useState<number[]>([]);

  useEffect(() => {
    fetchEmployees();
    if (view === "kanban") {
      loadKanbanData();
    }
  }, [view]);

  const fetchEmployees = async () => {
    try {
      const data = await request("/api/employees?sector=Box 4");
      setAvailableEmployees(data);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const loadKanbanData = async () => {
    try {
      const [data, labRecords] = await Promise.all([
        request("/api/box4/records"),
        request("/api/laboratory/records")
      ]);
      setWaitingOPs(data.waiting || []);
      setInProgressOPs(data.inProgress || []);
      setCompletedOPs(data.completed || []);
      // Store IDs of OPs that have been finalized in lab
      const finalizedIds = (labRecords || []).map((r: any) => r.production_order_id);
      setFinalizedLabOPs(finalizedIds);
    } catch (error) {
      console.error("Failed to load kanban data:", error);
    }
  };

  const searchOP = async () => {
    if (!opSearch.trim()) return;

    try {
      const ops = await request(`/api/production-orders?search=${opSearch}`);
      if (ops && ops.length > 0) {
        const op = ops.find((o: ProductionOrder) => 
          o.op_number === opSearch && o.status === "box4"
        );
        if (op) {
          setSelectedOP(op);
          
          const status = await request(`/api/op-status/${op.id}/box4`);
          setIsInProgress(status.in_progress);
          setShowForm(false);
          setView("process");
        } else {
          alert("OP não encontrada ou não está no status Box 4");
        }
      }
    } catch (error) {
      alert("Erro ao buscar OP");
    }
  };

  const handleStart = async () => {
    if (!selectedOP) return;

    const op = selectedOP as any;
    if (op.requires_lab === 1 && op.recipe_approved !== 1) {
      alert("Esta OP está aguardando receita e não pode ser iniciada");
      return;
    }
    if (op.requires_lab === 1 && op.recipe_weighed !== 1) {
      alert("Esta OP está aguardando pesagem e não pode ser iniciada");
      return;
    }

    try {
      await request("/api/op-start", {
        method: "POST",
        body: JSON.stringify({
          op_id: selectedOP.id,
          stage: "box4",
        }),
      });

      setIsInProgress(true);
      setSelectedOP(null);
      setOpSearch("");
      setView("kanban");
      loadKanbanData();
      alert("Processo iniciado! Digite a OP novamente quando terminar.");
    } catch (error) {
      alert("Erro ao iniciar processo");
    }
  };

  const handleStop = async () => {
    if (!selectedOP) return;

    try {
      await request("/api/op-stop", {
        method: "POST",
        body: JSON.stringify({
          op_id: selectedOP.id,
          stage: "box4",
        }),
      });

      setIsInProgress(false);
      setShowForm(true);
    } catch (error) {
      alert("Erro ao parar processo");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOP || !employee) {
      alert("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    if (hasAdjustment && !adjustmentDetails) {
      alert("Por favor, descreva o ajuste realizado");
      return;
    }

    if (isReprocess && !reprocessReason) {
      alert("Por favor, descreva o motivo do reprocesso");
      return;
    }

    try {
      await request("/api/box4", {
        method: "POST",
        body: JSON.stringify({
          po_id: selectedOP.id,
          employee_id: employee,
          has_adjustment: hasAdjustment,
          adjustment_details: adjustmentDetails || null,
          is_reprocess: isReprocess,
          reprocess_reason: reprocessReason || null,
          timestamp: new Date().toISOString(),
        }),
      });

      alert("Box 4 concluído com sucesso!");
      setSelectedOP(null);
      setOpSearch("");
      setEmployee("");
      setHasAdjustment(false);
      setAdjustmentDetails("");
      setIsReprocess(false);
      setReprocessReason("");
      setShowForm(false);
      setView("kanban");
      loadKanbanData();
    } catch (error) {
      alert("Erro ao processar Box 4");
    }
  };

  const handleOPClick = async (op: ProductionOrder) => {
    setSelectedOP(op);
    setOpSearch(op.op_number);
    setView("process");
    
    // Check if OP is already in progress
    try {
      const status = await request(`/api/op-status/${op.id}/box4`);
      setIsInProgress(status.in_progress);
      setShowForm(false);
    } catch (error) {
      console.error("Error checking OP status:", error);
      setIsInProgress(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Box 4</h1>
            <p className="text-gray-600">Registrar processamento no Box 4</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setView("kanban")}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                view === "kanban"
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setView("process")}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                view === "process"
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              Processar
            </button>
            <button
              onClick={() => setView("calculator")}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                view === "calculator"
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              Calculadora
            </button>
          </div>
        </div>

        {view === "kanban" ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {/* Pronto pra Máquina */}
            <div className="flex-shrink-0 w-80">
              <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Factory className="w-5 h-5 text-green-600" />
                    Pronto pra Máquina
                  </h2>
                  <span className="bg-white text-gray-700 px-2 py-1 rounded-full text-sm font-medium">
                    {waitingOPs.filter(op => (op as any).requires_lab !== 1 || (op as any).recipe_weighed === 1).length}
                  </span>
                </div>
                <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
                  {waitingOPs.filter(op => (op as any).requires_lab !== 1 || (op as any).recipe_weighed === 1).length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">Nenhuma OP</div>
                  ) : (
                    waitingOPs.filter(op => (op as any).requires_lab !== 1 || (op as any).recipe_weighed === 1).map((op) => (
                      <button
                        key={op.id}
                        onClick={() => handleOPClick(op)}
                        className="w-full bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all text-left"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div className="font-semibold text-gray-900">OP {op.op_number}</div>
                          {(op as any).recipe_weighed === 1 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              <Scale className="w-3 h-3" />
                              Pesada
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-700">{op.client}</div>
                        <div className="text-sm text-gray-600">{op.color}</div>
                        <RegionBadges op={op as any} className="mt-1" />
                        <div className="text-xs text-gray-500 mt-2">
                          {(op as any).material} • {(op as any).quantity} {(op as any).unit}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Em Andamento */}
            <div className="flex-shrink-0 w-80">
              <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Play className="w-5 h-5 text-blue-600" />
                    Em Andamento
                  </h2>
                  <span className="bg-white text-gray-700 px-2 py-1 rounded-full text-sm font-medium">
                    {inProgressOPs.length}
                  </span>
                </div>
                <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
                  {inProgressOPs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">Nenhuma OP</div>
                  ) : (
                    inProgressOPs.map((op) => (
                      <button
                        key={op.id}
                        onClick={() => handleOPClick(op)}
                        className="w-full bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all text-left"
                      >
                        <div className="font-semibold text-gray-900 mb-1">OP {op.op_number}</div>
                        <div className="text-sm text-gray-700">{op.client}</div>
                        <div className="text-sm text-gray-600">{op.color}</div>
                        <RegionBadges op={op as any} className="mt-1" />
                        <div className="text-xs text-gray-500 mt-2">
                          {(op as any).material} • {(op as any).quantity} {(op as any).unit}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Aguardando Receita */}
            <div className="flex-shrink-0 w-80">
              <div className="rounded-lg border-2 border-yellow-200 bg-yellow-50 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    <FlaskConical className="w-5 h-5 text-yellow-600" />
                    Aguardando Receita
                  </h2>
                  <span className="bg-white text-gray-700 px-2 py-1 rounded-full text-sm font-medium">
                    {waitingOPs.filter(op => (op as any).requires_lab === 1 && !finalizedLabOPs.includes(op.id) && (op as any).recipe_approved !== 1).length}
                  </span>
                </div>
                <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
                  {waitingOPs.filter(op => (op as any).requires_lab === 1 && !finalizedLabOPs.includes(op.id) && (op as any).recipe_approved !== 1).length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">Nenhuma OP</div>
                  ) : (
                    waitingOPs.filter(op => (op as any).requires_lab === 1 && !finalizedLabOPs.includes(op.id) && (op as any).recipe_approved !== 1).map((op) => (
                      <button
                        key={op.id}
                        onClick={() => handleOPClick(op)}
                        className="w-full bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all text-left"
                      >
                        <div className="font-semibold text-gray-900 mb-1">OP {op.op_number}</div>
                        <div className="text-sm text-gray-700">{op.client}</div>
                        <div className="text-sm text-gray-600">{op.color}</div>
                        <RegionBadges op={op as any} className="mt-1" />
                        <div className="text-xs text-gray-500 mt-2">
                          {(op as any).material} • {(op as any).quantity} {(op as any).unit}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Aguardando Pesagem */}
            <div className="flex-shrink-0 w-80">
              <div className="rounded-lg border-2 border-orange-200 bg-orange-50 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Scale className="w-5 h-5 text-orange-600" />
                    Aguardando Pesagem
                  </h2>
                  <span className="bg-white text-gray-700 px-2 py-1 rounded-full text-sm font-medium">
                    {waitingOPs.filter(op => (finalizedLabOPs.includes(op.id) || (op as any).recipe_approved === 1) && (op as any).recipe_weighed !== 1).length}
                  </span>
                </div>
                <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
                  {waitingOPs.filter(op => (finalizedLabOPs.includes(op.id) || (op as any).recipe_approved === 1) && (op as any).recipe_weighed !== 1).length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">Nenhuma OP</div>
                  ) : (
                    waitingOPs.filter(op => (finalizedLabOPs.includes(op.id) || (op as any).recipe_approved === 1) && (op as any).recipe_weighed !== 1).map((op) => (
                      <button
                        key={op.id}
                        onClick={() => handleOPClick(op)}
                        className="w-full bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all text-left"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div className="font-semibold text-gray-900">OP {op.op_number}</div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <FlaskConical className="w-3 h-3" />
                            Lab
                          </span>
                        </div>
                        <div className="text-sm text-gray-700">{op.client}</div>
                        <div className="text-sm text-gray-600">{op.color}</div>
                        <RegionBadges op={op as any} className="mt-1" />
                        <div className="text-xs text-gray-500 mt-2">
                          {(op as any).material} • {(op as any).quantity} {(op as any).unit}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Concluído */}
            <div className="flex-shrink-0 w-80">
              <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-gray-600" />
                    Concluído (24h)
                  </h2>
                  <span className="bg-white text-gray-700 px-2 py-1 rounded-full text-sm font-medium">
                    {completedOPs.length}
                  </span>
                </div>
                <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
                  {completedOPs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">Nenhuma OP</div>
                  ) : (
                    completedOPs.map((op) => (
                      <div
                        key={op.id}
                        className="w-full bg-white rounded-lg p-3 shadow-sm border border-gray-200"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div className="font-semibold text-gray-900">OP {op.op_number}</div>
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="w-3 h-3" />
                            <span className="text-xs">Concluído</span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-700">{op.client}</div>
                        <div className="text-sm text-gray-600">{op.color}</div>
                        <RegionBadges op={op as any} className="mt-1" />
                        <div className="text-xs text-gray-500 mt-2">
                          {(op as any).material} • {(op as any).quantity} {(op as any).unit}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : view === "process" ? (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Search OP */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Buscar OP
              </label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={opSearch}
                    onChange={(e) => setOpSearch(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && searchOP()}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Digite o número da OP (ex: 001)"
                  />
                </div>
                <button
                  onClick={searchOP}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-all"
                >
                  Buscar
                </button>
              </div>
            </div>

            {selectedOP && !isInProgress && !showForm && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg border border-blue-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Dados da OP</h2>
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
                      <p className="text-sm text-gray-600">Previsão:</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {new Date(selectedOP.expected_date).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={handleStart}
                    className="bg-green-500 hover:bg-green-600 text-white px-12 py-4 rounded-lg font-semibold text-lg transition-all transform hover:scale-105 shadow-lg flex items-center space-x-3"
                  >
                    <Play className="w-6 h-6" />
                    <span>Iniciar Box 4</span>
                  </button>
                </div>
              </div>
            )}

            {selectedOP && isInProgress && !showForm && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg border border-blue-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Dados da OP</h2>
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
                      <p className="text-sm text-gray-600">Previsão:</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {new Date(selectedOP.expected_date).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={handleStop}
                    className="bg-red-500 hover:bg-red-600 text-white px-12 py-4 rounded-lg font-semibold text-lg transition-all transform hover:scale-105 shadow-lg flex items-center space-x-3"
                  >
                    <Square className="w-6 h-6" />
                    <span>Parar e Registrar</span>
                  </button>
                </div>
              </div>
            )}

            {selectedOP && showForm && (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* OP Info */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg border border-blue-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Dados da OP</h2>
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
                      <p className="text-sm text-gray-600">Material:</p>
                      <p className="text-lg font-semibold text-gray-900">{(selectedOP as any).material || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Quantidade:</p>
                      <p className="text-lg font-semibold text-gray-900">{(selectedOP as any).quantity || '-'} {(selectedOP as any).unit || ''}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status:</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedOP.status}</p>
                    </div>
                  </div>
                </div>

                {/* Form */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <Users className="w-5 h-5 mr-2 text-blue-600" />
                      Funcionário *
                    </label>
                    <select
                      value={employee}
                      onChange={(e) => setEmployee(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Selecione o funcionário</option>
                      {availableEmployees.map((emp) => (
                        <option key={emp.id} value={emp.name}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasAdjustment}
                        onChange={(e) => setHasAdjustment(e.target.checked)}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-semibold text-gray-700 flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2 text-orange-600" />
                        Teve ajuste
                      </span>
                    </label>
                  </div>

                  {hasAdjustment && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Detalhes do ajuste *
                      </label>
                      <textarea
                        value={adjustmentDetails}
                        onChange={(e) => setAdjustmentDetails(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        placeholder="Descreva o ajuste realizado"
                        required={hasAdjustment}
                      />
                    </div>
                  )}

                  <div>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isReprocess}
                        onChange={(e) => setIsReprocess(e.target.checked)}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-semibold text-gray-700 flex items-center">
                        <RefreshCcw className="w-5 h-5 mr-2 text-red-600" />
                        É um reprocesso
                      </span>
                    </label>
                  </div>

                  {isReprocess && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Motivo do reprocesso *
                      </label>
                      <textarea
                        value={reprocessReason}
                        onChange={(e) => setReprocessReason(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        placeholder="Descreva o motivo do reprocesso"
                        required={isReprocess}
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all transform hover:scale-105 shadow-lg"
                  >
                    Registrar Box 4
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : view === "calculator" ? (
          <DensityCalculator />
        ) : null}
      </div>
    </Layout>
  );
}
