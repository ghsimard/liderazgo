import Encuesta360Form from "@/components/Encuesta360Form";
import { directivoConfig } from "@/data/encuesta360Data";

export default function Encuesta360Directivo() {
  return <Encuesta360Form config={directivoConfig} />;
}
