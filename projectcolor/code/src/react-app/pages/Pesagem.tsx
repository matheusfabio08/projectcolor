import { useState, useEffect } from "react";
import Layout from "@/react-app/components/Layout";
import { useAPI } from "@/react-app/hooks/useAPI";
import { Scale, Clock, Play, CheckCircle2, Users, Search } from "lucide-react";
import { Employee } from "@/shared/types";
import { RegionBadges } from "@/react-app/components/RegionBadges";

interface PesagemOP {
  id: number;
  op_number: string;
  client: string;
  color: string;
  material: string;
  quantity: number;
  unit: string;
  status: string;
  region_jaragua: number;
  region_brusque: number;
  region_gaspar: number;
  recipe_weighed: number;
  pesagem_id?: number;
  pesagem_start_time?: string;
  pesagem_end_time?: string;
}

// Helper to get status label in Portuguese
function getStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    almoxarifado: "Almoxarifado",
    preparacao: "Preparação",
    box4: "Box 4",
    box5: "Box 5",
    box6: "Box 6",
    producao: "Produção",
    secadora: "Secadora",
    destrinchagem: "Destrinchagem",
    enrolagem: "Enrolagem",
    qualidade: "Qualidade",
    qualidade_malhas: "Qualidade Malhas",
    finalizado: "Finalizado",
  };
  return statusMap[status] || status;
}

export default function Pesagem() {
  const { request } = useAPI();
  const [view, setView] = useState<"kanban" | "process">("kanban");
  const [opSearch, setOpSearch] = useState("");
  const [selectedOP, setSelectedOP] = useState<PesagemOP | null>(null);
  const [isInProgress, setIsInProgress] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [employee, setEmployee] = useState("");
  const [notes, setNotes] = useState("");
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([]);

  // Kanban states
  const [waitingOPs, setWaitingOPs] = useState<PesagemOP[]>([]);
  const [inProgressOPs, setInProgressOPs] = useState<PesagemOP[]>([]);
  const [completedOPs, setCompletedOPs] = useState<PesagemOP[]>([]);

  useEffect(() => {
    fetchEmployees();
    loadKanbanData();
  }, []);

  const fetchEmployees = async () => {
    try {
      const data = await request("/api/employees?sector=Pesagem");
      setAvailableEmployees(data);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const loadKanbanData = async () => {
    try {
      const data = await request("/api/pesagem/records");
      setWaitingOPs(data.waiting || []);
      setInProgressOPs(data.inProgress || []);
      setCompletedOPs(data.completed || []);
    } catch (error) {
      console.error("Failed to load kanban data:", error);
    }
  };

  const searchOP = async () => {
    if (!opSearch.trim()) return;

    try {
      // Search in waiting or in-progress OPs
      const allOPs = [...waitingOPs, ...inProgressOPs];
      const op = allOPs.find(o => o.op_number === opSearch);
      
      if (op) {
        setSelectedOP(op);
        setIsInProgress(!!op.pesagem_start_time && !op.pesagem_end_time);
        setShowForm(false);
        setView("process");
      } else {
        alert("OP não encontrada ou não está aguardando pesagem");
      }
    } catch (error) {
      alert("Erro ao buscar OP");
    }
  };

  const handleStart = async () => {
    if (!selectedOP) return;

    try {
      await request("/api/pesagem/start", {
        method: "POST",
        body: JSON.stringify({
          op_id: selectedOP.id,
        }),
      });

      setIsInProgress(true);
      setSelectedOP(null);
      setOpSearch("");
      setView("kanban");
      loadKanbanData();
      alert("Pesagem iniciada! Digite a OP novamente quando terminar.");
    } catch (error) {
      alert("Erro ao iniciar pesagem");
    }
  };

  const handleStop = async () => {
    if (!selectedOP) return;
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOP || !employee) {
      alert("Por favor, selecione o funcionário");
      return;
    }

    try {
      await request("/api/pesagem/finish", {
        method: "POST",
        body: JSON.stringify({
          op_id: selectedOP.id,
          employee_id: employee,
          notes: notes || null,
        }),
      });

      alert("Pesagem finalizada com sucesso!");
      setSelectedOP(null);
      setOpSearch("");
      setEmployee("");
      setNotes("");
      setShowForm(false);
      setView("kanban");
      loadKanbanData();
    } catch (error) {
      alert("Erro ao finalizar pesagem");
    }
  };

  const handleOPClick = async (op: PesagemOP) => {
    setSelectedOP(op);
    setOpSearch(op.op_number);
    setIsInProgress(!!op.pesagem_start_time && !op.pesagem_end_time);
    setShowForm(false);
    setView("process");
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Pesagem</h1>
            <p className="text-gray-600">Pesagem de corantes e geração de fichas de receita</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setView("kanban"); loadKanbanData(); }}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                view === "kanban"
                  ? "bg-amber-500 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setView("process")}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                view === "process"
                  ? "bg-amber-500 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              Processar
            </button>
          </div>
        </div>

        {view === "kanban" ? (
          <div className="space-y-6">
            {/* Aguardando Pesagem */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  Aguardando Pesagem
                </h2>
                <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-sm font-medium">
                  {waitingOPs.length}
                </span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {waitingOPs.length === 0 ? (
                  <p className="text-gray-500 text-sm py-4">Nenhuma OP aguardando pesagem</p>
                ) : (
                  waitingOPs.map((op) => (
                    <button
                      key={op.id}
                      onClick={() => handleOPClick(op)}
                      className="flex-shrink-0 w-72 bg-orange-50 border border-orange-200 rounded-lg p-3 hover:bg-orange-100 transition-all text-left"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-900">OP {op.op_number}</span>
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                          {getStatusLabel(op.status)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700">{op.client}</div>
                      <div className="text-sm text-gray-600">{op.color}</div>
                      <RegionBadges op={op as any} className="mt-1" />
                      <div className="text-xs text-gray-500 mt-2">
                        {op.material} • {op.quantity} {op.unit}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Em Pesagem */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Play className="w-5 h-5 text-amber-600" />
                  Em Pesagem
                </h2>
                <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-sm font-medium">
                  {inProgressOPs.length}
                </span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {inProgressOPs.length === 0 ? (
                  <p className="text-gray-500 text-sm py-4">Nenhuma OP em pesagem</p>
                ) : (
                  inProgressOPs.map((op) => (
                    <button
                      key={op.id}
                      onClick={() => handleOPClick(op)}
                      className="flex-shrink-0 w-72 bg-amber-50 border border-amber-200 rounded-lg p-3 hover:bg-amber-100 transition-all text-left"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-900">OP {op.op_number}</span>
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                          {getStatusLabel(op.status)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700">{op.client}</div>
                      <div className="text-sm text-gray-600">{op.color}</div>
                      <RegionBadges op={op as any} className="mt-1" />
                      <div className="text-xs text-gray-500 mt-2">
                        {op.material} • {op.quantity} {op.unit}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Finalizado */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Pesagem Concluída
                </h2>
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-sm font-medium">
                  {completedOPs.length}
                </span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {completedOPs.length === 0 ? (
                  <p className="text-gray-500 text-sm py-4">Nenhuma OP finalizada</p>
                ) : (
                  completedOPs.map((op) => (
                    <div
                      key={op.id}
                      className="flex-shrink-0 w-72 bg-green-50 border border-green-200 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-900">OP {op.op_number}</span>
                        <span className="text-xs bg-green-200 text-green-700 px-2 py-0.5 rounded-full">
                          Receita Pesada
                        </span>
                      </div>
                      <div className="text-sm text-gray-700">{op.client}</div>
                      <div className="text-sm text-gray-600">{op.color}</div>
                      <RegionBadges op={op as any} className="mt-1" />
                      <div className="text-xs text-gray-500 mt-2">
                        {op.material} • {op.quantity} {op.unit}
                      </div>
                    </div>
                  ))
                )}
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
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Digite o número da OP (ex: 001)"
                  />
                </div>
                <button
                  onClick={searchOP}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-lg font-semibold transition-all"
                >
                  Buscar
                </button>
              </div>
            </div>

            {selectedOP && !isInProgress && !showForm && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl shadow-lg border border-amber-200 p-6">
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
                      <p className="text-sm text-gray-600">Setor Atual:</p>
                      <p className="text-lg font-semibold text-gray-900">{getStatusLabel(selectedOP.status)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Material:</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedOP.material || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Quantidade:</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedOP.quantity} {selectedOP.unit}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <RegionBadges op={selectedOP as any} />
                  </div>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={handleStart}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-12 py-4 rounded-lg font-semibold text-lg transition-all transform hover:scale-105 shadow-lg flex items-center space-x-3"
                  >
                    <Scale className="w-6 h-6" />
                    <span>Iniciar Pesagem</span>
                  </button>
                </div>
              </div>
            )}

            {selectedOP && isInProgress && !showForm && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl shadow-lg border border-amber-200 p-6">
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
                      <p className="text-sm text-gray-600">Setor Atual:</p>
                      <p className="text-lg font-semibold text-gray-900">{getStatusLabel(selectedOP.status)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={handleStop}
                    className="bg-green-500 hover:bg-green-600 text-white px-12 py-4 rounded-lg font-semibold text-lg transition-all transform hover:scale-105 shadow-lg flex items-center space-x-3"
                  >
                    <CheckCircle2 className="w-6 h-6" />
                    <span>Finalizar Pesagem</span>
                  </button>
                </div>
              </div>
            )}

            {selectedOP && showForm && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl shadow-lg border border-amber-200 p-6">
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
                      <p className="text-sm text-gray-600">Setor Atual:</p>
                      <p className="text-lg font-semibold text-gray-900">{getStatusLabel(selectedOP.status)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <Users className="w-5 h-5 mr-2 text-amber-600" />
                      Funcionário *
                    </label>
                    <select
                      value={employee}
                      onChange={(e) => setEmployee(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Observações
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      rows={3}
                      placeholder="Observações sobre a pesagem..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setSelectedOP(null);
                      setOpSearch("");
                      setView("kanban");
                    }}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all transform hover:scale-105 shadow-lg flex items-center space-x-2"
                  >
                    <CheckCircle2 className="w-6 h-6" />
                    <span>Confirmar Pesagem</span>
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
