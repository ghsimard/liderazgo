import { forwardRef } from "react";
import AmbienteEscolarForm from "@/components/AmbienteEscolarForm";

export default forwardRef<HTMLDivElement>(function EncuestaAmbienteEstudiantes(_props, ref) {
  return <AmbienteEscolarForm formType="estudiantes" />;
});
