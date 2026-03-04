import Encuesta360Form from "@/components/Encuesta360Form";
import { autoevaluacionConfig } from "@/data/encuesta360Data";

export default function Encuesta360FinalAutoevaluacion() {
  return <Encuesta360Form config={autoevaluacionConfig} fase="final" />;
}
