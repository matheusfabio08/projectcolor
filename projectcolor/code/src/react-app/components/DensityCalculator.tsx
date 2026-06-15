import { useState, useEffect } from "react";
import { Calculator, Info } from "lucide-react";

export function DensityCalculator() {
  // Inputs
  const [pesoMalha, setPesoMalha] = useState<string>("");
  const [relacaoBanho, setRelacaoBanho] = useState<string>("");
  const [adicoesAgua, setAdicoesAgua] = useState<string>("");
  const [salMeta, setSalMeta] = useState<string>("");
  const [barrilhaMeta, setBarrilhaMeta] = useState<string>("");
  const [densidadeMedida, setDensidadeMedida] = useState<string>("");

  // Calculated values
  const [volumeBanhoTotal, setVolumeBanhoTotal] = useState<number>(0);
  const [volumeReal, setVolumeReal] = useState<number>(0);
  const [diferenca, setDiferenca] = useState<number>(0);
  const [eletrolitoReceita, setEletrolitoReceita] = useState<number>(0);
  const [salAcrescentar, setSalAcrescentar] = useState<number>(0);
  const [barrilhaAcrescentar, setBarrilhaAcrescentar] = useState<number>(0);

  useEffect(() => {
    const peso = parseFloat(pesoMalha) || 0;
    const relacao = parseFloat(relacaoBanho) || 0;
    const adicoes = parseFloat(adicoesAgua) || 0;
    const sal = parseFloat(salMeta) || 0;
    const barrilha = parseFloat(barrilhaMeta) || 0;

    // Volume do banho total = Peso × Relação
    const volBanho = peso * relacao;
    setVolumeBanhoTotal(volBanho);

    // Retenção de água pela malha (aprox. 3.125 L/kg)
    const retencao = peso * 3.125;

    // Volume real da máquina = Volume banho + Adições - Retenção
    const volReal = volBanho + adicoes - retencao;
    setVolumeReal(Math.max(0, volReal));

    // Diferença (volume a mais)
    const diff = Math.max(0, volReal - volBanho);
    setDiferenca(diff);

    // Eletrólito da receita (kg)
    const eletrolito = (sal * volBanho) / 1000;
    setEletrolitoReceita(eletrolito);

    // Sal a acrescentar (g) = Sal meta × Diferença
    const salAdd = sal * diff;
    setSalAcrescentar(salAdd);

    // Barrilha a acrescentar (g) = Barrilha meta × Diferença
    const barrilhaAdd = barrilha * diff;
    setBarrilhaAcrescentar(barrilhaAdd);
  }, [pesoMalha, relacaoBanho, adicoesAgua, salMeta, barrilhaMeta, densidadeMedida]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Calculator className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Calculadora de Densidade</h2>
            <p className="text-sm text-gray-600">Calcule a quantidade de sal e barrilha a acrescentar</p>
          </div>
        </div>

        {/* Input Fields */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Peso da Malha (kg)
            </label>
            <input
              type="number"
              step="0.01"
              value={pesoMalha}
              onChange={(e) => setPesoMalha(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0,8"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Relação de Banho (L/kg)
            </label>
            <input
              type="number"
              step="0.1"
              value={relacaoBanho}
              onChange={(e) => setRelacaoBanho(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="25"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Adições Água Limpa (L)
            </label>
            <input
              type="number"
              step="0.1"
              value={adicoesAgua}
              onChange={(e) => setAdicoesAgua(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="68"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Sal Receita (g/L) - Meta
            </label>
            <input
              type="number"
              step="0.1"
              value={salMeta}
              onChange={(e) => setSalMeta(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="70"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Barrilha (g/L) - Meta
            </label>
            <input
              type="number"
              step="0.1"
              value={barrilhaMeta}
              onChange={(e) => setBarrilhaMeta(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="5"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-emerald-600 uppercase mb-1">
              Densidade Medida (g/L)
            </label>
            <input
              type="number"
              step="0.1"
              value={densidadeMedida}
              onChange={(e) => setDensidadeMedida(e.target.value)}
              className="w-full px-3 py-2 border-2 border-emerald-400 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-emerald-50"
              placeholder="80"
            />
          </div>
        </div>

        {/* Results Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Salt Result */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
            <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
              <span className="text-lg">🧂</span>
              <span className="font-semibold uppercase text-sm">Acrescentar de Sal</span>
            </div>
            <div className="text-5xl font-bold text-red-500">
              {salAcrescentar.toFixed(1)} <span className="text-3xl">G</span>
            </div>
          </div>

          {/* Soda Ash Result */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
            <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
              <span className="text-lg">✏️</span>
              <span className="font-semibold uppercase text-sm">Acrescentar Barrilha</span>
            </div>
            <div className="text-5xl font-bold text-emerald-500">
              {barrilhaAcrescentar.toFixed(1)} <span className="text-3xl">G</span>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-800 font-semibold mb-3">
            <Info className="w-4 h-4" />
            <span className="uppercase text-sm">Informações do Cálculo:</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-blue-600 font-medium">VOLUME BANHO TOTAL:</span>
              <span className="ml-2 text-blue-800">{volumeBanhoTotal.toFixed(1)} L</span>
            </div>
            <div>
              <span className="text-blue-600 font-medium">ELETRÓLITO DA RECEITA:</span>
              <span className="ml-2 text-blue-800">{eletrolitoReceita.toFixed(2)} KG</span>
            </div>
            <div>
              <span className="text-blue-600 font-medium">VOLUME REAL DA MÁQUINA:</span>
              <span className="ml-2 text-blue-800">{volumeReal.toFixed(1)} L</span>
            </div>
            <div>
              <span className="text-blue-600 font-medium">DIFERENÇA (VOLUME A MAIS):</span>
              <span className="ml-2 text-blue-800">{diferenca.toFixed(1)} L</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
