import { useState, useEffect } from "react";
import Layout from "@/react-app/components/Layout";
import { useAPI } from "@/react-app/hooks/useAPI";
import { Search, ScrollText, Users, AlertCircle, Play, Square, Clock, CheckCircle2 } from "lucide-react";
import { ProductionOrder, Employee } from "@/shared/types";
import { RegionBadges } from "@/react-app/components/RegionBadges";

export default function Enrolagem() {
  const { request } = useAPI();
  const [view, setView] = useState<"kanban" | "process">("kanban");
  const [opSearch, setOpSearch] = useState("");
  const [selectedOP, setSelectedOP] = useState<ProductionOrder | null>(null);
  const [isInProgress, setIsInProgress] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [employees, setEmployees] = useState<string[]>([""]);
  const [numSplices, setNumSplices] = useState("");
  const [numRolls, setNumRolls] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([]);

  // Kanban states
  const [waitingOPs, setWaitingOPs] = useState<ProductionOrder[]>([]);
  const [inProgressOPs, setInProgressOPs] = useState<ProductionOrder[]>([]);
  const [completedOPs, setCompletedOPs] = useState<ProductionOrder[]>([]);

  useEffect(() => {
    fetchEmployees();
    if (view === "kanban") {
      loadKanbanData();
    }
  }, [view]);

  const fetchEmployees = async () => {
    try {
      const data = await request("/api/employees?sector=Enrolagem");
      setAvailableEmployees(data);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const loadKanbanData = async () => {
    try {
      const waiting = await request("/api/production-orders?status=enrolagem");
      
      const inProgressData: ProductionOrder[] = [];
      for (const op of waiting) {
        const status = await request(`/api/op-status/${op.id}/enrolagem`);
        if (status.in_progress) {
          inProgressData.push(op);
        }
      }
      
      const waitingData = waiting.filter((op: ProductionOrder) => 
        !inProgressData.find(ip => ip.id === op.id)
      );
      
      const allOPs = await request("/api/production-orders");
      const completed = allOPs.filter((op: ProductionOrder) => {
        if (op.status !== "qualidade") return false;
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
          o.op_number === opSearch && o.status === "enrolagem"
        );
        if (op) {
          setSelectedOP(op);
          
          const status = await request(`/api/op-status/${op.id}/enrolagem`);
          setIsInProgress(status.in_progress);
          setStartedAt(status.started_at);
          setShowForm(false);
          setView("process");
        } else {
          alert("OP não encontrada ou não está no status Enrolagem");
        }
      }
    } catch (error) {
      alert("Erro ao buscar OP");
    }
  };

  const handleStart = async () => {
    if (!selectedOP) return;

    try {
      const result = await request("/api/op-start", {
        method: "POST",
        body: JSON.stringify({
          op_id: selectedOP.id,
          stage: "enrolagem",
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
          stage: "enrolagem",
        }),
      });

      setIsInProgress(false);
      setStartedAt(result.started_at);
      setShowForm(true);
    } catch (error) {
      alert("Erro ao parar processo");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOP || !startedAt || !numSplices || !numRolls || employees.some(e => !e)) {
      alert("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    try {
      await request("/api/rolling", {
        method: "POST",
        body: JSON.stringify({
          po_id: selectedOP.id,
          employee_ids: employees,
          num_splices: parseInt(numSplices),
          num_rolls: parseInt(numRolls),
          issue_description: issueDescription || undefined,
          start_time: startedAt,
          end_time: new Date().toISOString(),
        }),
      });

      alert("Enrolagem concluída com sucesso!");
      setSelectedOP(null);
      setOpSearch("");
      setEmployees([""]);
      setNumSplices("");
      setNumRolls("");
      setIssueDescription("");
      setShowForm(false);
      setStartedAt(null);
      setView("kanban");
      loadKanbanData();
    } catch (error) {
      alert("Erro ao processar enrolagem");
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Enrolagem</h1>
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
          <div className="space-y-6">
            {/* Aguardando */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  Aguardando
                </h2>
                <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-sm font-medium">
                  {waitingOPs.length}
                </span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {waitingOPs.map((op) => (
                  <button
                    key={op.id}
                    onClick={() => handleOPClick(op)}
                    className="flex-shrink-0 w-64 bg-orange-50 border border-orange-200 rounded-lg p-3 hover:bg-orange-100 transition-all text-left"
                  >
                    <div className="font-semibold text-gray-900 mb-1">OP {op.op_number}</div>
                    <div className="text-sm text-gray-700">{op.client}</div>
                    <div className="text-sm text-gray-600">{op.color}</div>
                    <RegionBadges op={op as any} className="mt-1" />
                    <div className="text-xs text-gray-500 mt-2">
                      {(op as any).material} • {(op as any).quantity} {(op as any).unit}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Em Andamento */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Play className="w-5 h-5 text-blue-600" />
                  Em Andamento
                </h2>
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-sm font-medium">
                  {inProgressOPs.length}
                </span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {inProgressOPs.map((op) => (
                  <button
                    key={op.id}
                    onClick={() => handleOPClick(op)}
                    className="flex-shrink-0 w-64 bg-blue-50 border border-blue-200 rounded-lg p-3 hover:bg-blue-100 transition-all text-left"
                  >
                    <div className="font-semibold text-gray-900 mb-1">OP {op.op_number}</div>
                    <div className="text-sm text-gray-700">{op.client}</div>
                    <div className="text-sm text-gray-600">{op.color}</div>
                    <RegionBadges op={op as any} className="mt-1" />
                    <div className="text-xs text-gray-500 mt-2">
                      {(op as any).material} • {(op as any).quantity} {(op as any).unit}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Concluído */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Concluído (24h)
                </h2>
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-sm font-medium">
                  {completedOPs.length}
                </span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {completedOPs.map((op) => (
                  <div
                    key={op.id}
                    className="flex-shrink-0 w-64 bg-green-50 border border-green-200 rounded-lg p-3"
                  >
                    <div className="font-semibold text-gray-900 mb-1">OP {op.op_number}</div>
                    <div className="text-sm text-gray-700">{op.client}</div>
                    <div className="text-sm text-gray-600">{op.color}</div>
                    <RegionBadges op={op as any} className="mt-1" />
                    <div className="text-xs text-gray-500 mt-2">
                      {(op as any).material} • {(op as any).quantity} {(op as any).unit}
                    </div>
                  </div>
                ))}
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
                <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-2xl shadow-lg border border-cyan-200 p-6">
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
                    <span>Iniciar Enrolagem</span>
                  </button>
                </div>
              </div>
            )}

            {selectedOP && isInProgress && !showForm && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-2xl shadow-lg border border-cyan-200 p-6">
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
                <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-2xl shadow-lg border border-cyan-200 p-6">
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
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <Users className="w-5 h-5 mr-2 text-blue-600" />
                      Funcionários *
                    </label>
                    {employees.map((emp, idx) => (
                      <div key={idx} className="mb-2">
                        <select
                          value={emp}
                          onChange={(e) => {
                            const newEmp = [...employees];
                            newEmp[idx] = e.target.value;
                            setEmployees(newEmp);
                          }}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        >
                          <option value="">Selecione o funcionário {idx + 1}</option>
                          {availableEmployees.map((employee) => (
                            <option key={employee.id} value={employee.name}>
                              {employee.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setEmployees([...employees, ""])}
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                    >
                      + Adicionar funcionário
                    </button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                        <ScrollText className="w-5 h-5 mr-2 text-blue-600" />
                        Número de Emendas *
                      </label>
                      <input
                        type="number"
                        value={numSplices}
                        onChange={(e) => setNumSplices(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Número de Rolos Finais *
                      </label>
                      <input
                        type="number"
                        value={numRolls}
                        onChange={(e) => setNumRolls(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <AlertCircle className="w-5 h-5 mr-2 text-blue-600" />
                      Descrição de Problemas (opcional)
                    </label>
                    <textarea
                      value={issueDescription}
                      onChange={(e) => setIssueDescription(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      placeholder="Descreva qualquer problema encontrado durante a enrolagem..."
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all transform hover:scale-105 shadow-lg"
                  >
                    Concluir Enrolagem
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
