import { useState, useEffect } from "react";
import Layout from "@/react-app/components/Layout";
import { useAPI } from "@/react-app/hooks/useAPI";
import { Search, Users, Weight, Box, Play, Square, Clock, CheckCircle2, FlaskConical } from "lucide-react";
import { ProductionOrder, Employee } from "@/shared/types";
import { RegionBadges } from "@/react-app/components/RegionBadges";

export default function Preparacao() {
  const { request } = useAPI();
  const [view, setView] = useState<"kanban" | "process">("kanban");
  const [opSearch, setOpSearch] = useState("");
  const [selectedOP, setSelectedOP] = useState<ProductionOrder | null>(null);
  const [isInProgress, setIsInProgress] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [numEmployees, setNumEmployees] = useState(1);
  const [employeeMeters, setEmployeeMeters] = useState<{ employee_id: string; meters: number }[]>([]);
  const [splices, setSplices] = useState<string[]>([]);
  const [weight, setWeight] = useState("");
  const [destinationBox, setDestinationBox] = useState("");
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([]);
  
  // Lot splitting states
  const [showLotDialog, setShowLotDialog] = useState(false);
  const [willHaveLots, setWillHaveLots] = useState<boolean | null>(null);
  const [numLots, setNumLots] = useState(2);
  const [lotMeters, setLotMeters] = useState<number[]>([]);
  
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
      const data = await request("/api/employees?sector=Preparação");
      setAvailableEmployees(data);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const loadKanbanData = async () => {
    try {
      const waiting = await request("/api/production-orders?status=preparacao");
      
      // Fetch lab records to identify finalized OPs
      const labRecords = await request("/api/laboratory/records");
      const finalizedIds = labRecords
        .filter((r: any) => r.lab_record_id !== null)
        .map((r: any) => r.id);
      setFinalizedLabOPs(finalizedIds);
      
      const inProgressData: ProductionOrder[] = [];
      for (const op of waiting) {
        const status = await request(`/api/op-status/${op.id}/preparacao`);
        if (status.in_progress) {
          inProgressData.push(op);
        }
      }
      
      const waitingData = waiting.filter((op: ProductionOrder) => 
        !inProgressData.find(ip => ip.id === op.id)
      );
      
      const allOPs = await request("/api/production-orders");
      const completed = allOPs.filter((op: ProductionOrder) => {
        if (op.status !== "producao" && op.status !== "box5") return false;
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
          o.op_number === opSearch && o.status === "preparacao"
        );
        if (op) {
          setSelectedOP(op);
          
          const status = await request(`/api/op-status/${op.id}/preparacao`);
          setIsInProgress(status.in_progress);
          setStartedAt(status.started_at);
          setShowForm(false);
          setEmployeeMeters([]);
          setView("process");
        } else {
          alert("OP não encontrada ou não está no status Preparação");
        }
      }
    } catch (error) {
      alert("Erro ao buscar OP");
    }
  };

  const openLotDialog = () => {
    if (!selectedOP) return;
    
    // Se a OP já é um lote (tem lot_number), não permite dividir novamente
    if ((selectedOP as any).lot_number) {
      handleStartNormal();
      return;
    }
    
    setShowLotDialog(true);
    setWillHaveLots(null);
    setNumLots(2);
    setLotMeters([]);
  };

  const handleLotDialogConfirm = async () => {
    if (!selectedOP) return;
    
    if (willHaveLots === null) {
      alert("Por favor, indique se o material terá lotes");
      return;
    }
    
    if (willHaveLots) {
      if (numLots < 2) {
        alert("O número de lotes deve ser pelo menos 2");
        return;
      }
      
      const totalMeters = lotMeters.reduce((sum, m) => sum + m, 0);
      const opQuantity = (selectedOP as any).quantity || 0;
      
      if (lotMeters.length !== numLots || lotMeters.some(m => !m || m <= 0)) {
        alert("Por favor, preencha os metros para todos os lotes");
        return;
      }
      
      if (Math.abs(totalMeters - opQuantity) > 0.01) {
        alert(`A soma dos lotes (${totalMeters.toFixed(2)}) deve ser igual ao total da OP (${opQuantity})`);
        return;
      }
      
      // Create lot OPs
      try {
        await request("/api/preparation/create-lots", {
          method: "POST",
          body: JSON.stringify({
            parent_op_id: selectedOP.id,
            num_lots: numLots,
            lot_meters: lotMeters,
          }),
        });
        
        alert(`OP dividida em ${numLots} lotes com sucesso!`);
        setShowLotDialog(false);
        setSelectedOP(null);
        setOpSearch("");
        setView("kanban");
        loadKanbanData();
      } catch (error) {
        alert("Erro ao criar lotes");
      }
    } else {
      // No lots, proceed normally
      setShowLotDialog(false);
      handleStartNormal();
    }
  };

  const handleStartNormal = async () => {
    if (!selectedOP) return;

    try {
      const result = await request("/api/op-start", {
        method: "POST",
        body: JSON.stringify({
          op_id: selectedOP.id,
          stage: "preparacao",
        }),
      });

      setIsInProgress(true);
      setStartedAt(result.started_at);
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
      const result = await request("/api/op-stop", {
        method: "POST",
        body: JSON.stringify({
          op_id: selectedOP.id,
          stage: "preparacao",
        }),
      });

      setIsInProgress(false);
      setStartedAt(result.started_at);
      setShowForm(true);
      // Initialize with 1 employee by default
      setEmployeeMeters([{
        employee_id: "",
        meters: 0,
      }]);
    } catch (error) {
      alert("Erro ao parar processo");
    }
  };

  const handleEmployeeChange = (value: number) => {
    setNumEmployees(value);
    setEmployeeMeters(Array(value).fill(null).map(() => ({
      employee_id: "",
      meters: 0,
    })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOP || !startedAt || !weight || !destinationBox) {
      alert("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    // Check if all employees are selected
    const hasEmptyEmployee = employeeMeters.some(emp => !emp.employee_id);
    if (hasEmptyEmployee) {
      alert("Por favor, selecione todos os funcionários");
      return;
    }

    try {
      await request("/api/preparation", {
        method: "POST",
        body: JSON.stringify({
          po_id: selectedOP.id,
          employee_meters: employeeMeters,
          splices,
          total_weight: parseFloat(weight),
          destination_box: destinationBox,
          start_time: startedAt,
          end_time: new Date().toISOString(),
        }),
      });

      alert("Preparação concluída com sucesso!");
      setSelectedOP(null);
      setOpSearch("");
      setNumEmployees(1);
      setEmployeeMeters([]);
      setSplices([]);
      setWeight("");
      setDestinationBox("");
      setShowForm(false);
      setStartedAt(null);
      setView("kanban");
      loadKanbanData();
    } catch (error) {
      alert("Erro ao processar preparação");
    }
  };

  const handleOPClick = (op: ProductionOrder) => {
    setSelectedOP(op);
    setOpSearch(op.op_number);
    setView("process");
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Preparação</h1>
            <p className="text-gray-600">Processar ordem de produção</p>
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
          </div>
        </div>

        {view === "kanban" ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {/* Aguardando (sem receita aprovada) */}
            <div className="flex-shrink-0 w-80">
              <div className="rounded-lg border-2 border-orange-200 bg-orange-50 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-600" />
                    Aguardando
                  </h2>
                  <span className="bg-white text-gray-700 px-2 py-1 rounded-full text-sm font-medium">
                    {waitingOPs.filter(op => !finalizedLabOPs.includes(op.id) && (op as any).recipe_approved !== 1).length}
                  </span>
                </div>
                <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
                  {waitingOPs.filter(op => !finalizedLabOPs.includes(op.id) && (op as any).recipe_approved !== 1).length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">Nenhuma OP</div>
                  ) : (
                    waitingOPs.filter(op => !finalizedLabOPs.includes(op.id) && (op as any).recipe_approved !== 1).map((op) => (
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
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                          <Clock className="w-3 h-3" />
                          {new Date((op as any).expected_date).toLocaleDateString('pt-BR')}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Receita Aprovada */}
            <div className="flex-shrink-0 w-80">
              <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    <FlaskConical className="w-5 h-5 text-green-600" />
                    Receita Aprovada
                  </h2>
                  <span className="bg-white text-gray-700 px-2 py-1 rounded-full text-sm font-medium">
                    {waitingOPs.filter(op => finalizedLabOPs.includes(op.id) || (op as any).recipe_approved === 1).length}
                  </span>
                </div>
                <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
                  {waitingOPs.filter(op => finalizedLabOPs.includes(op.id) || (op as any).recipe_approved === 1).length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">Nenhuma OP</div>
                  ) : (
                    waitingOPs.filter(op => finalizedLabOPs.includes(op.id) || (op as any).recipe_approved === 1).map((op) => (
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
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                          <Clock className="w-3 h-3" />
                          {new Date((op as any).expected_date).toLocaleDateString('pt-BR')}
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
                        <div className="flex items-start justify-between mb-1">
                          <div className="font-semibold text-gray-900">OP {op.op_number}</div>
                          {(finalizedLabOPs.includes(op.id) || (op as any).recipe_approved === 1) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              <FlaskConical className="w-3 h-3" />
                              Lab
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-700">{op.client}</div>
                        <div className="text-sm text-gray-600">{op.color}</div>
                        <RegionBadges op={op as any} className="mt-1" />
                        <div className="text-xs text-gray-500 mt-2">
                          {(op as any).material} • {(op as any).quantity} {(op as any).unit}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                          <Clock className="w-3 h-3" />
                          {new Date((op as any).expected_date).toLocaleDateString('pt-BR')}
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
        ) : (
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
                      <p className="text-lg font-semibold text-gray-900">
                        {selectedOP.op_number}
                      </p>
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
                    onClick={openLotDialog}
                    className="bg-green-500 hover:bg-green-600 text-white px-12 py-4 rounded-lg font-semibold text-lg transition-all transform hover:scale-105 shadow-lg flex items-center space-x-3"
                  >
                    <Play className="w-6 h-6" />
                    <span>Iniciar Preparação</span>
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
                      <p className="text-sm text-gray-600">Material:</p>
                      <p className="text-lg font-semibold text-gray-900">{(selectedOP as any).material || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Quantidade:</p>
                      <p className="text-lg font-semibold text-gray-900">{(selectedOP as any).quantity || '-'} {(selectedOP as any).unit || ''}</p>
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
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg border border-blue-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Dados da OP</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">OP:</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedOP.op_number}</p>
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
                        <Users className="w-5 h-5 mr-2 text-blue-600" />
                        Número de Funcionários *
                      </label>
                      <select
                        value={numEmployees}
                        onChange={(e) => handleEmployeeChange(parseInt(e.target.value))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                          <option key={n} value={n}>{n} funcionário{n > 1 ? "s" : ""}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                        <Weight className="w-5 h-5 mr-2 text-blue-600" />
                        Peso Total (kg) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-gray-700 mb-3">
                      Metros por Funcionário
                    </p>
                    <div className="grid md:grid-cols-2 gap-3">
                      {employeeMeters.map((emp, idx) => (
                        <div key={idx} className="space-y-2">
                          <label className="text-xs font-semibold text-gray-600">
                            Funcionário {idx + 1}
                          </label>
                          <select
                            value={emp.employee_id}
                            onChange={(e) => {
                              const newMeters = [...employeeMeters];
                              newMeters[idx].employee_id = e.target.value;
                              setEmployeeMeters(newMeters);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-1"
                            required
                          >
                            <option value="">Selecione o funcionário</option>
                            {availableEmployees.map((employee) => (
                              <option key={employee.id} value={employee.name}>
                                {employee.name}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            step="0.01"
                            value={emp.meters}
                            onChange={(e) => {
                              const newMeters = [...employeeMeters];
                              newMeters[idx].meters = parseFloat(e.target.value) || 0;
                              setEmployeeMeters(newMeters);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            placeholder="Metros"
                            required
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Emendas Encontradas
                    </label>
                    <textarea
                      value={splices.join("\n")}
                      onChange={(e) => setSplices(e.target.value.split("\n"))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      placeholder="Digite as emendas encontradas (uma por linha)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <Box className="w-5 h-5 mr-2 text-blue-600" />
                      Destino - Box *
                    </label>
                    <select
                      value={destinationBox}
                      onChange={(e) => setDestinationBox(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Selecione o box</option>
                      <option value="Box 1">Box 1</option>
                      <option value="Box 2">Box 2</option>
                      <option value="Box 3">Box 3</option>
                      <option value="Box 4">Box 4</option>
                      <option value="Box 5">Box 5</option>
                      <option value="Box 6">Box 6</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all transform hover:scale-105 shadow-lg"
                  >
                    Concluir Preparação
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Lot Dialog */}
        {showLotDialog && selectedOP && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Configuração de Lotes</h2>
              
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <p className="text-sm font-medium text-gray-900 mb-2">OP {selectedOP.op_number}</p>
                <p className="text-sm text-gray-700">{selectedOP.client} - {selectedOP.color}</p>
                <p className="text-sm text-gray-700">
                  Total: {(selectedOP as any).quantity} {(selectedOP as any).unit}
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Este material terá lotes?
                  </label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setWillHaveLots(false);
                        setLotMeters([]);
                      }}
                      className={`flex-1 px-6 py-4 rounded-lg font-semibold transition-all ${
                        willHaveLots === false
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Não
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setWillHaveLots(true);
                        const quantity = (selectedOP as any).quantity || 0;
                        const perLot = quantity / numLots;
                        setLotMeters(Array(numLots).fill(perLot));
                      }}
                      className={`flex-1 px-6 py-4 rounded-lg font-semibold transition-all ${
                        willHaveLots === true
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Sim
                    </button>
                  </div>
                </div>

                {willHaveLots && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Quantos lotes?
                      </label>
                      <input
                        type="number"
                        min="2"
                        value={numLots}
                        onChange={(e) => {
                          const newNum = parseInt(e.target.value) || 2;
                          setNumLots(newNum);
                          const quantity = (selectedOP as any).quantity || 0;
                          const perLot = quantity / newNum;
                          setLotMeters(Array(newNum).fill(perLot));
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Metros por lote
                      </label>
                      <div className="space-y-3">
                        {Array.from({ length: numLots }).map((_, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-700 w-20">
                              Lote {idx + 1}:
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              value={lotMeters[idx] || ""}
                              onChange={(e) => {
                                const newMeters = [...lotMeters];
                                newMeters[idx] = parseFloat(e.target.value) || 0;
                                setLotMeters(newMeters);
                              }}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              placeholder="0.00"
                            />
                            <span className="text-sm text-gray-600 w-16">
                              {(selectedOP as any).unit}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-gray-700">Total:</span>
                          <span className="text-lg font-bold text-blue-600">
                            {lotMeters.reduce((sum, m) => sum + m, 0).toFixed(2)} {(selectedOP as any).unit}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-gray-600 mt-1">
                          <span>OP Total:</span>
                          <span>{(selectedOP as any).quantity} {(selectedOP as any).unit}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => {
                    setShowLotDialog(false);
                    setWillHaveLots(null);
                    setLotMeters([]);
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleLotDialogConfirm}
                  className="flex-1 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-all"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
