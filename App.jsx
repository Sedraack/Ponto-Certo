import React, { useState, useEffect, useRef } from "react";

const INK = "#24211B";
const PAPER = "#F2ECDD";
const PAPER_ALT = "#FBF8F0";
const THREAD = "#B23A2E";
const SAGE = "#6E7C63";
const LINE = "#D9CFB8";
const LINE_SOFT = "#E7E0CC";

const PIECE_TYPES = [
  { id: "ajuste", label: "Ajuste / bainha", hours: 1 },
  { id: "simples", label: "Peça simples (calças, saia)", hours: 4 },
  { id: "camisa", label: "Camisa / blusa", hours: 5 },
  { id: "vestido_dia", label: "Vestido do dia-a-dia", hours: 8 },
  { id: "vestido_festa", label: "Vestido de festa", hours: 16 },
  { id: "fato", label: "Fato completo (casaco + calças)", hours: 24 },
  { id: "noiva", label: "Vestido de noiva", hours: 35 },
  { id: "outro", label: "Outro (defino as horas)", hours: 0 },
];

const COMPLEXITY = [
  { id: "simples", label: "Simples", mult: 1 },
  { id: "medio", label: "Médio", mult: 1.3 },
  { id: "complexo", label: "Complexo", mult: 1.6 },
];

const EXTRAS = [
  { id: "bordado", label: "Bordado / aplicações", price: 15 },
  { id: "forro", label: "Forro", price: 8 },
  { id: "acabamento", label: "Acabamento à mão", price: 12 },
  { id: "entrega", label: "Entrega ao domicílio", price: 10 },
];

function formatEUR(n) {
  if (!isFinite(n)) return "0,00 €";
  return n.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

function TapeDivider() {
  return (
    <div
      aria-hidden="true"
      style={{
        height: 18,
        backgroundImage: `repeating-linear-gradient(90deg, ${INK} 0, ${INK} 1px, transparent 1px, transparent 8px)`,
        backgroundPosition: "bottom",
        backgroundSize: "100% 10px",
        backgroundRepeat: "repeat-x",
        borderBottom: `2px solid ${INK}`,
        opacity: 0.55,
      }}
    />
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block mb-4">
      <span
        className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
        style={{ color: INK, opacity: 0.7, fontFamily: "'Inter', sans-serif" }}
      >
        {label}
      </span>
      {children}
      {hint ? (
        <span
          className="block text-xs mt-1"
          style={{ color: INK, opacity: 0.5, fontFamily: "'Inter', sans-serif" }}
        >
          {hint}
        </span>
      ) : null}
    </label>
  );
}

const inputStyle = {
  width: "100%",
  background: PAPER_ALT,
  border: `1.5px solid ${LINE}`,
  borderRadius: 6,
  padding: "9px 11px",
  fontFamily: "'Inter', sans-serif",
  fontSize: 14,
  color: INK,
  outline: "none",
};

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [hourlyRate, setHourlyRate] = useState(12);
  const [margin, setMargin] = useState(25);

  const [clientName, setClientName] = useState("");
  const [pieceType, setPieceType] = useState("simples");
  const [hours, setHours] = useState(4);
  const [fabricPrice, setFabricPrice] = useState(8);
  const [meters, setMeters] = useState(2);
  const [fittings, setFittings] = useState(1);
  const [complexity, setComplexity] = useState("simples");
  const [urgent, setUrgent] = useState(false);
  const [extras, setExtras] = useState({});
  const [notes, setNotes] = useState("");

  const [quotes, setQuotes] = useState([]);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);
  const [showHelp, setShowHelp] = useState(true);
  const [storageError, setStorageError] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(true);

  const firstLoad = useRef(true);

  useEffect(() => {
    (async () => {
      try {
        const s = await window.storage.get("settings");
        if (s && s.value) {
          const parsed = JSON.parse(s.value);
          if (typeof parsed.hourlyRate === "number") setHourlyRate(parsed.hourlyRate);
          if (typeof parsed.margin === "number") setMargin(parsed.margin);
        }
      } catch (e) {
        // sem definições guardadas ainda, mantém os valores por omissão
      }
      try {
        const q = await window.storage.get("quotes");
        if (q && q.value) setQuotes(JSON.parse(q.value));
      } catch (e) {
        // sem orçamentos guardados ainda
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    (async () => {
      try {
        const res = await window.storage.set(
          "settings",
          JSON.stringify({ hourlyRate, margin })
        );
        if (!res) setStorageError(true);
      } catch (e) {
        setStorageError(true);
      }
    })();
  }, [hourlyRate, margin, loaded]);

  function handlePieceType(id) {
    setPieceType(id);
    const preset = PIECE_TYPES.find((p) => p.id === id);
    if (preset) setHours(preset.hours);
  }

  function toggleExtra(id) {
    setExtras((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const complexityMult = COMPLEXITY.find((c) => c.id === complexity)?.mult || 1;
  const laborCost = (Number(hours) || 0) * complexityMult * (Number(hourlyRate) || 0);
  const extraFittings = Math.max((Number(fittings) || 0) - 1, 0);
  const fittingsCost = extraFittings * 0.5 * (Number(hourlyRate) || 0);
  const materialCost = (Number(meters) || 0) * (Number(fabricPrice) || 0);
  const extrasCost = EXTRAS.reduce((sum, e) => (extras[e.id] ? sum + e.price : sum), 0);
  const subtotal = laborCost + fittingsCost + materialCost + extrasCost;
  const urgencyCost = urgent ? subtotal * 0.2 : 0;
  const marginCost = (subtotal + urgencyCost) * ((Number(margin) || 0) / 100);
  const total = subtotal + urgencyCost + marginCost;

  async function saveQuote() {
    const quote = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString("pt-PT"),
      clientName: clientName || "Sem nome",
      pieceLabel: PIECE_TYPES.find((p) => p.id === pieceType)?.label || "",
      total,
      breakdown: { laborCost, fittingsCost, materialCost, extrasCost, urgencyCost, marginCost },
    };
    const next = [quote, ...quotes];
    setQuotes(next);
    try {
      const res = await window.storage.set("quotes", JSON.stringify(next));
      if (!res) setStorageError(true);
    } catch (e) {
      setStorageError(true);
    }
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 1800);
  }

  async function deleteQuote(id) {
    const next = quotes.filter((q) => q.id !== id);
    setQuotes(next);
    try {
      await window.storage.set("quotes", JSON.stringify(next));
    } catch (e) {
      setStorageError(true);
    }
  }

  function summaryText() {
    const lines = [
      `Orçamento — ${clientName || "cliente"}`,
      `Peça: ${PIECE_TYPES.find((p) => p.id === pieceType)?.label || ""}`,
      `Mão de obra: ${formatEUR(laborCost)}`,
      extraFittings > 0 ? `Provas extra: ${formatEUR(fittingsCost)}` : null,
      `Material: ${formatEUR(materialCost)}`,
      extrasCost > 0 ? `Extras: ${formatEUR(extrasCost)}` : null,
      urgent ? `Urgência: ${formatEUR(urgencyCost)}` : null,
      `TOTAL: ${formatEUR(total)}`,
    ].filter(Boolean);
    return lines.join("\n");
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summaryText());
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 1800);
    } catch (e) {
      setCopyFeedback(false);
    }
  }

  return (
    <div style={{ background: PAPER, minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        input[type=number]::-webkit-inner-spin-button { opacity: 1; }
        .serif { font-family: 'Fraunces', serif; }
        .mono { font-family: 'IBM Plex Mono', monospace; }
        .checkline { accent-color: ${THREAD}; width: 16px; height: 16px; }
        select { appearance: none; -webkit-appearance:none; background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6'><path d='M0 0 L5 6 L10 0' fill='%2324211B'/></svg>"); background-repeat: no-repeat; background-position: right 12px center; }
        @media (prefers-reduced-motion: no-preference) {
          .fade-in { animation: fadeIn 0.35s ease-out; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(4px);} to { opacity:1; transform: translateY(0);} }
        }
      `}</style>

      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10">
        {/* Header */}
        <div className="mb-1">
          <span
            className="text-xs font-semibold uppercase tracking-[0.15em]"
            style={{ color: THREAD }}
          >
            Ferramenta de orçamentação · Alfaiataria
          </span>
        </div>
        <h1
          className="serif"
          style={{ color: INK, fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 600, lineHeight: 1.1 }}
        >
          Ponto Certo
        </h1>
        <p style={{ color: INK, opacity: 0.65, fontSize: 15, maxWidth: 560 }} className="mt-2 mb-6">
          Preencha os dados da encomenda e veja o preço a cobrar, calculado sempre com a mesma fórmula — sem adivinhar.
        </p>

        <TapeDivider />

        {/* Instruções */}
        {showHelp && (
          <div
            className="fade-in mt-6 mb-6 p-5 relative"
            style={{ background: PAPER_ALT, border: `1.5px solid ${LINE}`, borderRadius: 8 }}
          >
            <button
              onClick={() => setShowHelp(false)}
              aria-label="Fechar instruções"
              style={{ position: "absolute", top: 12, right: 14, color: INK, opacity: 0.45, fontSize: 13, background: "none", border: "none", cursor: "pointer" }}
            >
              fechar ✕
            </button>
            <h2 className="serif" style={{ color: INK, fontSize: 17, fontWeight: 600, marginBottom: 10 }}>
              Como usar
            </h2>
            <ol style={{ color: INK, opacity: 0.8, fontSize: 14, lineHeight: 1.7 }} className="list-decimal ml-5 space-y-0.5">
              <li>Defina abaixo o seu <strong>preço à hora</strong> e a <strong>margem de lucro</strong> — só precisa de fazer isto uma vez.</li>
              <li>Escolha o tipo de peça: as horas estimadas preenchem-se sozinhas, mas pode ajustá-las.</li>
              <li>Indique o tecido, os metros necessários e o número de provas combinadas.</li>
              <li>Marque os extras aplicáveis (bordado, forro, urgência, etc.).</li>
              <li>O orçamento aparece à direita, atualizado automaticamente. Pode guardá-lo ou copiar o resumo para enviar ao cliente.</li>
            </ol>
          </div>
        )}

        {storageError && (
          <div className="mb-4 text-xs px-3 py-2" style={{ background: "#F6E6E3", color: THREAD, borderRadius: 6 }}>
            Não foi possível guardar os dados neste momento. Pode continuar a usar a calculadora normalmente.
          </div>
        )}

        {/* Definições */}
        <details className="mb-8" open={settingsOpen} onToggle={(e) => setSettingsOpen(e.target.open)}>
          <summary
            className="cursor-pointer text-sm font-semibold uppercase tracking-wide mb-3"
            style={{ color: SAGE }}
          >
            Definições do ateliê
          </summary>
          <div className="grid sm:grid-cols-2 gap-4 mt-3 p-4" style={{ background: PAPER_ALT, border: `1.5px solid ${LINE}`, borderRadius: 8 }}>
            <Field label="Preço à hora (€)" hint="O que o seu tempo de trabalho vale.">
              <input
                type="number"
                min="0"
                step="0.5"
                style={inputStyle}
                value={hourlyRate}
                onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
              />
            </Field>
            <Field label="Margem de lucro (%)" hint="Aplicada sobre o custo total, cobre imprevistos e lucro.">
              <input
                type="number"
                min="0"
                step="1"
                style={inputStyle}
                value={margin}
                onChange={(e) => setMargin(parseFloat(e.target.value) || 0)}
              />
            </Field>
          </div>
        </details>

        {/* Corpo: formulário + resultado */}
        <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
          {/* Formulário */}
          <div className="p-6" style={{ background: PAPER_ALT, border: `1.5px solid ${LINE}`, borderRadius: 10 }}>
            <Field label="Nome do cliente">
              <input
                type="text"
                placeholder="Ex.: Maria Santos"
                style={inputStyle}
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </Field>

            <Field label="Tipo de peça">
              <select style={inputStyle} value={pieceType} onChange={(e) => handlePieceType(e.target.value)}>
                {PIECE_TYPES.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Horas estimadas" hint="Ajuste se a peça for diferente do habitual.">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  style={inputStyle}
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                />
              </Field>
              <Field label="Complexidade">
                <select style={inputStyle} value={complexity} onChange={(e) => setComplexity(e.target.value)}>
                  {COMPLEXITY.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Preço do tecido (€/metro)">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  style={inputStyle}
                  value={fabricPrice}
                  onChange={(e) => setFabricPrice(e.target.value)}
                />
              </Field>
              <Field label="Metros necessários">
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  style={inputStyle}
                  value={meters}
                  onChange={(e) => setMeters(e.target.value)}
                />
              </Field>
            </div>

            <Field label="Número de provas combinadas" hint="A primeira prova está incluída nas horas estimadas.">
              <input
                type="number"
                min="0"
                step="1"
                style={inputStyle}
                value={fittings}
                onChange={(e) => setFittings(e.target.value)}
              />
            </Field>

            <div className="mb-4">
              <span className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: INK, opacity: 0.7 }}>
                Extras
              </span>
              <div className="grid sm:grid-cols-2 gap-2">
                {EXTRAS.map((ex) => (
                  <label key={ex.id} className="flex items-center gap-2 text-sm" style={{ color: INK }}>
                    <input type="checkbox" className="checkline" checked={!!extras[ex.id]} onChange={() => toggleExtra(ex.id)} />
                    {ex.label} <span style={{ opacity: 0.5 }}>(+{formatEUR(ex.price)})</span>
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm mb-4" style={{ color: THREAD, fontWeight: 600 }}>
              <input type="checkbox" className="checkline" checked={urgent} onChange={() => setUrgent(!urgent)} />
              Entrega urgente (+20% sobre o subtotal)
            </label>

            <Field label="Notas (opcional)">
              <textarea
                rows={2}
                placeholder="Detalhes internos sobre a encomenda…"
                style={{ ...inputStyle, resize: "vertical" }}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </div>

          {/* Resultado */}
          <div className="lg:sticky lg:top-6">
            <div
              style={{
                background: "#FFFFFF",
                border: `1.5px solid ${INK}`,
                borderRadius: 10,
                padding: "22px 20px",
                transform: "rotate(-0.6deg)",
                boxShadow: "3px 4px 0 rgba(36,33,27,0.08)",
                position: "relative",
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: "absolute", top: -9, left: 22, width: 16, height: 16, borderRadius: "50%",
                  background: PAPER, border: `2px solid ${INK}`,
                }}
              />
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: INK, opacity: 0.55 }}>
                Orçamento
              </span>
              <div className="mono" style={{ fontSize: 34, color: INK, fontWeight: 600, margin: "4px 0 14px" }}>
                {formatEUR(total)}
              </div>

              <div style={{ borderTop: `1.5px dashed ${LINE}`, paddingTop: 12 }} className="space-y-1.5 mono text-[13px]">
                <Row label="Mão de obra" value={laborCost} />
                {extraFittings > 0 && <Row label="Provas extra" value={fittingsCost} />}
                <Row label="Material" value={materialCost} />
                {extrasCost > 0 && <Row label="Extras" value={extrasCost} />}
                {urgent && <Row label="Urgência" value={urgencyCost} color={THREAD} />}
                <Row label={`Margem (${margin}%)`} value={marginCost} color={SAGE} />
              </div>

              <div className="flex flex-col gap-2 mt-5">
                <button
                  onClick={saveQuote}
                  style={{ background: INK, color: PAPER_ALT, borderRadius: 6, padding: "10px 14px", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer" }}
                >
                  {saveFeedback ? "Guardado ✓" : "Guardar orçamento"}
                </button>
                <button
                  onClick={copySummary}
                  style={{ background: "transparent", color: INK, borderRadius: 6, padding: "9px 14px", fontSize: 14, fontWeight: 600, border: `1.5px solid ${LINE}`, cursor: "pointer" }}
                >
                  {copyFeedback ? "Copiado ✓" : "Copiar resumo para o cliente"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Histórico */}
        {quotes.length > 0 && (
          <div className="mt-10">
            <h2 className="serif" style={{ color: INK, fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
              Orçamentos guardados
            </h2>
            <div className="space-y-2">
              {quotes.map((q) => (
                <div
                  key={q.id}
                  className="flex items-center justify-between px-4 py-3"
                  style={{ background: PAPER_ALT, border: `1.5px solid ${LINE_SOFT}`, borderRadius: 8 }}
                >
                  <div>
                    <div style={{ color: INK, fontWeight: 600, fontSize: 14 }}>{q.clientName}</div>
                    <div style={{ color: INK, opacity: 0.55, fontSize: 12.5 }}>{q.pieceLabel} · {q.date}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="mono" style={{ color: INK, fontWeight: 600, fontSize: 15 }}>{formatEUR(q.total)}</span>
                    <button
                      onClick={() => deleteQuote(q.id)}
                      aria-label="Eliminar orçamento"
                      style={{ color: THREAD, opacity: 0.7, background: "none", border: "none", fontSize: 13, cursor: "pointer" }}
                    >
                      eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p style={{ color: INK, opacity: 0.4, fontSize: 12 }} className="mt-10 text-center">
          Os seus dados ficam guardados neste dispositivo/navegador.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, color }) {
  return (
    <div className="flex justify-between" style={{ color: color || INK, opacity: color ? 1 : 0.75 }}>
      <span>{label}</span>
      <span>{formatEUR(value)}</span>
    </div>
  );
}
