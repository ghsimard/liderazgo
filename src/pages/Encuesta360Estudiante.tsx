import Encuesta360Form from "@/components/Encuesta360Form";
import { estudianteConfig } from "@/data/encuesta360Data";

export default function Encuesta360Estudiante() {
  return <Encuesta360Form config={estudianteConfig} />;
}
