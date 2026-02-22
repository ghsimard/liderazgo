import Encuesta360Form from "@/components/Encuesta360Form";
import { docenteConfig } from "@/data/encuesta360Data";

export default function Encuesta360Docente() {
  return <Encuesta360Form config={docenteConfig} />;
}
