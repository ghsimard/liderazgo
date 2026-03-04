import Encuesta360Form from "@/components/Encuesta360Form";
import { estudianteConfig } from "@/data/encuesta360Data";

export default function Encuesta360FinalEstudiante() {
  return <Encuesta360Form config={estudianteConfig} fase="final" />;
}
