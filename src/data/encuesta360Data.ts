// ── Questions data for each 360° survey form ──

export interface SurveyItem {
  num: number;
  text: string;
}

export interface SurveyFormConfig {
  tipo: "docente" | "estudiante" | "directivo" | "acudiente" | "autoevaluacion" | "administrativo";
  title: string;
  subtitle: string;
  intro: string;
  /** Extra header fields unique to this form */
  extraFields?: {
    key: string;
    label: string;
    type: "radio";
    options: string[];
  }[];
  /** Whether this is a self-evaluation (no "No sé" option, different header fields) */
  isAutoeval?: boolean;
  frequencyItems: SurveyItem[];
  agreementItems: SurveyItem[];
  closingMessage: string;
}

const glossary = [
  "PEI: Proyecto Educativo Institucional",
  "IE: Institución Educativa o colegio",
  "Equipo docente: profesoras y profesores que desarrollan labores académicas en la Institución Educativa",
  "Administrativos: personas cuyas funciones están relacionadas con contabilidad, biblioteca, servicios generales, vigilancia, archivo, recepción de documentos en el colegio.",
];

export const GLOSSARY = glossary;

export const FREQUENCY_OPTIONS_WITH_NOSABE = ["Nunca", "Pocas veces", "Algunas veces", "Siempre", "No sé"];
export const FREQUENCY_OPTIONS_NO_NOSABE = ["Nunca", "Pocas veces", "Algunas veces", "Siempre"];
export const AGREEMENT_OPTIONS_WITH_NOSABE = ["Totalmente en desacuerdo", "Algo en desacuerdo", "Algo de acuerdo", "Totalmente de acuerdo", "No sé"];
export const AGREEMENT_OPTIONS_NO_NOSABE = ["Totalmente en desacuerdo", "Algo en desacuerdo", "Algo de acuerdo", "Totalmente de acuerdo"];

export const DIAS_CONTACTO_OPTIONS = ["Ningún día", "1 a 2 días", "3 a 4 días", "Todos los días"];
export const CARGO_OPTIONS = ["Rector/a", "Coordinador/a"];

// ══════════════════════════════════════════════════════════════
// DOCENTE
// ══════════════════════════════════════════════════════════════
export const docenteConfig: SurveyFormConfig = {
  tipo: "docente",
  title: "ENCUESTA DE 360° PONDERADA",
  subtitle: "INSTRUMENTO PARA DOCENTES",
  intro: "Esta encuesta tiene como objetivo conocer la percepción que tienen las personas que interactúan con el directivo sobre sus competencias personales, pedagógicas, administrativas y comunitarias. Los resultados de esta encuesta le permitirán al directivo participante identificar las áreas de potencial desarrollo que le permitirán mejorar su gestión como líder de la institución educativa.\n\nEn este instrumento no hay respuestas correctas o incorrectas ya que solo se indaga por su percepción y opinión acerca de la gestión del directivo docente de la institución educativa. Le solicitamos que las respuestas que consigne aquí sean sinceras, ya que serán un insumo importante para el mejoramiento continuo del directivo docente evaluado y, a la vez, de la Institución Educativa (IE).",
  frequencyItems: [
    { num: 1, text: "Me convoca a participar en espacios de reflexión (entrevistas, encuestas, reuniones y otros), para que reconozcamos fortalezas y aspectos por mejorar respecto a nuestros roles en la IE." },
    { num: 2, text: "Con nuestra ayuda, orienta el desarrollo de los planes y proyectos pedagógicos, atendiendo a las metas del PEI." },
    { num: 3, text: "Con su equipo de trabajo diseña estrategias participativas para la construcción de una visión institucional conjunta." },
    { num: 4, text: "Convoca a todos los actores de la comunidad educativa a participar en espacios de reflexión para que identifiquen sus fortalezas y aspectos por mejorar." },
    { num: 5, text: "Convoca a acudientes, estudiantes, administrativos y docentes para que de manera participativa hagan el seguimiento y la evaluación de las metas establecidas en el PEI." },
    { num: 6, text: "Diseña con su equipo de trabajo estrategias de planeación participativa para el mejoramiento institucional." },
    { num: 7, text: "Manifiesta sus emociones y reconoce el impacto que tienen en las relaciones que establece conmigo." },
    { num: 8, text: "Me convoca a reflexiones pedagógicas para conocer experiencias transformadoras y fortalecer mis prácticas en la IE." },
    { num: 9, text: "Utiliza estrategias para garantizar que administrativos, estudiantes y acudientes participen en los procesos de planeación institucional." },
    { num: 10, text: "Me invita a participar en actividades para identificar nuestras emociones y cómo estas influyen en el ambiente escolar." },
    { num: 11, text: "Convoca a docentes, directivos, acudientes, estudiantes y administrativos a construir los acuerdos de convivencia de la IE." },
    { num: 12, text: "Se reúne con su equipo de trabajo para identificar con qué organizaciones, entidades y otros actores del territorio, se pueden aliar para avanzar en la transformación de la IE." },
    { num: 13, text: "Me convoca para construir acuerdos para que nuestra comunicación sea clara, directa y cuidadosa." },
    { num: 14, text: "Me convoca a revisar si los procesos de evaluación institucional, de docentes y de estudiantes son pertinentes con los objetivos del colegio." },
    { num: 15, text: "Me invita a construir una estrategia conjunta de rendición de cuentas en la que se aborden los procesos pedagógicos y administrativos." },
    { num: 16, text: "Implementa conmigo y sus demás colaboradores, principios y herramientas para trabajar de manera colaborativa." },
    { num: 17, text: "Convoca a docentes, directivos, acudientes, estudiantes y administrativos para acordar los procesos de evaluación institucional, de docentes y de estudiantes conforme a lo plasmado en el PEI." },
    { num: 18, text: "La rendición de cuentas que lidera incluye los procesos pedagógicos y administrativos, contando con la participación de la comunidad educativa." },
  ],
  agreementItems: [
    { num: 19, text: "Reconoce las posibilidades de realizar alianzas con organizaciones, entidades y otros actores para aportar al logro y desarrollo de los objetivos que se trazan en la IE." },
    { num: 20, text: "Sabe qué fortalezas y oportunidades de mejora tiene en su gestión como directivo docente." },
    { num: 21, text: "Conoce el nivel de pertinencia del PEI en relación con las necesidades y exigencias del contexto del colegio." },
    { num: 22, text: "Considera fundamental reconocer nuestra visión institucional para determinar los objetivos de la IE, los procesos administrativos y pedagógicos." },
    { num: 23, text: "Establece alianzas con organizaciones, entidades y otros actores para fortalecer los procesos institucionales." },
    { num: 24, text: "Invita a acudientes, estudiantes y administrativos a participar en actividades en las que puedan expresar sus emociones de manera oportuna, adecuada y respetuosa." },
    { num: 25, text: "Reconoce el valor transformador de las prácticas pedagógicas, el saber que producen y su potencial para movilizar a la comunidad a participar." },
    { num: 26, text: "Construye la visión compartida de la institución con la participación de estudiantes, docentes, acudientes y administrativos." },
    { num: 27, text: "Lidera espacios de diálogo en las rendiciones de cuentas para dar a conocer avances y retos en la gestión institucional." },
    { num: 28, text: "Reconoce que tiene fortalezas y aspectos por mejorar para comunicarse de manera clara, directa y comprensiva en el colegio." },
    { num: 29, text: "Promueve en acudientes, estudiantes, administrativos y docentes la corresponsabilidad que tienen en los procesos pedagógicos de la IE." },
    { num: 30, text: "Reconoce que la planeación participativa y el involucramiento de la comunidad educativa es una herramienta para el logro de los objetivos institucionales." },
    { num: 31, text: "Construye acuerdos con los diferentes integrantes de la comunidad educativa para que la comunicación sea clara, directa y cuidadosa." },
    { num: 32, text: "Valora las diferencias entre los actores de la comunidad como una oportunidad para mejorar el ambiente escolar." },
    { num: 33, text: "Reconoce su liderazgo y el de sus pares para el fortalecimiento de los procesos educativos, institucionales y territoriales." },
    { num: 34, text: "Trabaja colaborativamente reconociendo sus posibilidades y sus desafíos personales." },
    { num: 35, text: "Construye conmigo acuerdos de convivencia en los que la diferencia se entiende como una potencialidad." },
    { num: 36, text: "Como parte de su equipo de trabajo, me involucra en la identificación de posibilidades de intercambio de saberes y experiencias con otras IE para fortalecer el aprendizaje y la convivencia." },
    { num: 37, text: "Implementa principios y herramientas para trabajar de manera colaborativa en espacios de participación con estudiantes, docentes, acudientes y directivos." },
    { num: 38, text: "Ve en la evaluación institucional, de docentes y de estudiantes una oportunidad para aprender y mejorar." },
    { num: 39, text: "Conforma redes con directivos de otras IE para fortalecer la planeación participativa al interior de la institución educativa." },
  ],
  closingMessage: "Su opinión es muy importante. Gracias por su colaboración.",
};

// ══════════════════════════════════════════════════════════════
// ESTUDIANTE
// ══════════════════════════════════════════════════════════════
export const estudianteConfig: SurveyFormConfig = {
  tipo: "estudiante",
  title: "ENCUESTA DE 360° PONDERADA",
  subtitle: "INSTRUMENTO PARA ESTUDIANTES",
  intro: "Esta encuesta tiene como objetivo conocer tu percepción sobre las competencias del directivo docente evaluado. Los resultados de la encuesta le permitirán al directivo identificar las áreas de potencial desarrollo que le permitirán mejorar su gestión como líder de la institución educativa.\n\nEn este instrumento no hay respuestas correctas o incorrectas ya que solo se indaga por tu percepción y opinión acerca de la gestión del directivo docente de la institución. Te solicitamos que las respuestas que consignes aquí sean sinceras, ya que serán un insumo importante para el mejoramiento continuo del directivo docente evaluado y, a la vez, de la Institución Educativa (IE).",
  extraFields: [
    { key: "grado_estudiante", label: "¿En qué grado estás?", type: "radio", options: ["9°", "10°", "11°"] },
  ],
  frequencyItems: [
    { num: 1, text: "Se reúne con docentes y directivos docentes para reflexionar sobre sus fortalezas y lo que pueden mejorar desde su rol en el colegio." },
    { num: 2, text: "Se reúne con docentes y directivos docentes para orientar los planes y proyectos que tienen para el colegio." },
    { num: 3, text: "Con su equipo de trabajo diseña actividades para que entre toda la comunidad educativa construyamos la visión del colegio." },
    { num: 4, text: "Realiza actividades en las que puedo reflexionar sobre mis fortalezas y mis aspectos por mejorar como estudiante." },
    { num: 5, text: "Me invita a participar en espacios para saber si cumplimos los objetivos de los planes y proyectos del colegio." },
    { num: 6, text: "Se reúne con docentes y directivos para diseñar estrategias de planeación con el fin de traer mejoras a mi colegio." },
    { num: 7, text: "Expresa sus emociones y sabe que la manera como lo hace afecta la relación que tiene conmigo." },
    { num: 8, text: "Se reúne con docentes y directivos docentes para reflexionar sobre cómo sus acciones transforman el colegio." },
    { num: 9, text: "Me invitan a participar en espacios para tomar decisiones sobre los planes y las metas que se quieren para mi colegio." },
    { num: 10, text: "Se reúne con docentes y directivos docentes para aprender a manejar mejor sus emociones y así mejorar el ambiente escolar." },
    { num: 11, text: "Me invita a participar en la construcción de los acuerdos de convivencia del colegio." },
    { num: 12, text: "Se reúne con docentes y directivos para mirar con qué organizaciones, empresas, entidades, etc., se puede realizar un trabajo conjunto con el fin de avanzar en las mejoras que mi colegio necesita." },
    { num: 13, text: "Su comunicación con docentes y directivos docentes es clara, directa y cuidadosa." },
    { num: 14, text: "Se reúne con docentes y directivos para saber si la evaluación responde a lo que busca el colegio." },
    { num: 15, text: "Con docentes, administrativos y directivos planean cómo hacer la rendición de cuentas (resultados de los logros y retos del año)." },
    { num: 16, text: "Realiza actividades de manera colaborativa con sus equipos de trabajo." },
    { num: 17, text: "Me invita a participar en espacios para construir acuerdos y tomar decisiones sobre los procesos de evaluación de mi aprendizaje." },
    { num: 18, text: "La rendición de cuentas (resultados de los logros y retos del año) que hace sobre su gestión incluye los procesos pedagógicos y administrativos." },
  ],
  agreementItems: [
    { num: 19, text: "Explora posibilidades de realizar alianzas con empresas, organizaciones, entre otros, con el fin de lograr las metas y logros que se proponen para mi colegio." },
    { num: 20, text: "Sabe qué fortalezas y oportunidades de mejora tiene en su gestión como directivo docente." },
    { num: 21, text: "Tiene claridad sobre las necesidades del territorio y si están relacionadas con lo que hace la IE." },
    { num: 22, text: "Considera que la visión construida por la comunidad educativa es importante para determinar los objetivos y actividades de la IE." },
    { num: 23, text: "Realiza un trabajo conjunto con otras personas y entidades para fortalecer los procesos y actividades de mi colegio." },
    { num: 24, text: "Me invita a participar en espacios donde puedo aprender a expresar mis emociones de manera oportuna, adecuada y respetuosa." },
    { num: 25, text: "Le da importancia a lo que el equipo docente hace para que las y los estudiantes participemos y aprendamos mejor." },
    { num: 26, text: "Me convoca a participar en espacios para la construcción de la visión institucional del colegio." },
    { num: 27, text: "En las rendiciones de cuentas que hace participan diferentes actores y comparte los resultados de los logros y retos del año." },
    { num: 28, text: "Reconoce sus fortalezas y lo que debe mejorar para comunicarse de manera clara, directa y comprensiva." },
    { num: 29, text: "Me invita a reconocer la responsabilidad que tengo en mi proceso educativo." },
    { num: 30, text: "Reconoce que planear con todos los actores de la comunidad es importante para lograr las metas del colegio." },
    { num: 31, text: "Construye acuerdos conmigo para comunicarnos de manera clara, directa y cuidadosa." },
    { num: 32, text: "Acepta y valora que somos diferentes y eso mejora la convivencia en el colegio." },
    { num: 33, text: "Reconoce que trabajar de la mano con otros directivos fortalece los procesos educativos de mi colegio y de mi región." },
    { num: 34, text: "Sabe lo que se le facilita y lo que se le dificulta para trabajar de manera colaborativa con docentes y estudiantes." },
    { num: 35, text: "Con docentes y directivos ha creado acuerdos para que las diferencias de todas las personas en el colegio sean respetadas." },
    { num: 36, text: "Con docentes y directivos identifica la posibilidad de hacer actividades conjuntas con otros colegios para mejorar nuestro aprendizaje y nuestra convivencia." },
    { num: 37, text: "Realiza actividades donde estudiantes, docentes, administrativos, directivos y acudientes participamos de manera colaborativa." },
    { num: 38, text: "Ve en la evaluación una oportunidad para aprender y mejorar." },
    { num: 39, text: "Trabaja con directivos docentes de otras IE para fortalecer los procesos de planeación al interior de la institución educativa." },
  ],
  closingMessage: "Tu opinión es muy importante. Gracias por tu colaboración.",
};

// ══════════════════════════════════════════════════════════════
// DIRECTIVO
// ══════════════════════════════════════════════════════════════
export const directivoConfig: SurveyFormConfig = {
  tipo: "directivo",
  title: "ENCUESTA DE 360° PONDERADA",
  subtitle: "INSTRUMENTO PARA DIRECTIVO DOCENTE",
  intro: "Esta encuesta tiene como objetivo conocer la percepción que tienen las personas que interactúan con el directivo sobre sus competencias personales, pedagógicas, administrativas y comunitarias. Los resultados de esta encuesta le permitirán al directivo participante identificar las áreas de potencial desarrollo que le permitirán mejorar su gestión como líder de la institución educativa.\n\nEn este instrumento no hay respuestas correctas o incorrectas ya que solo se indaga por su percepción y opinión acerca de la gestión del directivo docente de la institución educativa. Le solicitamos que las respuestas que consigne aquí sean sinceras, ya que serán un insumo importante para el mejoramiento continuo del directivo docente evaluado y, a la vez, de la Institución Educativa (IE).",
  extraFields: [
    { key: "cargo_evaluador", label: "¿Cuál es su cargo en el colegio?", type: "radio", options: ["Rector/a", "Coordinador/a"] },
  ],
  frequencyItems: [
    { num: 1, text: "Me convoca a participar en espacios de reflexión (entrevistas, encuestas, reuniones y otros), para que reconozcamos fortalezas y aspectos por mejorar respecto a nuestros roles en la IE." },
    { num: 2, text: "Con nuestra participación, orienta el desarrollo de los planes y proyectos pedagógicos, atendiendo a las metas del PEI." },
    { num: 3, text: "En conjunto diseñamos estrategias para la construcción de una visión común de la institución educativa donde trabajamos." },
    { num: 4, text: "Convoca a todos los actores de la comunidad educativa a participar en espacios de reflexión para que identifiquen sus fortalezas y aspectos por mejorar." },
    { num: 5, text: "Convoca a acudientes, estudiantes, administrativos y docentes para que de manera participativa hagan el seguimiento y la evaluación de las metas establecidas en el PEI." },
    { num: 6, text: "Diseña conmigo estrategias de planeación participativa para el mejoramiento institucional." },
    { num: 7, text: "Manifiesta sus emociones y reconoce el impacto que tienen en las relaciones que establece conmigo." },
    { num: 8, text: "Me convoca a reflexiones pedagógicas para conocer experiencias transformadoras y fortalecer mis prácticas en la IE." },
    { num: 9, text: "Utiliza estrategias para garantizar que docentes, estudiantes y acudientes participen en los procesos de planeación institucional." },
    { num: 10, text: "Me invita a participar en actividades para identificar nuestras emociones y cómo estas influyen en el ambiente escolar." },
    { num: 11, text: "Convoca a docentes, directivos, acudientes, estudiantes y administrativos a construir los acuerdos de convivencia de la IE." },
    { num: 12, text: "Identifica conmigo, como parte de su equipo de trabajo, posibilidades de alianza con organizaciones, entidades y otros actores del territorio para avanzar en la transformación institucional." },
    { num: 13, text: "Me convoca para construir acuerdos para que nuestra comunicación sea clara, directa y cuidadosa." },
    { num: 14, text: "Me convoca a revisar si los procesos de evaluación institucional, de docentes y de estudiantes son pertinentes con los objetivos del colegio." },
    { num: 15, text: "Me invita, como parte de su equipo de trabajo, a construir una estrategia conjunta de rendición de cuentas en la que se aborden los procesos pedagógicos y administrativos." },
    { num: 16, text: "Implementa conmigo y sus demás colaboradores, principios y herramientas para trabajar de manera colaborativa." },
    { num: 17, text: "Me convoca, como parte del equipo de trabajo, para revisar y acordar los procesos de evaluación institucional, de docentes y de estudiantes conforme a lo plasmado en el PEI." },
    { num: 18, text: "La rendición de cuentas que lidera incluye los procesos pedagógicos y administrativos, contando con la participación de la comunidad educativa." },
  ],
  agreementItems: [
    { num: 19, text: "Reconoce la posibilidad de realizar alianzas con organizaciones, entidades y otros actores para aportar al logro y desarrollo de los objetivos que se trazan en la IE." },
    { num: 20, text: "Sabe qué fortalezas y oportunidades de mejora tiene en su gestión como directivo docente." },
    { num: 21, text: "Conoce el nivel de pertinencia del PEI en relación con las necesidades y exigencias del contexto del colegio." },
    { num: 22, text: "Considera fundamental reconocer nuestra visión institucional para determinar los objetivos de la IE, los procesos administrativos y pedagógicos." },
    { num: 23, text: "Establece alianzas con organizaciones, entidades y otros actores para fortalecer los procesos institucionales." },
    { num: 24, text: "Invita a acudientes, estudiantes y administrativos a participar en actividades en las que puedan expresar sus emociones de manera oportuna, adecuada y respetuosa." },
    { num: 25, text: "Reconoce el valor transformador de las prácticas pedagógicas, el saber que producen y su potencial para movilizar a la comunidad a participar." },
    { num: 26, text: "Construye la visión compartida de la institución con la participación e involucramiento de estudiantes, docentes, acudientes y administrativos." },
    { num: 27, text: "Lidera espacios de diálogo en las rendiciones de cuentas para dar a conocer avances y retos en la gestión institucional." },
    { num: 28, text: "Reconoce que tiene fortalezas y aspectos por mejorar para comunicarse de manera clara, directa y comprensiva en el colegio." },
    { num: 29, text: "Promueve en acudientes, estudiantes, administrativos y docentes la corresponsabilidad que tienen en los procesos pedagógicos de la IE." },
    { num: 30, text: "Reconoce que la planeación participativa y el involucramiento de la comunidad educativa es una herramienta para el logro de los objetivos institucionales." },
    { num: 31, text: "Construye acuerdos con los diferentes integrantes de la comunidad educativa para que la comunicación sea clara, directa y cuidadosa." },
    { num: 32, text: "Valora las diferencias entre los actores de la comunidad como una oportunidad para mejorar el ambiente escolar." },
    { num: 33, text: "Reconoce el aporte de su liderazgo y el de los directivos de otras IE al fortalecimiento de los procesos educativos, institucionales y territoriales." },
    { num: 34, text: "Trabaja colaborativamente reconociendo sus posibilidades y sus desafíos personales." },
    { num: 35, text: "Construye conmigo acuerdos de convivencia en los que la diferencia se entiende como una potencialidad." },
    { num: 36, text: "Como parte de su equipo de trabajo, me involucra en la identificación de posibilidades de intercambio de saberes y experiencias con otras IE para fortalecer el aprendizaje y la convivencia." },
    { num: 37, text: "Implementa principios y herramientas para trabajar de manera colaborativa en espacios de participación con estudiantes, docentes, acudientes y directivos." },
    { num: 38, text: "Ve en la evaluación institucional, de docentes y de estudiantes una oportunidad para aprender y mejorar." },
    { num: 39, text: "Conforma redes con directivos de otras IE para fortalecer la planeación participativa al interior de la institución educativa." },
  ],
  closingMessage: "Su opinión es muy importante. Gracias por su colaboración.",
};

// ══════════════════════════════════════════════════════════════
// ACUDIENTE
// ══════════════════════════════════════════════════════════════
export const acudienteConfig: SurveyFormConfig = {
  tipo: "acudiente",
  title: "ENCUESTA DE 360° PONDERADA",
  subtitle: "INSTRUMENTO PARA ACUDIENTES",
  intro: "Esta encuesta tiene como objetivo conocer la percepción que tienen las personas que interactúan con el directivo sobre sus competencias personales, pedagógicas, administrativas y comunitarias. Los resultados de esta encuesta le permitirán al directivo participante identificar las áreas de potencial desarrollo que le permitirán mejorar su gestión como líder de la institución educativa.\n\nEn este instrumento no hay respuestas correctas o incorrectas ya que solo se indaga por su percepción y opinión acerca de la gestión del directivo docente de la institución educativa. Le solicitamos que las respuestas que consigne aquí sean sinceras, ya que serán un insumo importante para el mejoramiento continuo del directivo docente evaluado y, a la vez, de la Institución Educativa (IE).",
  frequencyItems: [
    { num: 1, text: "Se reúne con docentes y directivos docentes para reflexionar sobre sus fortalezas y lo que pueden mejorar desde su rol en el colegio." },
    { num: 2, text: "Se reúne con docentes y directivos docentes para orientar los planes y proyectos que tienen para el colegio." },
    { num: 3, text: "Con su equipo de trabajo diseña estrategias para la construcción de una visión institucional conjunta." },
    { num: 4, text: "Realiza actividades en las que puedo reflexionar sobre mis fortalezas y mis aspectos por mejorar como acudiente." },
    { num: 5, text: "Me invita a participar en espacios para hacer seguimiento y evaluación a las metas que se proponen en el PEI del colegio." },
    { num: 6, text: "Se reúne con sus docentes y directivos con el fin de diseñar estrategias de planeación para el mejoramiento institucional." },
    { num: 7, text: "Expresa sus emociones y sabe que la manera como lo hace impacta la relación que tiene conmigo." },
    { num: 8, text: "Se reúne con docentes y directivos docentes para reflexionar sobre las transformaciones que se dan en el colegio." },
    { num: 9, text: "Me convoca a participar en espacios para tomar decisiones sobre la planeación institucional." },
    { num: 10, text: "Se reúne con docentes, directivos docentes y administrativos para aprender a manejar mejor sus emociones y así mejorar el ambiente escolar." },
    { num: 11, text: "Me invita a participar en la construcción de los acuerdos de convivencia del colegio." },
    { num: 12, text: "Se reúne con su equipo de trabajo para identificar con qué organizaciones, entidades y otros actores del territorio, se pueden aliar para avanzar en las mejoras que necesita el colegio." },
    { num: 13, text: "Su comunicación con docentes y directivos docentes es clara, directa y cuidadosa." },
    { num: 14, text: "Revisa con los docentes y los directivos la pertinencia de la evaluación con los objetivos del colegio." },
    { num: 15, text: "En las rendiciones de cuentas del colegio muestra cómo le va los y las estudiantes, las actividades que se hacen en el colegio y el uso de los recursos que se tienen." },
    { num: 16, text: "Realiza actividades de manera colaborativa con sus equipos de trabajo." },
    { num: 17, text: "Me convoca a participar en espacios para tomar decisiones sobre los procesos de evaluación de los aprendizajes de mis hijos o estudiantes a cargo." },
    { num: 18, text: "La rendición de cuentas (resultados de los logros y retos del año) que hace sobre su gestión incluye los procesos pedagógicos y administrativos." },
  ],
  agreementItems: [
    { num: 19, text: "Explora posibilidades de realizar alianzas con empresas, organizaciones, entre otros, con el fin de lograr las metas y logros que se proponen para mi colegio." },
    { num: 20, text: "Sabe qué fortalezas y oportunidades de mejora tiene en su gestión como directivo docente." },
    { num: 21, text: "Tiene claridad sobre las necesidades del territorio y si están relacionadas con lo que hace la IE." },
    { num: 22, text: "Considera importante nuestra visión institucional para determinar los objetivos, procesos administrativos y pedagógicos." },
    { num: 23, text: "Realiza alianzas con organizaciones, entidades y otros actores del territorio para avanzar en las mejoras que necesita el colegio." },
    { num: 24, text: "Me invita a participar en espacios donde puedo expresar mis emociones de manera oportuna, adecuada y respetuosa." },
    { num: 25, text: "Valora lo que el equipo docente hace en el colegio para transformar la vida de los y las estudiantes, mejorar sus aprendizajes y su participación." },
    { num: 26, text: "Me convoca a participar en espacios para la construcción de la visión institucional del colegio." },
    { num: 27, text: "Las rendiciones de cuentas que hace en el colegio son espacios de diálogo en los que podemos saber lo que se ha logrado y lo que falta por hacer." },
    { num: 28, text: "Reconoce sus fortalezas y lo que debe mejorar para comunicarse de manera clara, directa y comprensiva." },
    { num: 29, text: "Me invita a ser consciente de la responsabilidad que tengo en los procesos pedagógicos del colegio." },
    { num: 30, text: "Reconoce nuestra participación y nuestro aporte en la planeación institucional para definir las metas y los objetivos del colegio." },
    { num: 31, text: "Construye acuerdos conmigo para comunicarnos de manera clara, directa y cuidadosa." },
    { num: 32, text: "Entiende que todas las personas somos diferentes y que cuando lo aceptamos podemos mejorar la convivencia en la IE." },
    { num: 33, text: "Reconoce el potencial que su liderazgo y el de otros directivos tienen para generar el fortalecimiento de los procesos educativos e institucionales de mi territorio." },
    { num: 34, text: "Sabe lo que se le facilita y lo que se le dificulta para trabajar de manera colaborativa." },
    { num: 35, text: "Con los docentes y directivos docentes ha construido acuerdos en los que las diferencias individuales son tomadas como algo valioso e importante." },
    { num: 36, text: "Con su equipo de trabajo identifica posibilidades de intercambio con otras IE para fortalecer el aprendizaje y la convivencia." },
    { num: 37, text: "Realiza actividades donde estudiantes, docentes, administrativos, directivos y acudientes participamos de manera colaborativa." },
    { num: 38, text: "Ve en la evaluación una oportunidad para aprender y mejorar." },
    { num: 39, text: "Trabaja con directivos docentes de otras IE para fortalecer los procesos de planeación al interior de la institución educativa." },
  ],
  closingMessage: "Su opinión es muy importante. Gracias por su colaboración.",
};

// ══════════════════════════════════════════════════════════════
// AUTOEVALUACIÓN
// ══════════════════════════════════════════════════════════════
export const autoevaluacionConfig: SurveyFormConfig = {
  tipo: "autoevaluacion",
  title: "ENCUESTA DE 360° PONDERADA",
  subtitle: "INSTRUMENTO DE AUTOEVALUACIÓN",
  isAutoeval: true,
  intro: "Esta encuesta tiene como objetivo conocer la autopercepción sobre las competencias personales, pedagógicas, administrativas y comunitarias del directivo participante para identificar las áreas de potencial desarrollo que le permitirán mejorar su gestión como líder de la institución educativa.\n\nEn este instrumento no hay respuestas correctas o incorrectas ya que solo se indaga por su percepción y opinión acerca de su gestión como directivo docente. Le solicitamos que las respuestas que consigne aquí sean sinceras ya que serán un insumo importante para el mejoramiento continuo de su gestión y a la vez de la Institución Educativa (IE).",
  frequencyItems: [
    { num: 1, text: "Utilizo y promuevo espacios de reflexión con mi equipo de trabajo (entrevistas, encuestas, reuniones y otros) para reconocer fortalezas y aspectos por mejorar respecto a nuestros roles en la IE." },
    { num: 2, text: "Oriento con mi equipo de trabajo el desarrollo de los planes y proyectos pedagógicos del PEI." },
    { num: 3, text: "Con mi equipo de trabajo diseño estrategias para la construcción de la visión de la institución educativa." },
    { num: 4, text: "Promuevo espacios de reflexión para que todos los actores de la comunidad educativa identifiquen sus fortalezas y aspectos por mejorar." },
    { num: 5, text: "Convoco a acudientes, estudiantes, administrativos y docentes para hacer seguimiento y evaluación a las metas establecidas en el PEI." },
    { num: 6, text: "Diseño con mi equipo de trabajo estrategias de planeación participativa para el mejoramiento institucional." },
    { num: 7, text: "Manifiesto mis emociones y reconozco su influencia en mi relación con otros." },
    { num: 8, text: "Convoco a mi equipo de trabajo para hacer reflexiones pedagógicas que permitan fortalecer las prácticas de la IE." },
    { num: 9, text: "Utilizo estrategias para garantizar que docentes, estudiantes y acudientes participen en los procesos de planeación institucional." },
    { num: 10, text: "Realizo actividades con mi equipo de trabajo orientadas a identificar las emociones que tenemos y cómo estas influyen en el ambiente escolar." },
    { num: 11, text: "Construyo con acudientes, docentes, directivos, estudiantes y administrativos los acuerdos de convivencia de la IE." },
    { num: 12, text: "Identifico con mi equipo de trabajo la posibilidad de alianza con organizaciones, entidades, entre otros actores de mi territorio, para avanzar en la transformación institucional." },
    { num: 13, text: "Uso estrategias con mi equipo de trabajo para garantizar una comunicación clara, directa y cuidadosa." },
    { num: 14, text: "Me reúno con mi equipo de trabajo para revisar la pertinencia de los procesos de evaluación de docentes y de estudiantes en relación con los objetivos de la IE." },
    { num: 15, text: "Realizo con mi equipo de trabajo una estrategia integral de rendición de cuentas que incluye los resultados académicos, la gestión institucional y la ejecución de recursos." },
    { num: 16, text: "Implemento con mis equipos de trabajo principios y herramientas para trabajar de manera colaborativa." },
    { num: 17, text: "Convoco a la comunidad educativa para revisar y ajustar los procesos de evaluación institucional, de docentes y de estudiantes conforme a lo plasmado en el PEI." },
    { num: 18, text: "En el desarrollo de la rendición de cuentas, valoro la participación y tengo como referente los aportes de docentes, acudientes, estudiantes y administrativos." },
  ],
  agreementItems: [
    { num: 19, text: "Reconozco la posibilidad de realizar alianzas con otras organizaciones, entidades y demás actores para aportar al logro de los objetivos institucionales." },
    { num: 20, text: "Dedico tiempo para reconocer qué fortalezas y oportunidades de mejora tengo en mi gestión como directivo docente." },
    { num: 21, text: "Conozco qué tan pertinente es el PEI respecto a las necesidades y exigencias del contexto del colegio." },
    { num: 22, text: "Considero fundamental la visión de colegio y las expectativas que tienen estudiantes, docentes, acudientes y administrativos a la hora de determinar los objetivos de la IE y los procesos administrativos y pedagógicos." },
    { num: 23, text: "Establezco alianzas con organizaciones, entidades y otros actores para fortalecer los procesos institucionales." },
    { num: 24, text: "Llevo a cabo estrategias para que la comunidad educativa exprese sus emociones de manera oportuna, adecuada y cuidadosa." },
    { num: 25, text: "Reconozco que las prácticas y experiencias pedagógicas son actos transformadores, que producen saber y movilizan la participación de la comunidad educativa." },
    { num: 26, text: "Construyo con estudiantes, docentes, acudientes y administrativos una visión compartida que oriente la transformación institucional." },
    { num: 27, text: "Comprendo la rendición de cuentas como un espacio para dialogar con la comunidad educativa que permite vislumbrar avances y retos en la gestión institucional." },
    { num: 28, text: "Reconozco que tengo fortalezas y oportunidades de mejora para lograr comunicarme de manera clara, directa y comprensiva en el colegio." },
    { num: 29, text: "Promuevo en acudientes, estudiantes, administrativos y docentes la corresponsabilidad que cada uno tiene en los procesos pedagógicos de la IE." },
    { num: 30, text: "Considero que la participación y el involucramiento de la comunidad educativa en la planeación institucional conlleva al logro de los objetivos." },
    { num: 31, text: "Construyo acuerdos con la comunidad para comunicarnos de manera clara, directa y cuidadosa." },
    { num: 32, text: "Valoro las diferencias de las personas que hacen parte de la comunidad educativa como una oportunidad y una potencialidad para mejorar el ambiente escolar." },
    { num: 33, text: "Reconozco que mi liderazgo y el de mis pares permite el fortalecimiento de los procesos educativos institucionales y territoriales." },
    { num: 34, text: "Reconozco mis posibilidades y desafíos personales para trabajar de manera colaborativa." },
    { num: 35, text: "Construyo con mi equipo de trabajo acuerdos de convivencia en los que la diferencia se entiende como potencialidad." },
    { num: 36, text: "Con mis equipos de trabajo identifico cómo realizar intercambio de experiencias y saberes con otras IE para fortalecer el aprendizaje y la convivencia." },
    { num: 37, text: "Implemento principios y herramientas para trabajar de manera colaborativa en espacios de participación con estudiantes, docentes, acudientes y directivos." },
    { num: 38, text: "Entiendo la evaluación como un proceso que nos permite mejorar y aprender continuamente como institución educativa." },
    { num: 39, text: "Conformo redes con directivos de otras IE para fortalecer la planeación participativa al interior de la IE que lidero." },
  ],
  closingMessage: "Su opinión es muy importante. Gracias por su colaboración.",
};

// ══════════════════════════════════════════════════════════════
// ADMINISTRATIVO
// ══════════════════════════════════════════════════════════════
export const administrativoConfig: SurveyFormConfig = {
  tipo: "administrativo",
  title: "ENCUESTA DE 360° PONDERADA",
  subtitle: "INSTRUMENTO PARA ADMINISTRATIVOS",
  intro: "Esta encuesta tiene como objetivo conocer la percepción que tienen las personas que interactúan con el directivo sobre sus competencias personales, pedagógicas, administrativas y comunitarias. Los resultados de esta encuesta le permitirán al directivo participante identificar las áreas de potencial desarrollo que le permitirán mejorar su gestión como líder de la institución educativa.\n\nEn este instrumento no hay respuestas correctas o incorrectas ya que solo se indaga por su percepción y opinión acerca de la gestión del directivo docente de la institución educativa. Le solicitamos que las respuestas que consigne aquí sean sinceras, ya que serán un insumo importante para el mejoramiento continuo del directivo docente evaluado y, a la vez, de la Institución Educativa (IE).",
  frequencyItems: [
    { num: 1, text: "Se reúne con docentes y directivos docentes para reflexionar sobre sus fortalezas y lo que pueden mejorar desde su rol en el colegio." },
    { num: 2, text: "Se reúne con docentes, directivos docentes y administrativos para orientar el desarrollo de los planes y proyectos que tienen para el colegio." },
    { num: 3, text: "Con su equipo de trabajo diseña estrategias para la construcción de una visión institucional conjunta." },
    { num: 4, text: "Realiza actividades en las que puedo reflexionar sobre mis fortalezas y mis aspectos por mejorar como administrativo." },
    { num: 5, text: "Me invita a participar en espacios para hacer seguimiento y evaluación a las metas que se proponen en el PEI del colegio." },
    { num: 6, text: "Se reúne con sus docentes y directivos con el fin de diseñar estrategias de planeación para el mejoramiento institucional." },
    { num: 7, text: "Manifiesta sus emociones y reconoce el impacto que tienen en las relaciones que establece conmigo." },
    { num: 8, text: "Se reúne los docentes y directivos docentes para reflexionar sobre las transformaciones que se dan en el colegio." },
    { num: 9, text: "Me convoca a participar en espacios para tomar decisiones sobre la planeación institucional." },
    { num: 10, text: "Se reúne con docentes y directivos docentes para saber cómo manejar mejor sus emociones y así mejorar el ambiente escolar." },
    { num: 11, text: "Me invita a participar en la construcción de los acuerdos de convivencia del colegio." },
    { num: 12, text: "Se reúne con su equipo de trabajo para identificar con qué organizaciones, entidades y otros actores del territorio, se pueden aliar para avanzar en las mejoras que necesita el colegio." },
    { num: 13, text: "Su comunicación con docentes y directivos docentes es clara, directa y cuidadosa." },
    { num: 14, text: "Con los docentes y los directivos docentes revisan la pertinencia de la evaluación con los objetivos del colegio." },
    { num: 15, text: "En las rendiciones de cuentas del colegio muestra cómo le va los y las estudiantes, las actividades que se hacen en el colegio y el uso de los recursos que se tienen." },
    { num: 16, text: "Implementa conmigo y su equipo principios y herramientas para trabajar de manera colaborativa." },
    { num: 17, text: "Me convoca a participar en espacios para tomar decisiones sobre los procesos de evaluación que se llevan a cabo en el colegio." },
    { num: 18, text: "Realiza el proceso de rendición de cuentas incluyendo los procesos pedagógicos y administrativos de la IE." },
  ],
  agreementItems: [
    { num: 19, text: "Explora posibilidades de realizar alianzas con empresas, organizaciones, entre otros, con el fin de lograr las metas y logros que se proponen para mi colegio." },
    { num: 20, text: "Sabe qué fortalezas y oportunidades de mejora tiene en su gestión como directivo docente." },
    { num: 21, text: "Tiene claridad sobre las necesidades del territorio y si están relacionadas con lo que hace la IE." },
    { num: 22, text: "Considera importante nuestra visión institucional para determinar los objetivos, procesos administrativos y pedagógicos." },
    { num: 23, text: "Realiza alianzas con organizaciones, entidades y otros actores del territorio para avanzar en las mejoras que necesita el colegio." },
    { num: 24, text: "Me invita a participar en espacios donde puedo expresar mis emociones de manera oportuna, adecuada y respetuosa." },
    { num: 25, text: "Valora lo que el equipo docente hace en el colegio para transformar la vida de los y las estudiantes, mejorar sus aprendizajes y su participación." },
    { num: 26, text: "Me convoca a participar en espacios para la construcción de la visión institucional del colegio." },
    { num: 27, text: "Lidera espacios de diálogo en las rendiciones de cuentas para dar a conocer avances y retos en la gestión institucional." },
    { num: 28, text: "Reconoce sus fortalezas y lo que debe mejorar para comunicarse de manera clara, directa y comprensiva." },
    { num: 29, text: "Me invita a ser consciente de la responsabilidad que tengo en los procesos pedagógicos del colegio." },
    { num: 30, text: "Reconoce nuestra participación y nuestro aporte en la planeación institucional para definir las metas y los objetivos del colegio." },
    { num: 31, text: "Construye acuerdos conmigo para comunicarnos de manera clara, directa y cuidadosa." },
    { num: 32, text: "Entiende que todas las personas somos diferentes y que cuando lo aceptamos podemos mejorar la convivencia en la IE." },
    { num: 33, text: "Reconoce el potencial que su liderazgo y el de otros directivos tienen para generar el fortalecimiento de los procesos educativos e institucionales de mi territorio." },
    { num: 34, text: "Trabaja colaborativamente reconociendo sus posibilidades y sus desafíos personales." },
    { num: 35, text: "Con los docentes y directivos docentes ha construido acuerdos en los que las diferencias individuales son tomadas como algo valioso e importante." },
    { num: 36, text: "Con su equipo de trabajo identifica posibilidades de intercambio con otras IE para fortalecer el aprendizaje y la convivencia." },
    { num: 37, text: "Implementa principios y herramientas para trabajar de manera colaborativa en espacios de participación con estudiantes, docentes, acudientes y directivos." },
    { num: 38, text: "Ve en la evaluación una oportunidad para aprender y mejorar." },
    { num: 39, text: "Conforma redes con otros directivos para fortalecer la planeación participativa al interior de la institución educativa." },
  ],
  closingMessage: "Su opinión es muy importante. Gracias por su colaboración.",
};

/** Map form type to config */
export const FORM_CONFIGS: Record<string, SurveyFormConfig> = {
  docente: docenteConfig,
  estudiante: estudianteConfig,
  directivo: directivoConfig,
  acudiente: acudienteConfig,
  autoevaluacion: autoevaluacionConfig,
  administrativo: administrativoConfig,
};
