import { useEffect } from "react";
import { useParams, Link } from "react-router";
import Layout from "@/react-app/components/Layout";
import { useAPI } from "@/react-app/hooks/useAPI";
import { ArrowLeft, Package, Calendar, User, Clock, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PODetails {
  id: number;
  op_number: string;
  client: string;
  color: string;
  order_number: string | null;
  entry_date: string;
  expected_date: string;
  requires_lab: number;
  status: string;
  current_stage: string;
  is_completed: number;
  created_at: string;
  items: Array<{
    id: number;
    material: string;
    quantity: number | null;
    unit: string | null;
    requires_lab: number;
    individual_op: string | null;
  }>;
  history: Array<{
    id: number;
    stage: string;
    action: string;
    created_at: string;
    details: string | null;
  }>;
}

export default function PODetails() {
  const { id } = useParams<{ id: string }>();
  const { data: po, request } = useAPI<PODetails>();

  useEffect(() => {
    if (id) {
      fetchPO();
    }
  }, [id]);

  const fetchPO = async () => {
    try {
      await request(`/api/production-orders/${id}`);
    } catch (error) {
      console.error("Error fetching PO:", error);
    }
  };

  if (!po) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full" />
          </div>
        </div>
      </Layout>
    );
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      almoxarifado: "bg-blue-100 text-blue-700 border-blue-300",
      laboratorio: "bg-purple-100 text-purple-700 border-purple-300",
      preparacao: "bg-indigo-100 text-indigo-700 border-indigo-300",
      producao: "bg-yellow-100 text-yellow-700 border-yellow-300",
      secadora: "bg-orange-100 text-orange-700 border-orange-300",
      destrinchagem: "bg-pink-100 text-pink-700 border-pink-300",
      enrolagem: "bg-cyan-100 text-cyan-700 border-cyan-300",
      qualidade: "bg-teal-100 text-teal-700 border-teal-300",
      concluido: "bg-green-100 text-green-700 border-green-300",
    };
    return colors[status] || "bg-gray-100 text-gray-700 border-gray-300";
  };

  const stageLabels: Record<string, string> = {
    almoxarifado: "Almoxarifado",
    laboratorio: "Laboratório",
    preparacao: "Preparação",
    producao: "Produção",
    secadora: "Secadora",
    destrinchagem: "Destrinchagem",
    enrolagem: "Enrolagem",
    qualidade: "Qualidade",
    concluido: "Concluído",
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link
            to="/dashboard"
            className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Voltar ao Dashboard
          </Link>
        </div>

        {/* Main Info */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2">{po.op_number}</h1>
                <div className="flex items-center gap-4 text-blue-100">
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    {po.client}
                  </div>
                  <div className="flex items-center">
                    <Package className="w-4 h-4 mr-2" />
                    {po.color}
                  </div>
                </div>
              </div>
              <div className={`px-4 py-2 rounded-lg border-2 ${getStatusColor(po.status)}`}>
                <span className="font-bold">{stageLabels[po.status] || po.status}</span>
              </div>
            </div>
          </div>

          <div className="p-8 grid md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center text-blue-600 mb-2">
                <Calendar className="w-5 h-5 mr-2" />
                <span className="text-sm font-semibold">Data de Entrada</span>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {format(new Date(po.entry_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
              <div className="flex items-center text-green-600 mb-2">
                <Clock className="w-5 h-5 mr-2" />
                <span className="text-sm font-semibold">Previsão de Saída</span>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {format(new Date(po.expected_date), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
              <div className="flex items-center text-purple-600 mb-2">
                <CheckCircle className="w-5 h-5 mr-2" />
                <span className="text-sm font-semibold">Status</span>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {po.is_completed ? "Finalizado" : "Em Andamento"}
              </p>
            </div>
          </div>

          {po.order_number && (
            <div className="px-8 pb-6">
              <p className="text-sm text-gray-600">
                <strong>Nº Pedido:</strong> {po.order_number}
              </p>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Itens da Produção</h2>
          <div className="space-y-3">
            {po.items && po.items.length > 0 ? (
              po.items.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 mb-2">
                        {item.material}
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        {item.individual_op && (
                          <div>
                            <span className="text-gray-500">OP:</span>{" "}
                            <span className="font-medium text-gray-700">{item.individual_op}</span>
                          </div>
                        )}
                        {item.quantity && (
                          <div>
                            <span className="text-gray-500">Quantidade:</span>{" "}
                            <span className="font-medium text-gray-700">{item.quantity} {item.unit}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-500">Laboratório:</span>{" "}
                          {item.requires_lab ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                              Sim
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                              Não
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">Nenhum item registrado</p>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Histórico de Movimentação</h2>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

            <div className="space-y-6">
              {po.history && po.history.length > 0 ? (
                po.history.map((event) => (
                  <div key={event.id} className="relative pl-12">
                    {/* Timeline dot */}
                    <div className="absolute left-2 w-5 h-5 bg-blue-500 rounded-full border-4 border-white shadow-md" />

                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {stageLabels[event.stage] || event.stage}
                        </h3>
                        <span className="text-sm text-gray-500">
                          {format(new Date(event.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Ação: <span className="font-medium">{event.action}</span>
                      </p>
                      {event.details && (
                        <p className="text-sm text-gray-600 mt-1">{event.details}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">Nenhum histórico disponível</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
