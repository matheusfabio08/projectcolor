import { useState, useEffect } from "react";
import Layout from "@/react-app/components/Layout";
import { useAPI } from "@/react-app/hooks/useAPI";
import { Search, Factory, User, Play, Square, CheckCircle2, FlaskConical, Scale } from "lucide-react";
import { ProductionOrder, Employee } from "@/shared/types";
import { RegionBadges } from "@/react-app/components/RegionBadges";
import { DensityCalculator } from "@/react-app/components/DensityCalculator";

const MACHINES_BY_BOX: Record<string, string[]> = {
  "Box 1": ["Máq 60kg", "Máq 40kg"],
  "Box 2": ["Máq 25kg", "Máq 20kg"],
  "Box 3": ["Máq 70kg"],
  "Box 4": ["Tubo 12kg", "Tubo 6kg (1)", "Tubo 6kg (2)"],
  "Box 6": ["Barça Grande", "Barça Média", "Barça Pequena 1", "Barça Pequena 2", "Barça Micro 1", "Barça Micro 2", "Barça Micro 3"],
};

export default function Producao() {
  const { request } = useAPI();
  const [view, setView] = useState<"kanban" | "process" | "calculator">("kanban");
  const [opSearch, setOpSearch] = useState("");
  const [selectedOP, setSelectedOP] = useState<ProductionOrder | null>(null);
  const [isInProgress, setIsInProgress] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showStartForm, setShowStartForm] = useState(false);
  const [box, setBox] = useState("");
  const [machine, setMachine] = useState("");
  const [operator, setOperator] = useState("");
  const [hasAdjustment, setHasAdjustment] = useState(false);
  const [metersProduced, setMetersProduced] = useState("");
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
      const data = await request("/api/employees?sector=Produção");
      setAvailableEmployees(data);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const loadKanbanData = async () => {
    try {
      const waiting = await request("/api/production-orders?status=producao");
      
      // Fetch finalized lab OPs
      const labRecords = await request("/api/laboratory/records");
      const labOPIds = labRecords.map((r: any) => r.id);
      setFinalizedLabOPs(labOPIds);
      
      const inProgressData: ProductionOrder[] = [];
      for (const op of waiting) {
        const status = await request(`/api/op-status/${op.id}/producao`);
        if (status.in_progress) {
          inProgressData.push(op);
        }
      }
      
      const waitingData = waiting.filter((op: ProductionOrder) => 
        !inProgressData.find(ip => ip.id === op.id)
      );
      
      const allOPs = await request("/api/production-orders");
      const completed = allOPs.filter((op: ProductionOrder) => {
        if (op.status !== "secadora") return false;
        const updatedAt = new Date(op.updated_at);
        const now = new Date();
        const hoursDiff = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);
        return hoursDiff <= 24;
      });
      
      setWaitingOPs(waitingData);
      setInProgressOPs(inProgressData);
      setCompletedOPs(completed);
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
          o.op_number === opSearch && o.status === "producao"
        );
        if (op) {
          setSelectedOP(op);
          
          const status = await request(`/api/op-status/${op.id}/producao`);
          setIsInProgress(status.in_progress);
          setStartedAt(status.started_at);
          
          if (status.in_progress) {
            // Se já está em andamento, preencher box e machine
            setBox(status.box_number || "");
            setMachine(status.machine || "");
          }
          
          setShowForm(false);
          setShowStartForm(false);
          setView("process");
        } else {
          alert("OP não encontrada ou não está no status Produção");
        }
      }
    } catch (error) {
      alert("Erro ao buscar OP");
    }
  };

  const handleStartClick = () => {
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
    
    setShowStartForm(true);
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedOP || !box || !machine) {
      alert("Por favor, selecione o box e a máquina");
      return;
    }

    try {
      const result = await request("/api/op-start", {
        method: "POST",
        body: JSON.stringify({
          op_id: selectedOP.id,
          stage: "producao",
          box_number: box,
          machine: machine,
        }),
      });

      setIsInProgress(true);
      setStartedAt(result.started_at);
      setSelectedOP(null);
      setOpSearch("");
      setBox("");
      setMachine("");
      setShowStartForm(false);
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
      const result = await request("/api/op-stop", {
        method: "POST",
        body: JSON.stringify({
          op_id: selectedOP.id,
          stage: "producao",
        }),
      });

      setIsInProgress(false);
      setStartedAt(result.started_at);
      
      // Preserve box and machine from the stopped process
      if (result.box_number) setBox(result.box_number);
      if (result.machine) setMachine(result.machine);
      
      // Auto-populate meterage from OP quantity
      if ((selectedOP as any).quantity) {
        setMetersProduced((selectedOP as any).quantity.toString());
      }
      
      setShowForm(true);
    } catch (error) {
      alert("Erro ao parar processo");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOP || !startedAt || !box || !machine || !operator || !metersProduced) {
      alert("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    try {
      await request("/api/production", {
        method: "POST",
        body: JSON.stringify({
          po_id: selectedOP.id,
          box_number: box,
          machine,
          operator,
          has_adjustment: hasAdjustment,
          meters_produced: parseFloat(metersProduced),
          start_date: startedAt,
          end_date: new Date().toISOString(),
        }),
      });

      alert("Produção concluída com sucesso!");
      setSelectedOP(null);
      setOpSearch("");
      setBox("");
      setMachine("");
      setOperator("");
      setHasAdjustment(false);
      setMetersProduced("");
      setShowForm(false);
      setStartedAt(null);
      setView("kanban");
      loadKanbanData();
    } catch (error) {
      alert("Erro ao processar produção");
    }
  };

  const handleOPClick = async (op: ProductionOrder) => {
    setSelectedOP(op);
    setOpSearch(op.op_number);
    
    // Fetch status to get box, machine, and in_progress info
    try {
      const status = await request(`/api/op-status/${op.id}/producao`);
      setIsInProgress(status.in_progress);
      setStartedAt(status.started_at);
      
      if (status.in_progress) {
        setBox(status.box_number || "");
        setMachine(status.machine || "");
      }
    } catch (error) {
      console.error("Error fetching OP status:", error);
    }
    
    setShowForm(false);
    setShowStartForm(false);
    setView("process");
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Produção</h1>
            <p className="text-gray-600">Processar ordem nas caixas de produção</p>
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
            {/* Pronto pra Entrar em Máquina */}
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

            {selectedOP && !isInProgress && !showForm && !showStartForm && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl shadow-lg border border-yellow-200 p-6">
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
                    onClick={handleStartClick}
                    className="bg-green-500 hover:bg-green-600 text-white px-12 py-4 rounded-lg font-semibold text-lg transition-all transform hover:scale-105 shadow-lg flex items-center space-x-3"
                  >
                    <Play className="w-6 h-6" />
                    <span>Iniciar Produção</span>
                  </button>
                </div>
              </div>
            )}

            {selectedOP && !isInProgress && !showForm && showStartForm && (
              <form onSubmit={handleStart} className="space-y-6">
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl shadow-lg border border-yellow-200 p-6">
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

                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                        <Factory className="w-5 h-5 mr-2 text-blue-600" />
                        Box *
                      </label>
                      <select
                        value={box}
                        onChange={(e) => {
                          setBox(e.target.value);
                          setMachine("");
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Selecione o box</option>
                        {Object.keys(MACHINES_BY_BOX).map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Máquina *
                      </label>
                      <select
                        value={machine}
                        onChange={(e) => setMachine(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={!box}
                        required
                      >
                        <option value="">Selecione a máquina</option>
                        {box && MACHINES_BY_BOX[box].map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => setShowStartForm(false)}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all shadow-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-green-500 hover:bg-green-600 text-white px-12 py-4 rounded-lg font-semibold text-lg transition-all transform hover:scale-105 shadow-lg flex items-center space-x-3"
                  >
                    <Play className="w-6 h-6" />
                    <span>Confirmar e Iniciar</span>
                  </button>
                </div>
              </form>
            )}

            {selectedOP && isInProgress && !showForm && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl shadow-lg border border-yellow-200 p-6">
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

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg border border-blue-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Em Produção</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Box:</p>
                      <p className="text-lg font-semibold text-blue-700">{box}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Máquina:</p>
                      <p className="text-lg font-semibold text-blue-700">{machine}</p>
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
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl shadow-lg border border-yellow-200 p-6">
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

                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 space-y-6">
                  <div className="bg-blue-50 rounded-lg p-4 mb-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Dados da Produção</h3>
                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Box: </span>
                        <span className="font-semibold text-blue-700">{box}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Máquina: </span>
                        <span className="font-semibold text-blue-700">{machine}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                        <User className="w-5 h-5 mr-2 text-blue-600" />
                        Operador *
                      </label>
                      <select
                        value={operator}
                        onChange={(e) => setOperator(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Selecione o operador</option>
                        {availableEmployees.map((employee) => (
                          <option key={employee.id} value={employee.name}>
                            {employee.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Metragem Produzida *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={metersProduced}
                        onChange={(e) => setMetersProduced(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                        placeholder="0.00"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Preenchido automaticamente. Edite se necessário.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasAdjustment}
                        onChange={(e) => setHasAdjustment(e.target.checked)}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-semibold text-gray-700">
                        Houve ajuste durante a produção
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all transform hover:scale-105 shadow-lg"
                  >
                    Concluir Produção
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
