import { useState, useEffect } from "react";
import Layout from "@/react-app/components/Layout";
import { Plus, Trash2, PackagePlus, Printer, Search, Edit2, FilePlus } from "lucide-react";
import { useAPI } from "@/react-app/hooks/useAPI";
import { format, addBusinessDays } from "date-fns";

interface Fibra {
  id: number;
  name: string;
  is_active: number;
}

interface Item {
  id?: number;
  material: string;
  quantity: string;
  unit: "metros" | "unidades" | "kg";
  requiresLab: boolean;
  requiresFabricQuality: boolean;
  selectedFibers: number[];
  tempId: string;
}

interface CreatedPO {
  id: number;
  op_number: string;
  client: string;
  color: string;
  order_number: string | null;
  description: string | null;
  entry_date: string;
  expected_date: string;
  items: Array<{
    material: string;
    quantity: number;
    unit: string;
    individual_op: string;
  }>;
}

interface ExistingPO {
  id: number;
  op_number: string;
  client: string;
  color: string;
  order_number: string | null;
  description: string | null;
  entry_date: string;
  expected_date: string;
  status: string;
  created_at: string;
}

export default function Almoxarifado() {
  const { loading, request } = useAPI();
  const [view, setView] = useState<"new" | "manage">("new");
  const [searchTerm, setSearchTerm] = useState("");
  const [existingOPs, setExistingOPs] = useState<ExistingPO[]>([]);
  const [editingOP, setEditingOP] = useState<number | null>(null);
  
  const [client, setClient] = useState("");
  const [color, setColor] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [description, setDescription] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDate, setExpectedDate] = useState(
    addBusinessDays(new Date(), 5).toISOString().split('T')[0]
  );
  const [regionJaragua, setRegionJaragua] = useState(false);
  const [regionBrusque, setRegionBrusque] = useState(false);
  const [regionGaspar, setRegionGaspar] = useState(false);
  const [fibras, setFibras] = useState<Fibra[]>([]);

  // Recalculate expected date when entry date changes (5 business days starting from day after entry)
  const handleEntryDateChange = (newEntryDate: string) => {
    setEntryDate(newEntryDate);
    const entryDateObj = new Date(newEntryDate + 'T12:00:00');
    const newExpectedDate = addBusinessDays(entryDateObj, 5);
    setExpectedDate(newExpectedDate.toISOString().split('T')[0]);
  };
  const [items, setItems] = useState<Item[]>([{ 
    material: "", 
    quantity: "", 
    unit: "metros",
    requiresLab: false,
    requiresFabricQuality: false,
    selectedFibers: [],
    tempId: crypto.randomUUID() 
  }]);
  const [createdPO, setCreatedPO] = useState<CreatedPO | null>(null);
  const [nextOPNumber, setNextOPNumber] = useState<string>("OP-001");

  useEffect(() => {
    fetchNextOPNumber();
    fetchFibras();
  }, []);

  const fetchFibras = async () => {
    try {
      const result = await request("/api/fibras");
      setFibras(result.filter((f: Fibra) => f.is_active === 1));
    } catch (error) {
      console.error("Error fetching fibras:", error);
    }
  };

  useEffect(() => {
    if (view === "manage") {
      fetchExistingOPs();
    }
  }, [view]);

  const fetchNextOPNumber = async () => {
    try {
      const result = await request("/api/production-orders/next-op-number");
      setNextOPNumber(result.next_op_number);
    } catch (error) {
      console.error("Error fetching next OP number:", error);
    }
  };

  const fetchExistingOPs = async () => {
    try {
      const result = await request("/api/production-orders");
      setExistingOPs(result);
    } catch (error) {
      console.error("Error fetching OPs:", error);
    }
  };

  const getItemOPNumber = (index: number) => {
    if (!nextOPNumber) return "";
    const baseNum = parseInt(nextOPNumber);
    return String(baseNum + index).padStart(3, '0');
  };

  const addItem = () => {
    setItems([...items, { 
      material: "", 
      quantity: "", 
      unit: "metros",
      requiresLab: false,
      requiresFabricQuality: false,
      selectedFibers: [],
      tempId: crypto.randomUUID() 
    }]);
  };

  const removeItem = (tempId: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.tempId !== tempId));
    }
  };

  const updateItem = (tempId: string, field: keyof Item, value: any) => {
    setItems(items.map((item) => (item.tempId === tempId ? { ...item, [field]: value } : item)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!client || !color || items.some((item) => !item.material || !item.quantity)) {
      alert("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    try {
      if (editingOP) {
        await request(`/api/production-orders/${editingOP}`, {
          method: "PUT",
          body: JSON.stringify({
            client: client.toUpperCase(),
            color: color.toUpperCase(),
            order_number: orderNumber ? orderNumber.toUpperCase() : undefined,
            description: description ? description.toUpperCase() : undefined,
            entry_date: new Date(entryDate + 'T12:00:00').toISOString(),
            expected_date: new Date(expectedDate + 'T12:00:00').toISOString(),
            region_jaragua: regionJaragua,
            region_brusque: regionBrusque,
            region_gaspar: regionGaspar,
            items: items.map((item) => ({ 
              material: item.material.toUpperCase(),
              quantity: parseFloat(item.quantity) || 0,
              unit: item.unit,
              requires_lab: item.requiresLab,
              requires_fabric_quality: item.requiresFabricQuality,
              fiber_id: item.selectedFibers[0] || null,
              is_dual_fiber: item.selectedFibers.length >= 2,
              fiber2_id: item.selectedFibers[1] || null
            })),
          }),
        });

        const opDetails = await request(`/api/production-orders/${editingOP}`);
        setCreatedPO(opDetails);
        setEditingOP(null);
      } else {
        const result = await request("/api/production-orders", {
          method: "POST",
          body: JSON.stringify({
            client: client.toUpperCase(),
            color: color.toUpperCase(),
            order_number: orderNumber ? orderNumber.toUpperCase() : undefined,
            description: description ? description.toUpperCase() : undefined,
            entry_date: new Date(entryDate + 'T12:00:00').toISOString(),
            expected_date: new Date(expectedDate + 'T12:00:00').toISOString(),
            region_jaragua: regionJaragua,
            region_brusque: regionBrusque,
            region_gaspar: regionGaspar,
            items: items.map((item) => ({ 
              material: item.material.toUpperCase(),
              quantity: parseFloat(item.quantity) || 0,
              unit: item.unit,
              requires_lab: item.requiresLab,
              requires_fabric_quality: item.requiresFabricQuality,
              fiber_id: item.selectedFibers[0] || null,
              is_dual_fiber: item.selectedFibers.length >= 2,
              fiber2_id: item.selectedFibers[1] || null
            })),
          }),
        });

        const opDetails = await request(`/api/production-orders/${result.id}`);
        setCreatedPO(opDetails);
      }
    } catch (error) {
      alert(editingOP ? "Erro ao atualizar ficha de produção" : "Erro ao criar ficha de produção");
    }
  };

  const handleEdit = async (op: ExistingPO) => {
    try {
      const poDetails = await request(`/api/production-orders/${op.id}`);
      
      setEditingOP(op.id);
      setClient(poDetails.client);
      setColor(poDetails.color);
      setOrderNumber(poDetails.order_number || "");
      setDescription(poDetails.description || "");
      setEntryDate(new Date(poDetails.entry_date).toISOString().split('T')[0]);
      setExpectedDate(new Date(poDetails.expected_date).toISOString().split('T')[0]);
      setRegionJaragua(poDetails.region_jaragua === 1);
      setRegionBrusque(poDetails.region_brusque === 1);
      setRegionGaspar(poDetails.region_gaspar === 1);
      
      setItems(poDetails.items.map((item: any) => {
        const fibers: number[] = [];
        if (item.fiber_id) fibers.push(item.fiber_id);
        if (item.fiber2_id) fibers.push(item.fiber2_id);
        return {
          id: item.id,
          material: item.material,
          quantity: String(item.quantity || ""),
          unit: item.unit || "metros",
          requiresLab: item.requires_lab === 1,
          requiresFabricQuality: item.requires_fabric_quality === 1,
          selectedFibers: fibers,
          tempId: crypto.randomUUID()
        };
      }));
      
      setView("new");
    } catch (error) {
      alert("Erro ao carregar detalhes da OP");
    }
  };

  const handleReprint = async (op: ExistingPO) => {
    try {
      const opDetails = await request(`/api/production-orders/${op.id}`);
      setCreatedPO(opDetails);
    } catch (error) {
      alert("Erro ao carregar OP para impressão");
    }
  };

  const handleDelete = async (op: ExistingPO) => {
    if (!confirm(`Tem certeza que deseja excluir a OP ${op.op_number}? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      await request(`/api/production-orders/${op.id}`, {
        method: "DELETE",
      });
      alert("OP excluída com sucesso");
      fetchExistingOPs();
    } catch (error) {
      alert("Erro ao excluir OP");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleNewPO = () => {
    setCreatedPO(null);
    setEditingOP(null);
    setClient("");
    setColor("");
    setOrderNumber("");
    setDescription("");
    setEntryDate(new Date().toISOString().split('T')[0]);
    setExpectedDate(addBusinessDays(new Date(), 5).toISOString().split('T')[0]);
    setRegionJaragua(false);
    setRegionBrusque(false);
    setRegionGaspar(false);
    setItems([{ 
      material: "", 
      quantity: "", 
      unit: "metros",
      requiresLab: false,
      requiresFabricQuality: false,
      selectedFibers: [],
      tempId: crypto.randomUUID() 
    }]);
    fetchNextOPNumber();
  };

  const filteredOPs = existingOPs.filter((op) =>
    op.op_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.color.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      almoxarifado: "Almoxarifado",
      qualidade_malhas: "Qualidade de Malhas",
      laboratorio: "Laboratório",
      preparacao: "Preparação",
      producao: "Produção",
      secadora: "Secadora",
      destrinchagem: "Destrinchagem",
      enrolagem: "Enrolagem",
      qualidade: "Qualidade",
      concluido: "Concluído",
    };
    return labels[status] || status;
  };

  if (createdPO) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between print:hidden">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {editingOP ? "Ficha Atualizada com Sucesso" : "Ficha Criada com Sucesso"}
              </h1>
              <p className="text-gray-600">OP: {createdPO.op_number} - {createdPO.items.length} item(ns)</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handlePrint}
                className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-all"
              >
                <Printer className="w-5 h-5" />
                <span>Imprimir</span>
              </button>
              <button
                onClick={handleNewPO}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-all"
              >
                Nova Ficha
              </button>
            </div>
          </div>

          {/* Print View - Ficha de Produção */}
          <div className="bg-white print:p-0">
            <style>{`
              @media print {
                body { margin: 0; padding: 0; }
                @page { size: A4 landscape; margin: 10mm; }
                .print\\:hidden { display: none !important; }
              }
              
              .ficha {
                width: 750px;
                background: white;
                font-family: Arial, sans-serif;
                margin: 0 auto;
                border: 2px solid #000;
              }
              
              .ficha-main {
                display: flex;
              }
              
              .ficha-left {
                width: 55%;
                border-right: 2px solid #000;
                display: flex;
                flex-direction: column;
              }
              
              .ficha-client {
                font-size: 42px;
                font-weight: bold;
                text-align: center;
                padding: 15px 10px;
                border-bottom: 1px solid #000;
              }
              
              .ficha-color {
                font-size: 38px;
                font-weight: bold;
                text-align: center;
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 10px;
                border-bottom: 1px solid #000;
              }
              
              .ficha-materials {
                font-size: 11px;
                font-weight: bold;
                padding: 8px 10px;
                line-height: 1.4;
                min-height: 60px;
              }
              
              .ficha-right {
                width: 45%;
                display: flex;
                flex-direction: column;
              }
              
              .ficha-table {
                width: 100%;
                border-collapse: collapse;
              }
              
              .ficha-table td {
                border-bottom: 1px solid #000;
                font-size: 11px;
                font-weight: bold;
                padding: 4px 6px;
              }
              
              .ficha-table-label {
                background: #000;
                color: #fff;
                width: 50%;
              }
              
              .ficha-table-value {
                text-align: right;
                width: 50%;
              }
              
              .ficha-number-block {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                border-bottom: 1px solid #000;
              }
              
              .ficha-big-number {
                font-size: 90px;
                font-weight: bold;
                line-height: 1;
              }
              
              .ficha-amido-title {
                background: #000;
                color: #fff;
                font-size: 11px;
                font-weight: bold;
                text-align: center;
                padding: 3px;
              }
              
              .ficha-amido-options {
                display: flex;
              }
              
              .ficha-amido-option {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
                padding: 6px;
                font-size: 11px;
                font-weight: bold;
              }
              
              .ficha-amido-option:first-child {
                border-right: 1px solid #000;
              }
              
              .ficha-checkbox {
                width: 14px;
                height: 14px;
                border: 1px solid #000;
                flex-shrink: 0;
              }
              
              .ficha-empty-block {
                flex: 1;
                min-height: 30px;
                border-top: 1px solid #000;
              }
              
              .ficha-bottom {
                display: flex;
                border-top: 2px solid #000;
                height: 110px;
              }
              
              .ficha-descricao {
                width: 50%;
                display: flex;
                flex-direction: column;
                justify-content: flex-end;
                border-right: 1px solid #000;
                padding: 8px 15px;
              }
              
              .ficha-descricao-line {
                border-top: 1px solid #000;
                margin-bottom: 4px;
              }
              
              .ficha-descricao-title {
                font-size: 12px;
                font-weight: bold;
                text-align: center;
              }
              
              .ficha-checks-area {
                width: 50%;
                display: flex;
                flex-direction: row;
                justify-content: center;
                align-items: center;
                gap: 20px;
                padding: 10px;
              }
              
              .ficha-check-group {
                display: flex;
                flex-direction: column;
                align-items: center;
              }
              
              .ficha-check-row {
                display: flex;
                align-items: center;
                gap: 6px;
              }
              
              .ficha-check-boxes {
                display: flex;
                flex-direction: column;
                gap: 2px;
              }
              
              .ficha-check-box {
                width: 16px;
                height: 16px;
                border: 1px solid #000;
              }
              
              .ficha-check-label {
                font-size: 11px;
                font-weight: bold;
              }
            `}</style>
            
            <div className="ficha">
              <div className="ficha-main">
                <div className="ficha-left">
                  <div className="ficha-client">{createdPO.client.toUpperCase()}</div>
                  <div className="ficha-color">{createdPO.color.toUpperCase()}</div>
                  <div className="ficha-materials">
                    {createdPO.items.map((item, index) => (
                      <div key={index}>
                        {item.material.toUpperCase()} : {item.quantity}{item.unit === 'metros' ? 'M' : item.unit === 'kg' ? 'KG' : 'UN'} OP {item.individual_op}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="ficha-right">
                  <table className="ficha-table">
                    <tbody>
                      <tr>
                        <td className="ficha-table-label">Nº PEDIDO</td>
                        <td className="ficha-table-value">{createdPO.order_number || ''}</td>
                      </tr>
                      <tr>
                        <td className="ficha-table-label">HORA</td>
                        <td className="ficha-table-value"></td>
                      </tr>
                      <tr>
                        <td className="ficha-table-label">ENTRADA</td>
                        <td className="ficha-table-value">{format(new Date(createdPO.entry_date), 'dd/MM/yy')}</td>
                      </tr>
                      <tr>
                        <td className="ficha-table-label">RETORNO</td>
                        <td className="ficha-table-value">{format(new Date(createdPO.expected_date), 'dd/MM/yy')}</td>
                      </tr>
                      <tr>
                        <td className="ficha-table-label">CONF.</td>
                        <td className="ficha-table-value">NOME</td>
                      </tr>
                    </tbody>
                  </table>
                  
                  <div className="ficha-number-block">
                    <div className="ficha-big-number">{format(new Date(createdPO.expected_date), 'dd')}</div>
                  </div>
                  
                  <div className="ficha-amido-title">AMIDO</div>
                  <div className="ficha-amido-options">
                    <div className="ficha-amido-option">
                      <div className="ficha-checkbox"></div>
                      <span>SIM</span>
                    </div>
                    <div className="ficha-amido-option">
                      <div className="ficha-checkbox"></div>
                      <span>NÃO</span>
                    </div>
                  </div>
                  
                  <div className="ficha-empty-block"></div>
                </div>
              </div>
              
              <div className="ficha-bottom">
                <div className="ficha-descricao">
                  <div className="ficha-descricao-line"></div>
                  <div className="ficha-descricao-title">Descrição</div>
                </div>
                <div className="ficha-checks-area">
                  <div className="ficha-check-group">
                    <div className="ficha-check-row">
                      <div className="ficha-check-boxes">
                        <div className="ficha-check-box"></div>
                        <div className="ficha-check-box"></div>
                        <div className="ficha-check-box"></div>
                      </div>
                      <div className="ficha-check-label">SOLIDEZ</div>
                    </div>
                  </div>
                  <div className="ficha-check-group">
                    <div className="ficha-check-row">
                      <div className="ficha-check-boxes">
                        <div className="ficha-check-box"></div>
                        <div className="ficha-check-box"></div>
                      </div>
                      <div className="ficha-check-label">APROVAÇÃO</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center text-gray-600 print:hidden">
            <p>Use Ctrl+P ou Cmd+P para imprimir a ficha</p>
            <p className="text-sm mt-1">Total: {createdPO.items.length} item(ns) na ficha</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Almoxarifado</h1>
          <p className="text-gray-600">Gerenciar fichas de produção</p>
        </div>

        {/* View Toggle */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-2">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setView("new");
                if (editingOP) handleNewPO();
              }}
              className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                view === "new"
                  ? "bg-blue-500 text-white shadow-lg"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <FilePlus className="w-5 h-5" />
              {editingOP ? "Editar Ficha" : "Nova Ficha"}
            </button>
            <button
              onClick={() => setView("manage")}
              className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                view === "manage"
                  ? "bg-blue-500 text-white shadow-lg"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <Search className="w-5 h-5" />
              Gerenciar Fichas
            </button>
          </div>
        </div>

        {view === "manage" ? (
          <div className="space-y-6">
            {/* Search */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por OP, cliente ou cor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* OPs List */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">OP</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Cliente</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Cor</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Previsão</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredOPs.length > 0 ? (
                      filteredOPs.map((op) => (
                        <tr key={op.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-semibold text-blue-600">{op.op_number}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-900">{op.client}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-900">{op.color}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                              {getStatusLabel(op.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {format(new Date(op.expected_date), "dd/MM/yyyy")}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEdit(op)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleReprint(op)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Reimprimir"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(op)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                          Nenhuma ficha encontrada
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 space-y-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <PackagePlus className="w-6 h-6 mr-2 text-blue-600" />
                Informações Básicas
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Cliente *
                  </label>
                  <input
                    type="text"
                    value={client}
                    onChange={(e) => setClient(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                    placeholder="Nome do cliente"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Cor *
                  </label>
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                    placeholder="Nome da cor"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nº Pedido
                  </label>
                  <input
                    type="text"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                    placeholder="Número do pedido"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Data de Entrada *
                  </label>
                  <input
                    type="date"
                    value={entryDate}
                    onChange={(e) => handleEntryDateChange(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Previsão de Saída *
                  </label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Regiões Importantes
                  </label>
                  <div className="flex gap-4 items-center h-[50px] px-4 py-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={regionJaragua}
                        onChange={(e) => setRegionJaragua(e.target.checked)}
                        className="w-5 h-5 text-orange-600 border-orange-300 rounded focus:ring-orange-500"
                      />
                      <span className="text-sm font-semibold text-orange-700">Jaraguá</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={regionBrusque}
                        onChange={(e) => setRegionBrusque(e.target.checked)}
                        className="w-5 h-5 text-orange-600 border-orange-300 rounded focus:ring-orange-500"
                      />
                      <span className="text-sm font-semibold text-orange-700">Brusque</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={regionGaspar}
                        onChange={(e) => setRegionGaspar(e.target.checked)}
                        className="w-5 h-5 text-orange-600 border-orange-300 rounded focus:ring-orange-500"
                      />
                      <span className="text-sm font-semibold text-orange-700">Gaspar</span>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Descrição
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                  rows={3}
                  placeholder="Informações adicionais do cliente, especificações, etc..."
                />
              </div>
            </div>

            {/* Items */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Itens da Produção</h2>
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-md"
                >
                  <Plus className="w-5 h-5" />
                  <span>Adicionar Item</span>
                </button>
              </div>

              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={item.tempId} className="p-4 border-2 border-gray-200 rounded-lg bg-gray-50">
                    <div className="grid md:grid-cols-12 gap-3">
                      <div className="md:col-span-4">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Material *
                        </label>
                        <input
                          type="text"
                          value={item.material}
                          onChange={(e) => updateItem(item.tempId, "material", e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm uppercase"
                          placeholder="Ex: ELÁSTICO 10-20MM"
                          required
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Qtd *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.tempId, "quantity", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder="100"
                          required
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Un *
                        </label>
                        <select
                          value={item.unit}
                          onChange={(e) => updateItem(item.tempId, "unit", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                          <option value="metros">m</option>
                          <option value="unidades">un</option>
                          <option value="kg">kg</option>
                        </select>
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          OP
                        </label>
                        <div className="px-2 py-2 border border-gray-200 rounded-lg bg-blue-50 text-sm text-blue-700 font-semibold text-center">
                          {editingOP ? existingOPs.find(o => o.id === editingOP)?.op_number || "" : getItemOPNumber(index)}
                        </div>
                      </div>
                      <div className="md:col-span-2 flex flex-col justify-center items-center">
                        <div className="flex items-center gap-3 mb-2">
                          <label className="flex items-center space-x-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.requiresLab}
                              onChange={(e) => updateItem(item.tempId, "requiresLab", e.target.checked)}
                              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                            />
                            <span className="text-xs font-semibold text-purple-700">Lab</span>
                          </label>
                          <label className="flex items-center space-x-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.requiresFabricQuality}
                              onChange={(e) => updateItem(item.tempId, "requiresFabricQuality", e.target.checked)}
                              className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                            />
                            <span className="text-xs font-semibold text-teal-700">Malha</span>
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          {fibras.map((fibra) => {
                            const isSelected = item.selectedFibers.includes(fibra.id);
                            const isDisabled = !isSelected && item.selectedFibers.length >= 2;
                            return (
                              <label 
                                key={fibra.id}
                                className={`flex items-center space-x-1 cursor-pointer ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  disabled={isDisabled}
                                  onChange={(e) => {
                                    const newFibers = e.target.checked
                                      ? [...item.selectedFibers, fibra.id]
                                      : item.selectedFibers.filter(id => id !== fibra.id);
                                    updateItem(item.tempId, "selectedFibers", newFibers);
                                  }}
                                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                />
                                <span className="text-xs font-semibold text-indigo-700">{fibra.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                      <div className="md:col-span-1 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => removeItem(item.tempId)}
                          disabled={items.length === 1}
                          className="w-full p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4 mx-auto" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3">
              {editingOP && (
                <button
                  type="button"
                  onClick={handleNewPO}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Processando..." : editingOP ? "Atualizar Ficha" : "Gerar Ficha de Produção"}
              </button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
}
