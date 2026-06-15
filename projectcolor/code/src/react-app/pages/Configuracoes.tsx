import { useState, useEffect } from "react";
import Layout from "@/react-app/components/Layout";
import { useAPI } from "@/react-app/hooks/useAPI";
import { Settings, Truck, MapPin, Plus, Edit2, Save, X, Trash2, Layers } from "lucide-react";

interface Transportadora {
  id: number;
  name: string;
  is_active: boolean;
}

interface RegiaoEntrega {
  id: number;
  name: string;
  is_active: boolean;
}

interface Fibra {
  id: number;
  name: string;
  is_active: boolean;
}

type Tab = "transportadoras" | "regioes" | "fibras";

export default function Configuracoes() {
  const [activeTab, setActiveTab] = useState<Tab>("transportadoras");
  
  // Transportadoras
  const { data: transportadoras, request: requestTransportadoras } = useAPI<Transportadora[]>();
  const [editingTransportadora, setEditingTransportadora] = useState<number | null>(null);
  const [editTransportadoraName, setEditTransportadoraName] = useState("");
  const [editTransportadoraActive, setEditTransportadoraActive] = useState(true);
  const [showCreateTransportadora, setShowCreateTransportadora] = useState(false);
  const [newTransportadoraName, setNewTransportadoraName] = useState("");

  // Regiões
  const { data: regioes, request: requestRegioes } = useAPI<RegiaoEntrega[]>();
  const [editingRegiao, setEditingRegiao] = useState<number | null>(null);
  const [editRegiaoName, setEditRegiaoName] = useState("");
  const [editRegiaoActive, setEditRegiaoActive] = useState(true);
  const [showCreateRegiao, setShowCreateRegiao] = useState(false);
  const [newRegiaoName, setNewRegiaoName] = useState("");

  // Fibras
  const { data: fibras, request: requestFibras } = useAPI<Fibra[]>();
  const [editingFibra, setEditingFibra] = useState<number | null>(null);
  const [editFibraName, setEditFibraName] = useState("");
  const [editFibraActive, setEditFibraActive] = useState(true);
  const [showCreateFibra, setShowCreateFibra] = useState(false);
  const [newFibraName, setNewFibraName] = useState("");

  useEffect(() => {
    fetchTransportadoras();
    fetchRegioes();
    fetchFibras();
  }, []);

  const fetchTransportadoras = async () => {
    try {
      await requestTransportadoras("/api/transportadoras");
    } catch (error) {
      console.error("Error fetching transportadoras:", error);
    }
  };

  const fetchRegioes = async () => {
    try {
      await requestRegioes("/api/regioes");
    } catch (error) {
      console.error("Error fetching regioes:", error);
    }
  };

  // Transportadora handlers
  const handleCreateTransportadora = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTransportadoraName.trim()) {
      alert("Por favor, informe o nome da transportadora");
      return;
    }
    try {
      await requestTransportadoras("/api/transportadoras", {
        method: "POST",
        body: JSON.stringify({ name: newTransportadoraName.trim().toUpperCase() }),
      });
      setShowCreateTransportadora(false);
      setNewTransportadoraName("");
      fetchTransportadoras();
    } catch (error) {
      alert("Erro ao criar transportadora");
    }
  };

  const handleEditTransportadora = (t: Transportadora) => {
    setEditingTransportadora(t.id);
    setEditTransportadoraName(t.name);
    setEditTransportadoraActive(!!t.is_active);
  };

  const handleSaveTransportadora = async (id: number) => {
    try {
      await requestTransportadoras(`/api/transportadoras/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editTransportadoraName.trim().toUpperCase(),
          is_active: editTransportadoraActive,
        }),
      });
      setEditingTransportadora(null);
      fetchTransportadoras();
    } catch (error) {
      alert("Erro ao atualizar transportadora");
    }
  };

  const handleDeleteTransportadora = async (id: number, name: string) => {
    if (confirm(`Tem certeza que deseja excluir "${name}"?`)) {
      try {
        await requestTransportadoras(`/api/transportadoras/${id}`, { method: "DELETE" });
        fetchTransportadoras();
      } catch (error) {
        alert("Erro ao excluir transportadora");
      }
    }
  };

  // Região handlers
  const handleCreateRegiao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRegiaoName.trim()) {
      alert("Por favor, informe o nome da região");
      return;
    }
    try {
      await requestRegioes("/api/regioes", {
        method: "POST",
        body: JSON.stringify({ name: newRegiaoName.trim().toUpperCase() }),
      });
      setShowCreateRegiao(false);
      setNewRegiaoName("");
      fetchRegioes();
    } catch (error) {
      alert("Erro ao criar região");
    }
  };

  const handleEditRegiao = (r: RegiaoEntrega) => {
    setEditingRegiao(r.id);
    setEditRegiaoName(r.name);
    setEditRegiaoActive(!!r.is_active);
  };

  const handleSaveRegiao = async (id: number) => {
    try {
      await requestRegioes(`/api/regioes/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editRegiaoName.trim().toUpperCase(),
          is_active: editRegiaoActive,
        }),
      });
      setEditingRegiao(null);
      fetchRegioes();
    } catch (error) {
      alert("Erro ao atualizar região");
    }
  };

  const handleDeleteRegiao = async (id: number, name: string) => {
    if (confirm(`Tem certeza que deseja excluir "${name}"?`)) {
      try {
        await requestRegioes(`/api/regioes/${id}`, { method: "DELETE" });
        fetchRegioes();
      } catch (error) {
        alert("Erro ao excluir região");
      }
    }
  };

  // Fibra handlers
  const fetchFibras = async () => {
    try {
      await requestFibras("/api/fibras");
    } catch (error) {
      console.error("Error fetching fibras:", error);
    }
  };

  const handleCreateFibra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFibraName.trim()) {
      alert("Por favor, informe o nome da fibra");
      return;
    }
    try {
      await requestFibras("/api/fibras", {
        method: "POST",
        body: JSON.stringify({ name: newFibraName.trim().toUpperCase() }),
      });
      setShowCreateFibra(false);
      setNewFibraName("");
      fetchFibras();
    } catch (error) {
      alert("Erro ao criar fibra");
    }
  };

  const handleEditFibra = (f: Fibra) => {
    setEditingFibra(f.id);
    setEditFibraName(f.name);
    setEditFibraActive(!!f.is_active);
  };

  const handleSaveFibra = async (id: number) => {
    try {
      await requestFibras(`/api/fibras/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editFibraName.trim().toUpperCase(),
          is_active: editFibraActive,
        }),
      });
      setEditingFibra(null);
      fetchFibras();
    } catch (error) {
      alert("Erro ao atualizar fibra");
    }
  };

  const handleDeleteFibra = async (id: number, name: string) => {
    if (confirm(`Tem certeza que deseja excluir "${name}"?`)) {
      try {
        await requestFibras(`/api/fibras/${id}`, { method: "DELETE" });
        fetchFibras();
      } catch (error) {
        alert("Erro ao excluir fibra");
      }
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
            <Settings className="w-8 h-8 mr-3 text-purple-600" />
            Configurações Gerais
          </h1>
          <p className="text-gray-600">Gerenciar transportadoras e regiões de entrega</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-2 flex gap-2">
          <button
            onClick={() => setActiveTab("transportadoras")}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === "transportadoras"
                ? "bg-purple-500 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Truck className="w-5 h-5" />
            Transportadoras
          </button>
          <button
            onClick={() => setActiveTab("regioes")}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === "regioes"
                ? "bg-purple-500 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <MapPin className="w-5 h-5" />
            Regiões de Entrega
          </button>
          <button
            onClick={() => setActiveTab("fibras")}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === "fibras"
                ? "bg-purple-500 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Layers className="w-5 h-5" />
            Fibras
          </button>
        </div>

        {/* Transportadoras Tab */}
        {activeTab === "transportadoras" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setShowCreateTransportadora(!showCreateTransportadora)}
                className="bg-purple-500 hover:bg-purple-600 text-white px-5 py-2.5 rounded-lg font-semibold transition-all flex items-center gap-2 shadow-lg"
              >
                <Plus className="w-5 h-5" />
                Nova Transportadora
              </button>
            </div>

            {showCreateTransportadora && (
              <form onSubmit={handleCreateTransportadora} className="bg-white rounded-xl shadow-lg border border-gray-200 p-5">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newTransportadoraName}
                    onChange={(e) => setNewTransportadoraName(e.target.value)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Ex: TRANS - SÃO MIGUEL"
                  />
                  <button
                    type="submit"
                    className="bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-lg font-semibold"
                  >
                    Adicionar
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowCreateTransportadora(false); setNewTransportadoraName(""); }}
                    className="bg-gray-400 hover:bg-gray-500 text-white px-5 py-2.5 rounded-lg font-semibold"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-purple-100">
                <div className="flex items-center">
                  <Truck className="w-5 h-5 text-purple-600 mr-2" />
                  <h2 className="text-lg font-bold text-gray-900">Transportadoras Cadastradas</h2>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {transportadoras && transportadoras.length > 0 ? (
                  transportadoras.map((t) => (
                    <div key={t.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                      {editingTransportadora === t.id ? (
                        <>
                          <div className="flex items-center gap-3 flex-1">
                            <input
                              type="text"
                              value={editTransportadoraName}
                              onChange={(e) => setEditTransportadoraName(e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            />
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={editTransportadoraActive}
                                onChange={(e) => setEditTransportadoraActive(e.target.checked)}
                                className="w-4 h-4 text-green-600 rounded"
                              />
                              Ativo
                            </label>
                          </div>
                          <div className="flex gap-2 ml-3">
                            <button onClick={() => handleSaveTransportadora(t.id)} className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg">
                              <Save className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingTransportadora(null)} className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <Truck className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{t.name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${t.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                              {t.is_active ? "Ativo" : "Inativo"}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleEditTransportadora(t)} className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteTransportadora(t.id, t.name)} className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="px-5 py-8 text-center text-gray-500">
                    Nenhuma transportadora cadastrada
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Regiões Tab */}
        {activeTab === "regioes" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setShowCreateRegiao(!showCreateRegiao)}
                className="bg-purple-500 hover:bg-purple-600 text-white px-5 py-2.5 rounded-lg font-semibold transition-all flex items-center gap-2 shadow-lg"
              >
                <Plus className="w-5 h-5" />
                Nova Região
              </button>
            </div>

            {showCreateRegiao && (
              <form onSubmit={handleCreateRegiao} className="bg-white rounded-xl shadow-lg border border-gray-200 p-5">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newRegiaoName}
                    onChange={(e) => setNewRegiaoName(e.target.value)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Ex: JARAGUÁ"
                  />
                  <button
                    type="submit"
                    className="bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-lg font-semibold"
                  >
                    Adicionar
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowCreateRegiao(false); setNewRegiaoName(""); }}
                    className="bg-gray-400 hover:bg-gray-500 text-white px-5 py-2.5 rounded-lg font-semibold"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-orange-100">
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 text-orange-600 mr-2" />
                  <h2 className="text-lg font-bold text-gray-900">Regiões Cadastradas</h2>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {regioes && regioes.length > 0 ? (
                  regioes.map((r) => (
                    <div key={r.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                      {editingRegiao === r.id ? (
                        <>
                          <div className="flex items-center gap-3 flex-1">
                            <input
                              type="text"
                              value={editRegiaoName}
                              onChange={(e) => setEditRegiaoName(e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            />
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={editRegiaoActive}
                                onChange={(e) => setEditRegiaoActive(e.target.checked)}
                                className="w-4 h-4 text-green-600 rounded"
                              />
                              Ativo
                            </label>
                          </div>
                          <div className="flex gap-2 ml-3">
                            <button onClick={() => handleSaveRegiao(r.id)} className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg">
                              <Save className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingRegiao(null)} className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <MapPin className="w-4 h-4 text-orange-400" />
                            <span className="font-medium text-gray-900">{r.name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${r.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                              {r.is_active ? "Ativo" : "Inativo"}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleEditRegiao(r)} className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteRegiao(r.id, r.name)} className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="px-5 py-8 text-center text-gray-500">
                    Nenhuma região cadastrada
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Fibras Tab */}
        {activeTab === "fibras" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setShowCreateFibra(!showCreateFibra)}
                className="bg-purple-500 hover:bg-purple-600 text-white px-5 py-2.5 rounded-lg font-semibold transition-all flex items-center gap-2 shadow-lg"
              >
                <Plus className="w-5 h-5" />
                Nova Fibra
              </button>
            </div>

            {showCreateFibra && (
              <form onSubmit={handleCreateFibra} className="bg-white rounded-xl shadow-lg border border-gray-200 p-5">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newFibraName}
                    onChange={(e) => setNewFibraName(e.target.value)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Ex: POLIÉSTER"
                  />
                  <button
                    type="submit"
                    className="bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-lg font-semibold"
                  >
                    Adicionar
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowCreateFibra(false); setNewFibraName(""); }}
                    className="bg-gray-400 hover:bg-gray-500 text-white px-5 py-2.5 rounded-lg font-semibold"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-indigo-100">
                <div className="flex items-center">
                  <Layers className="w-5 h-5 text-indigo-600 mr-2" />
                  <h2 className="text-lg font-bold text-gray-900">Fibras Cadastradas</h2>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {fibras && fibras.length > 0 ? (
                  fibras.map((f) => (
                    <div key={f.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                      {editingFibra === f.id ? (
                        <>
                          <div className="flex items-center gap-3 flex-1">
                            <input
                              type="text"
                              value={editFibraName}
                              onChange={(e) => setEditFibraName(e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            />
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={editFibraActive}
                                onChange={(e) => setEditFibraActive(e.target.checked)}
                                className="w-4 h-4 text-green-600 rounded"
                              />
                              Ativo
                            </label>
                          </div>
                          <div className="flex gap-2 ml-3">
                            <button onClick={() => handleSaveFibra(f.id)} className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg">
                              <Save className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingFibra(null)} className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <Layers className="w-4 h-4 text-indigo-400" />
                            <span className="font-medium text-gray-900">{f.name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${f.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                              {f.is_active ? "Ativo" : "Inativo"}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleEditFibra(f)} className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteFibra(f.id, f.name)} className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="px-5 py-8 text-center text-gray-500">
                    Nenhuma fibra cadastrada
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
