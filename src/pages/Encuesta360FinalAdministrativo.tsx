import Encuesta360Form from "@/components/Encuesta360Form";
import { administrativoConfig } from "@/data/encuesta360Data";

export default function Encuesta360FinalAdministrativo() {
  return <Encuesta360Form config={administrativoConfig} fase="final" />;
}
