import Encuesta360Form from "@/components/Encuesta360Form";
import { acudienteConfig } from "@/data/encuesta360Data";

export default function Encuesta360FinalAcudiente() {
  return <Encuesta360Form config={acudienteConfig} fase="final" />;
}
