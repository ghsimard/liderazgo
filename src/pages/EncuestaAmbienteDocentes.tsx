import { forwardRef } from "react";
import AmbienteEscolarForm from "@/components/AmbienteEscolarForm";

export default forwardRef<HTMLDivElement>(function EncuestaAmbienteDocentes(_props, ref) {
  return <AmbienteEscolarForm formType="docentes" />;
});
