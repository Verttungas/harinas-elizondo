import { useReducer } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { StepIndicator } from "@/components/certificados/StepIndicator";
import { api, handleApiError } from "@/lib/api";
import type {
  Cliente,
  DatosEmbarque,
  Inspeccion,
  Lote,
} from "@/types/domain.types";
import { PasoCliente } from "./PasoCliente";
import { PasoLoteInspecciones } from "./PasoLoteInspecciones";
import { PasoEmbarque } from "./PasoEmbarque";
import { PasoRevision } from "./PasoRevision";

export type WizardState = {
  step: 1 | 2 | 3 | 4;
  cliente?: Cliente;
  lote?: Lote;
  inspecciones?: Inspeccion[];
  embarque?: DatosEmbarque;
};

type Action =
  | { type: "NEXT" }
  | { type: "PREV" }
  | { type: "SET_CLIENTE"; cliente: Cliente }
  | { type: "SET_LOTE_INSPECCIONES"; lote: Lote; inspecciones: Inspeccion[] }
  | { type: "SET_EMBARQUE"; embarque: DatosEmbarque };

function reducer(state: WizardState, action: Action): WizardState {
  switch (action.type) {
    case "NEXT":
      return { ...state, step: Math.min(4, state.step + 1) as 1 | 2 | 3 | 4 };
    case "PREV":
      return { ...state, step: Math.max(1, state.step - 1) as 1 | 2 | 3 | 4 };
    case "SET_CLIENTE":
      return { ...state, cliente: action.cliente };
    case "SET_LOTE_INSPECCIONES":
      return {
        ...state,
        lote: action.lote,
        inspecciones: action.inspecciones,
      };
    case "SET_EMBARQUE":
      return { ...state, embarque: action.embarque };
    default:
      return state;
  }
}

export function WizardCertificado() {
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(reducer, { step: 1 });
  const handleCancelar = () => {
    if (
      state.cliente ||
      state.lote ||
      state.embarque
    ) {
      if (!confirm("Hay cambios sin guardar. ¿Descartar?")) return;
    }
    navigate("/certificados");
  };

  const emitir = async () => {
    if (!state.cliente || !state.lote || !state.inspecciones || !state.embarque) {
      toast.error("Faltan datos");
      return;
    }
    try {
      const r = await api.post<{ id: string | number; numero: string }>(
        "/certificados",
        {
          clienteId: state.cliente.id,
          loteId: state.lote.id,
          inspeccionIds: state.inspecciones.map((i) => i.id),
          datosEmbarque: state.embarque,
        },
      );
      toast.success(`Certificado ${r.data.numero} emitido`);
      navigate(`/certificados/${r.data.id}`);
    } catch (err) {
      toast.error(handleApiError(err));
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <Breadcrumb
        items={[
          { label: "Certificados", to: "/certificados" },
          { label: "Emitir" },
        ]}
      />
      <PageHeader title="Emitir certificado" />
      <StepIndicator current={state.step} />

      {state.step === 1 && (
        <PasoCliente
          cliente={state.cliente}
          onSelect={(c) => dispatch({ type: "SET_CLIENTE", cliente: c })}
          onNext={() => dispatch({ type: "NEXT" })}
          onCancel={handleCancelar}
        />
      )}
      {state.step === 2 && state.cliente && (
        <PasoLoteInspecciones
          lote={state.lote}
          inspecciones={state.inspecciones}
          onConfirm={(lote, inspecciones) =>
            dispatch({ type: "SET_LOTE_INSPECCIONES", lote, inspecciones })
          }
          onNext={() => dispatch({ type: "NEXT" })}
          onPrev={() => dispatch({ type: "PREV" })}
        />
      )}
      {state.step === 3 && (
        <PasoEmbarque
          embarque={state.embarque}
          onConfirm={(e) => dispatch({ type: "SET_EMBARQUE", embarque: e })}
          onNext={() => dispatch({ type: "NEXT" })}
          onPrev={() => dispatch({ type: "PREV" })}
        />
      )}
      {state.step === 4 &&
        state.cliente &&
        state.lote &&
        state.inspecciones &&
        state.embarque && (
          <PasoRevision
            state={state}
            onPrev={() => dispatch({ type: "PREV" })}
            onConfirm={() => void emitir()}
          />
        )}
    </div>
  );
}
