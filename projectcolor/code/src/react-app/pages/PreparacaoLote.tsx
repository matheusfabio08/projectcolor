import { useState, useEffect } from "react";
import Layout from "@/react-app/components/Layout";
import { useAPI } from "@/react-app/hooks/useAPI";
import { Users, Weight, Box, Save, Search } from "lucide-react";
import { ProductionOrder, Employee } from "@/shared/types";

export default function PreparacaoLote() {
  const { request } = useAPI();
  const [opNumbers, setOpNumbers] = useState("");
  const [selectedOPs, setSelectedOPs] = useState<{ op: ProductionOrder; meters: number }[]>([]);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [numEmployees, setNumEmployees] = useState(1);
  const [employeeMeters, setEmployeeMeters] = useState<{ employee_id: string; meters: number }[]>([]);
  const [splices, setSplices] = useState<string[]>([]);
  const [totalWeight, setTotalWeight] = useState("");
  const [destinationBox, setDestinationBox] = useState("");
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const data = await request("/api/employees?sector=Preparação");
      setAvailableEmployees(data);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const handleEmployeeChange = (value: number) => {
    setNumEmployees(value);
    setEmployeeMeters(Array(value).fill(null).map(() => ({
      employee_id: "",
      meters: 0,
    })));
  };

  const searchOPs = async () => {
    if (!opNumbers.trim()) {
      alert("Digite pelo menos um número de OP");
      return;
    }

    // Split by comma, newline, or spaces
    const numbers = opNumbers
      .split(/[\n,\s]+/)
      .map(n => n.trim())
      .filter(n => n.length > 0);

    if (numbers.length === 0) {
      alert("Digite pelo menos um número de OP válido");
      return;
    }

    try {
      const allOPs = await request("/api/production-orders?status=preparacao");
      const foundOPs: ProductionOrder[] = [];
      const notFound: string[] = [];

      for (const num of numbers) {
        const op = allOPs.find((o: ProductionOrder) => o.op_number === num);
        if (op) {
          foundOPs.push(op);
        } else {
          notFound.push(num);
        }
      }

      if (notFound.length > 0) {
        alert(`OPs não encontradas ou não estão em Preparação: ${notFound.join(", ")}`);
      }

      if (foundOPs.length > 0) {
        // Check if all OPs have the same color
        const colors = [...new Set(foundOPs.map(op => op.color))];
        if (colors.length > 1) {
          alert(`Atenção: As OPs selecionadas têm cores diferentes: ${colors.join(", ")}`);
        }

        setSelectedOPs(foundOPs.map(op => ({
          op,
          meters: (op as any).quantity || 0,
        })));
      }
    } catch (error) {
      alert("Erro ao buscar OPs");
    }
  };

  const updateOPMeters = (opId: number, meters: number) => {
    setSelectedOPs(selectedOPs.map(s => 
      s.op.id === opId ? { ...s, meters } : s
    ));
  };

  const removeOP = (opId: number) => {
    setSelectedOPs(selectedOPs.filter(s => s.op.id !== opId));
  };

  const handleStart = () => {
    if (selectedOPs.length === 0) {
      alert("Selecione pelo menos uma OP");
      return;
    }
    setStartedAt(new Date().toISOString());
    // Initialize with 1 employee by default
    setEmployeeMeters([{
      employee_id: "",
      meters: 0,
    }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedOPs.length === 0 || !totalWeight || !destinationBox) {
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
      // Get color from first OP (they should all be same color ideally)
      const color = selectedOPs[0].op.color;
      
      const result = await request("/api/preparation/batch", {
        method: "POST",
        body: JSON.stringify({
          color: color,
          employee_meters: employeeMeters,
          splices,
          total_weight: parseFloat(totalWeight),
          destination_box: destinationBox,
          start_time: startedAt,
          end_time: new Date().toISOString(),
          ops: selectedOPs.map(s => ({
            op_id: s.op.id,
            meters: s.meters,
          })),
        }),
      });

      alert(`Lote ${result.batch_number} criado com sucesso!`);
      
      // Reset form
      setOpNumbers("");
      setSelectedOPs([]);
      setStartedAt(null);
      setNumEmployees(1);
      setEmployeeMeters([]);
      setSplices([]);
      setTotalWeight("");
      setDestinationBox("");
    } catch (error) {
      alert("Erro ao processar lote");
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Preparação em Lote</h1>
          <p className="text-gray-600">Agrupar múltiplas OPs para processar juntas</p>
        </div>

        {!startedAt ? (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Números das OPs
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Digite os números das OPs que deseja processar juntas (separados por vírgula, espaço ou quebra de linha)
              </p>
              <textarea
                value={opNumbers}
                onChange={(e) => setOpNumbers(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
                rows={4}
                placeholder="Ex: 001, 002, 003 ou uma por linha"
              />
              <button
                onClick={searchOPs}
                disabled={!opNumbers.trim()}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
              >
                <Search className="w-5 h-5" />
                Buscar OPs
              </button>
            </div>

            {selectedOPs.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  OPs Selecionadas ({selectedOPs.length})
                </h2>
                <div className="space-y-3">
                  {selectedOPs.map((s) => (
                    <div
                      key={s.op.id}
                      className="border-2 border-blue-200 bg-blue-50 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">OP {s.op.op_number}</div>
                          <div className="text-sm text-gray-700">{s.op.client}</div>
                          <div className="text-sm text-gray-600">{s.op.color}</div>
                          <div className="text-sm text-gray-500">
                            {(s.op as any).material}
                          </div>
                        </div>
                        <button
                          onClick={() => removeOP(s.op.id)}
                          className="text-red-600 hover:text-red-800 font-medium text-sm"
                        >
                          Remover
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700">Metros:</label>
                        <input
                          type="number"
                          value={s.meters}
                          onChange={(e) => updateOPMeters(s.op.id, parseFloat(e.target.value) || 0)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Metros"
                          step="0.01"
                        />
                        <span className="text-sm text-gray-600">{(s.op as any).unit}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-lg font-semibold text-gray-900">
                      Total do Lote
                    </div>
                    <div className="text-xl font-bold text-blue-600">
                      {selectedOPs.reduce((sum, s) => sum + s.meters, 0).toFixed(2)} metros
                    </div>
                  </div>
                  <button
                    onClick={handleStart}
                    className="w-full bg-green-500 hover:bg-green-600 text-white px-6 py-4 rounded-lg font-semibold text-lg transition-all transform hover:scale-105 shadow-lg"
                  >
                    Iniciar Preparação do Lote
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg border border-blue-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">OPs no Lote</h2>
              <div className="space-y-2">
                {selectedOPs.map((s) => (
                  <div key={s.op.id} className="flex justify-between items-center bg-white rounded-lg p-3">
                    <div>
                      <div className="font-semibold text-gray-900">OP {s.op.op_number}</div>
                      <div className="text-sm text-gray-600">{s.op.client} - {s.op.color}</div>
                    </div>
                    <div className="text-sm font-medium text-gray-700">
                      {s.meters} {(s.op as any).unit}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Total:</span>
                  <span className="text-lg font-bold text-blue-600">
                    {selectedOPs.reduce((sum, s) => sum + s.meters, 0).toFixed(2)} metros
                  </span>
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
                    value={totalWeight}
                    onChange={(e) => setTotalWeight(e.target.value)}
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
                className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all transform hover:scale-105 shadow-lg flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                Concluir Lote
              </button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
}
