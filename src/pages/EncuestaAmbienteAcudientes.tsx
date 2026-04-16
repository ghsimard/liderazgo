import { forwardRef } from "react";
import AmbienteEscolarForm from "@/components/AmbienteEscolarForm";

export default forwardRef<HTMLDivElement>(function EncuestaAmbienteAcudientes(_props, ref) {
  return <AmbienteEscolarForm formType="acudientes" />;
});
