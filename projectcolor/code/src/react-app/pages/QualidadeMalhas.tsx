import { useState, useEffect } from "react";
import Layout from "@/react-app/components/Layout";
import { useAPI } from "@/react-app/hooks/useAPI";
import { Package, Weight, FileText, Camera, Save, Edit, Eye, Clock, Play, CheckCircle2, AlertCircle } from "lucide-react";
import { FabricQualityInspection, Employee } from "@/shared/types";

export default function QualidadeMalhas() {
  const { request } = useAPI();
  const [view, setView] = useState<"kanban" | "form">("kanban");
  const [inspections, setInspections] = useState<FabricQualityInspection[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingInspection, setViewingInspection] = useState<FabricQualityInspection | null>(null);
  
  // Form fields
  const [itemDescription, setItemDescription] = useState("");
  const [weight, setWeight] = useState("");
  const [destinationSector, setDestinationSector] = useState("");
  const [observations, setObservations] = useState("");
  const [defectImageUrl, setDefectImageUrl] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [inspectionDate, setInspectionDate] = useState("");
  const [priority, setPriority] = useState<"normal" | "urgent">("normal");
  const [status, setStatus] = useState<"pending" | "in_progress" | "completed">("pending");
  
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([]);

  // Kanban columns
  const [pendingInspections, setPendingInspections] = useState<FabricQualityInspection[]>([]);
  const [inProgressInspections, setInProgressInspections] = useState<FabricQualityInspection[]>([]);
  const [completedInspections, setCompletedInspections] = useState<FabricQualityInspection[]>([]);

  useEffect(() => {
    loadInspections();
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (view === "kanban") {
      organizeKanbanData();
    }
  }, [inspections, view]);

  const fetchEmployees = async () => {
    try {
      const data = await request("/api/employees?sector=Qualidade de Malhas");
      setAvailableEmployees(data);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const loadInspections = async () => {
    try {
      const data = await request("/api/fabric-quality/inspections");
      setInspections(data);
    } catch (error) {
      console.error("Failed to load inspections:", error);
    }
  };

  const organizeKanbanData = () => {
    const pending = inspections.filter(i => i.status === "pending");
    const inProgress = inspections.filter(i => i.status === "in_progress");
    const completed = inspections.filter(i => {
      if (i.status !== "completed") return false;
      const completedAt = new Date(i.updated_at);
      const now = new Date();
      const hoursDiff = (now.getTime() - completedAt.getTime()) / (1000 * 60 * 60);
      return hoursDiff <= 24;
    });

    setPendingInspections(pending);
    setInProgressInspections(inProgress);
    setCompletedInspections(completed);
  };

  const resetForm = () => {
    setItemDescription("");
    setWeight("");
    setDestinationSector("");
    setObservations("");
    setDefectImageUrl("");
    setEmployeeName("");
    setInspectionDate("");
    setPriority("normal");
    setStatus("pending");
    setEditingId(null);
  };

  const handleEdit = (inspection: FabricQualityInspection) => {
    setEditingId(inspection.id);
    setItemDescription(inspection.item_description);
    setWeight(inspection.weight.toString());
    setDestinationSector(inspection.destination_sector);
    setObservations(inspection.observations || "");
    setDefectImageUrl(inspection.defect_image_url || "");
    setEmployeeName(inspection.employee_name);
    setInspectionDate(inspection.inspection_date.split('T')[0]);
    setPriority((inspection.priority as "normal" | "urgent") || "normal");
    setStatus((inspection.status as "pending" | "in_progress" | "completed") || "pending");
    setView("form");
  };

  const handleStatusChange = async (inspection: FabricQualityInspection, newStatus: "pending" | "in_progress" | "completed") => {
    try {
      await request(`/api/fabric-quality/inspections/${inspection.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...inspection,
          status: newStatus,
        }),
      });
      loadInspections();
    } catch (error) {
      alert("Erro ao atualizar status");
    }
  };

  const handlePriorityChange = async (inspection: FabricQualityInspection) => {
    try {
      const newPriority = inspection.priority === "urgent" ? "normal" : "urgent";
      await request(`/api/fabric-quality/inspections/${inspection.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...inspection,
          priority: newPriority,
        }),
      });
      loadInspections();
    } catch (error) {
      alert("Erro ao atualizar prioridade");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!itemDescription || !weight || !destinationSector || !employeeName || !inspectionDate) {
      alert("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    try {
      const payload = {
        item_description: itemDescription,
        weight: parseFloat(weight),
        destination_sector: destinationSector,
        observations: observations || undefined,
        defect_image_url: defectImageUrl || undefined,
        employee_name: employeeName,
        inspection_date: new Date(inspectionDate).toISOString(),
        priority,
        status,
      };

      if (editingId) {
        await request(`/api/fabric-quality/inspections/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        alert("Inspeção atualizada com sucesso!");
      } else {
        await request("/api/fabric-quality/inspections", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        alert("Inspeção registrada com sucesso!");
      }

      resetForm();
      loadInspections();
      setView("kanban");
    } catch (error) {
      alert("Erro ao salvar inspeção");
    }
  };

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDefectImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const InspectionCard = ({ inspection }: { inspection: FabricQualityInspection }) => {
    const isUrgent = inspection.priority === "urgent";
    return (
      <div
        className={`bg-white border-2 rounded-lg p-4 transition-all hover:shadow-md ${
          isUrgent ? "border-red-500 bg-red-50" : "border-gray-200"
        }`}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-gray-900">
                {inspection.inspection_number}
              </span>
              {isUrgent && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  URGENTE
                </span>
              )}
            </div>
            <p className="text-sm text-gray-700 font-medium">{inspection.item_description}</p>
            <p className="text-xs text-gray-600 mt-1">{inspection.weight.toFixed(2)} kg</p>
            <p className="text-xs text-gray-600">→ {inspection.destination_sector}</p>
            <p className="text-xs text-gray-500 mt-2">{inspection.employee_name}</p>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setViewingInspection(inspection)}
            className="flex-1 text-blue-600 hover:text-blue-800 px-3 py-2 rounded-lg hover:bg-blue-50 transition-all text-sm font-medium"
            title="Ver detalhes"
          >
            <Eye className="w-4 h-4 inline mr-1" />
            Ver
          </button>
          <button
            onClick={() => handleEdit(inspection)}
            className="flex-1 text-orange-600 hover:text-orange-800 px-3 py-2 rounded-lg hover:bg-orange-50 transition-all text-sm font-medium"
            title="Editar"
          >
            <Edit className="w-4 h-4 inline mr-1" />
            Editar
          </button>
          <button
            onClick={() => handlePriorityChange(inspection)}
            className={`px-3 py-2 rounded-lg transition-all text-sm font-medium ${
              isUrgent
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            title={isUrgent ? "Marcar como normal" : "Marcar como urgente"}
          >
            <AlertCircle className="w-4 h-4" />
          </button>
        </div>

        {inspection.status === "pending" && (
          <button
            onClick={() => handleStatusChange(inspection, "in_progress")}
            className="w-full mt-2 bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-all text-sm font-medium"
          >
            Iniciar
          </button>
        )}
        {inspection.status === "in_progress" && (
          <button
            onClick={() => handleStatusChange(inspection, "completed")}
            className="w-full mt-2 bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 transition-all text-sm font-medium"
          >
            Concluir
          </button>
        )}
      </div>
    );
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Qualidade de Malhas</h1>
            <p className="text-gray-600">Controle de recebimento e inspeção de tecidos</p>
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
              onClick={() => {
                setView("form");
                resetForm();
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                view === "form"
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              Nova Inspeção
            </button>
          </div>
        </div>

        {view === "kanban" ? (
          <div className="space-y-6">
            {/* Pendente */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  Pendente
                </h2>
                <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-sm font-medium">
                  {pendingInspections.length}
                </span>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {pendingInspections.map((inspection) => (
                  <InspectionCard key={inspection.id} inspection={inspection} />
                ))}
                {pendingInspections.length === 0 && (
                  <p className="text-gray-500 text-sm col-span-full text-center py-8">
                    Nenhuma inspeção pendente
                  </p>
                )}
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
                  {inProgressInspections.length}
                </span>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {inProgressInspections.map((inspection) => (
                  <InspectionCard key={inspection.id} inspection={inspection} />
                ))}
                {inProgressInspections.length === 0 && (
                  <p className="text-gray-500 text-sm col-span-full text-center py-8">
                    Nenhuma inspeção em andamento
                  </p>
                )}
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
                  {completedInspections.length}
                </span>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {completedInspections.map((inspection) => (
                  <div
                    key={inspection.id}
                    className={`bg-white border-2 rounded-lg p-4 ${
                      inspection.priority === "urgent" ? "border-red-300 bg-red-50" : "border-green-200 bg-green-50"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900">
                            {inspection.inspection_number}
                          </span>
                          {inspection.priority === "urgent" && (
                            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                              URGENTE
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 font-medium">{inspection.item_description}</p>
                        <p className="text-xs text-gray-600 mt-1">{inspection.weight.toFixed(2)} kg</p>
                        <p className="text-xs text-gray-600">→ {inspection.destination_sector}</p>
                        <p className="text-xs text-gray-500 mt-2">{inspection.employee_name}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setViewingInspection(inspection)}
                      className="w-full mt-2 text-blue-600 hover:text-blue-800 px-3 py-2 rounded-lg hover:bg-blue-50 transition-all text-sm font-medium"
                    >
                      <Eye className="w-4 h-4 inline mr-1" />
                      Ver Detalhes
                    </button>
                  </div>
                ))}
                {completedInspections.length === 0 && (
                  <p className="text-gray-500 text-sm col-span-full text-center py-8">
                    Nenhuma inspeção concluída nas últimas 24 horas
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 space-y-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId ? "Editar Inspeção" : "Nova Inspeção"}
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <Package className="w-5 h-5 mr-2 text-blue-600" />
                    Descrição do Item *
                  </label>
                  <input
                    type="text"
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: MALHA PV BRANCA 30/1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <Weight className="w-5 h-5 mr-2 text-blue-600" />
                    Peso (kg) *
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

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Setor de Destino *
                  </label>
                  <select
                    value={destinationSector}
                    onChange={(e) => setDestinationSector(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Selecione o setor</option>
                    <option value="Preparação">Preparação</option>
                    <option value="Produção">Produção</option>
                    <option value="Box 5">Box 5</option>
                    <option value="Destrinchagem">Destrinchagem</option>
                    <option value="Enrolagem">Enrolagem</option>
                    <option value="Qualidade">Qualidade</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Responsável *
                  </label>
                  <select
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Selecione o funcionário</option>
                    {availableEmployees.map((employee) => (
                      <option key={employee.id} value={employee.name}>
                        {employee.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Data da Inspeção *
                  </label>
                  <input
                    type="date"
                    value={inspectionDate}
                    onChange={(e) => setInspectionDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Prioridade *
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as "normal" | "urgent")}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-blue-600" />
                  Observações
                </label>
                <textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="INFORMAÇÕES ADICIONAIS SOBRE O ITEM..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <Camera className="w-5 h-5 mr-2 text-blue-600" />
                  Foto de Defeito (opcional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageCapture}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {defectImageUrl && (
                  <div className="mt-3">
                    <img
                      src={defectImageUrl}
                      alt="Defeito"
                      className="max-w-sm rounded-lg border border-gray-300"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setView("kanban");
                }}
                className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg font-semibold transition-all flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                {editingId ? "Atualizar" : "Salvar"} Inspeção
              </button>
            </div>
          </form>
        )}

        {/* View Details Modal */}
        {viewingInspection && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Detalhes da Inspeção
              </h2>
              
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Número</p>
                    <p className="text-lg text-gray-900">{viewingInspection.inspection_number}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Data</p>
                    <p className="text-lg text-gray-900">
                      {new Date(viewingInspection.inspection_date).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Item</p>
                    <p className="text-lg text-gray-900">{viewingInspection.item_description}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Peso</p>
                    <p className="text-lg text-gray-900">{viewingInspection.weight.toFixed(2)} kg</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Destino</p>
                    <p className="text-lg text-gray-900">{viewingInspection.destination_sector}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Responsável</p>
                    <p className="text-lg text-gray-900">{viewingInspection.employee_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Prioridade</p>
                    <p className="text-lg">
                      {viewingInspection.priority === "urgent" ? (
                        <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold inline-flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          URGENTE
                        </span>
                      ) : (
                        <span className="text-gray-900">Normal</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Status</p>
                    <p className="text-lg text-gray-900">
                      {viewingInspection.status === "pending" && "Pendente"}
                      {viewingInspection.status === "in_progress" && "Em Andamento"}
                      {viewingInspection.status === "completed" && "Concluído"}
                    </p>
                  </div>
                </div>

                {viewingInspection.observations && (
                  <div>
                    <p className="text-sm font-semibold text-gray-600 mb-2">Observações</p>
                    <p className="text-gray-900 bg-gray-50 p-4 rounded-lg">
                      {viewingInspection.observations}
                    </p>
                  </div>
                )}

                {viewingInspection.defect_image_url && (
                  <div>
                    <p className="text-sm font-semibold text-gray-600 mb-2">Foto do Defeito</p>
                    <img
                      src={viewingInspection.defect_image_url}
                      alt="Defeito"
                      className="max-w-full rounded-lg border border-gray-300"
                    />
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setViewingInspection(null);
                    handleEdit(viewingInspection);
                  }}
                  className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-all"
                >
                  Editar
                </button>
                <button
                  onClick={() => setViewingInspection(null)}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold transition-all"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
