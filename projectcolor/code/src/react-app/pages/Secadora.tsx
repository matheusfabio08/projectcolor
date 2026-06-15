import { useState, useEffect } from "react";
import Layout from "@/react-app/components/Layout";
import { useAPI } from "@/react-app/hooks/useAPI";
import { Wind, ArrowRight } from "lucide-react";
import { ProductionOrder } from "@/shared/types";

export default function Secadora() {
  const { data: pendingOPs, request } = useAPI<ProductionOrder[]>();
  const [selectedOP, setSelectedOP] = useState<number | null>(null);
  const [destination, setDestination] = useState("");

  useEffect(() => {
    fetchPendingOPs();
  }, []);

  const fetchPendingOPs = async () => {
    try {
      await request("/api/production-orders?status=secadora");
    } catch (error) {
      console.error("Error fetching OPs:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOP || !destination) {
      alert("Selecione uma OP e um destino");
      return;
    }

    try {
      await request("/api/dryer", {
        method: "POST",
        body: JSON.stringify({
          po_id: selectedOP,
          destination,
        }),
      });

      alert("OP processada com sucesso!");
      setSelectedOP(null);
      setDestination("");
      fetchPendingOPs();
    } catch (error) {
      alert("Erro ao processar OP");
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Secadora</h1>
          <p className="text-gray-600">Processar OPs e definir próximo destino</p>
        </div>

        {/* Pending OPs */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-orange-100">
            <div className="flex items-center">
              <Wind className="w-6 h-6 text-orange-600 mr-3" />
              <h2 className="text-xl font-bold text-gray-900">OPs Pendentes na Secadora</h2>
            </div>
          </div>

          <div className="p-6">
            {pendingOPs && pendingOPs.length > 0 ? (
              <div className="space-y-3">
                {pendingOPs.map((op) => (
                  <div
                    key={op.id}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedOP === op.id
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-200 hover:border-orange-300 bg-white"
                    }`}
                    onClick={() => setSelectedOP(op.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{op.op_number}</p>
                        <p className="text-sm text-gray-600">
                          {op.client} - {op.color}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Previsão:</p>
                        <p className="font-medium text-gray-700">
                          {new Date(op.expected_date).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">
                Nenhuma OP pendente na secadora
              </p>
            )}
          </div>
        </div>

        {/* Destination Form */}
        {selectedOP && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <ArrowRight className="w-5 h-5 mr-2 text-blue-600" />
                Destino *
              </label>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Selecione o próximo destino</option>
                <option value="destrinchagem">Destrinchagem</option>
                <option value="qualidade_malhas">Qualidade Malhas</option>
                <option value="qualidade">Qualidade</option>
              </select>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all transform hover:scale-105 shadow-lg"
              >
                Processar e Enviar
              </button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
}
