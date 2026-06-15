import { useState, useEffect } from "react";
import Layout from "@/react-app/components/Layout";
import { useAPI } from "@/react-app/hooks/useAPI";
import { Search, CheckCircle, Package, Ruler, AlertTriangle, Play, Square, Clock, CheckCircle2 } from "lucide-react";
import { ProductionOrder } from "@/shared/types";
import { RegionBadges } from "@/react-app/components/RegionBadges";

export default function Qualidade() {
  const { request } = useAPI();
  const [view, setView] = useState<"kanban" | "process">("kanban");
  const [opSearch, setOpSearch] = useState("");
  const [selectedOP, setSelectedOP] = useState<ProductionOrder | null>(null);
  const [isInProgress, setIsInProgress] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [rollsSent, setRollsSent] = useState("");
  const [metersPerRoll, setMetersPerRoll] = useState("");
  const [discrepancy, setDiscrepancy] = useState("");

  // Kanban states
  const [waitingOPs, setWaitingOPs] = useState<ProductionOrder[]>([]);
  const [inProgressOPs, setInProgressOPs] = useState<ProductionOrder[]>([]);
  const [completedOPs, setCompletedOPs] = useState<ProductionOrder[]>([]);

  useEffect(() => {
    if (view === "kanban") {
      loadKanbanData();
    }
  }, [view]);

  const loadKanbanData = async () => {
    try {
      const waiting = await request("/api/production-orders?status=qualidade");
      
      const inProgressData: ProductionOrder[] = [];
      for (const op of waiting) {
        const status = await request(`/api/op-status/${op.id}/qualidade`);
        if (status.in_progress) {
          inProgressData.push(op);
        }
      }
      
      const waitingData = waiting.filter((op: ProductionOrder) => 
        !inProgressData.find(ip => ip.id === op.id)
      );
      
      const allOPs = await request("/api/production-orders");
      const completed = allOPs.filter((op: ProductionOrder) => {
        if (!op.is_completed) return false;
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
          o.op_number === opSearch && o.status === "qualidade"
        );
        if (op) {
          setSelectedOP(op);
          
          // Check if in progress
          const status = await request(`/api/op-status/${op.id}/qualidade`);
          setIsInProgress(status.in_progress);
          setShowForm(false);
          setView("process");
        } else {
          alert("OP não encontrada ou não está no status Qualidade");
        }
      }
    } catch (error) {
      alert("Erro ao buscar OP");
    }
  };

  const handleStart = async () => {
    if (!selectedOP) return;

    try {
      await request("/api/op-start", {
        method: "POST",
        body: JSON.stringify({
          op_id: selectedOP.id,
          stage: "qualidade",
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
          stage: "qualidade",
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

    if (!selectedOP || !rollsSent || !metersPerRoll) {
      alert("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    try {
      await request("/api/quality", {
        method: "POST",
        body: JSON.stringify({
          po_id: selectedOP.id,
          rolls_sent: parseInt(rollsSent),
          meters_per_roll: parseFloat(metersPerRoll),
          discrepancy: discrepancy || undefined,
        }),
      });

      alert("OP finalizada com sucesso!");
      setSelectedOP(null);
      setOpSearch("");
      setRollsSent("");
      setMetersPerRoll("");
      setDiscrepancy("");
      setShowForm(false);
      setView("kanban");
      loadKanbanData();
    } catch (error) {
      alert("Erro ao processar qualidade");
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Qualidade</h1>
            <p className="text-gray-600">Controle final e fechamento da OP</p>
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
                {/* OP Info */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-lg border border-green-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <CheckCircle className="w-6 h-6 mr-2 text-green-600" />
                    Dados da OP
                  </h2>
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
                    <span>Iniciar Qualidade</span>
                  </button>
                </div>
              </div>
            )}

            {selectedOP && isInProgress && !showForm && (
              <div className="space-y-6">
                {/* OP Info */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-lg border border-green-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <CheckCircle className="w-6 h-6 mr-2 text-green-600" />
                    Dados da OP
                  </h2>
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
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-lg border border-green-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <CheckCircle className="w-6 h-6 mr-2 text-green-600" />
                    Dados da OP
                  </h2>
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

                {/* Form */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 space-y-6">
                  <h2 className="text-xl font-bold text-gray-900">Controle de Qualidade Final</h2>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                        <Package className="w-5 h-5 mr-2 text-blue-600" />
                        Quantidade de Rolos Enviados *
                      </label>
                      <input
                        type="number"
                        value={rollsSent}
                        onChange={(e) => setRollsSent(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                        <Ruler className="w-5 h-5 mr-2 text-blue-600" />
                        Metros por Rolo *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={metersPerRoll}
                        onChange={(e) => setMetersPerRoll(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <AlertTriangle className="w-5 h-5 mr-2 text-yellow-600" />
                      Descrição de Divergências (opcional)
                    </label>
                    <textarea
                      value={discrepancy}
                      onChange={(e) => setDiscrepancy(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={4}
                      placeholder="Descreva qualquer divergência encontrada durante o controle de qualidade..."
                    />
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Atenção:</strong> Ao concluir, esta OP será marcada como finalizada e não poderá mais ser editada.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all transform hover:scale-105 shadow-lg flex items-center space-x-2"
                  >
                    <CheckCircle className="w-6 h-6" />
                    <span>Finalizar OP</span>
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
