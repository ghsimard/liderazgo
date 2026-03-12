// ── Ambiente Escolar survey question definitions ──

export const FREQUENCY_OPTIONS = [
  "Siempre",
  "Casi siempre",
  "A veces",
  "Casi nunca",
  "Nunca",
] as const;

export const GRADOS_COMPLETOS = [
  "Primera infancia",
  "Preescolar",
  "1°", "2°", "3°", "4°", "5°",
  "6°", "7°", "8°", "9°",
  "10°", "11°", "12°",
];

export const GRADOS_ESTUDIANTE = [
  "5°", "6°", "7°", "8°", "9°", "10°", "11°", "12°",
];

export const JORNADA_OPTIONS = ["Mañana", "Tarde", "Noche", "Única"];

export const ANOS_OPTIONS = ["Menos de 1", "1", "2", "3", "4", "5", "Más de 5"];

export const FUENTES_RETROALIMENTACION = [
  "Rector/a",
  "Coordinador/a",
  "Otros/a docentes",
  "Acudientes",
  "Estudiantes",
  "Otros",
  "Ninguno",
];

export interface LikertItem {
  id: string;
  text: string;
}

export interface LikertSection {
  title: string;
  instruction: string;
  items: LikertItem[];
}

// ── ACUDIENTES ──
export const ACUDIENTES_LIKERT: LikertSection[] = [
  {
    title: "Comunicación",
    instruction: "Seleccione con qué frecuencia ocurren las siguientes situaciones",
    items: [
      { id: "com_1", text: "Los profesores tienen la disposición para hablar conmigo sobre los aprendizajes de los estudiantes en momentos adicionales a la entrega de notas." },
      { id: "com_2", text: "Los profesores promueven actividades para que apoye en su proceso de aprendizaje a los estudiantes que tengo a cargo." },
      { id: "com_3", text: "En el colegio se promueve mi participación en la toma de decisiones sobre las metas institucionales." },
      { id: "com_4", text: "En el colegio se hace reconocimiento público de las prácticas pedagógicas exitosas e innovadoras de los profesores." },
      { id: "com_5", text: "La comunicación que tengo con los directivos docentes del colegio es respetuosa y clara." },
      { id: "com_6", text: "En el colegio me siento escuchado/a y comprendida/o por los profesores, los directivos, los estudiantes y otros acudientes." },
    ],
  },
  {
    title: "Prácticas Pedagógicas",
    instruction: "Seleccione con qué frecuencia ocurren las siguientes situaciones",
    items: [
      { id: "ped_1", text: "A los estudiantes los llevan a lugares diferentes al salón para hacer sus clases (por ejemplo, la biblioteca, el laboratorio, el parque, el museo, el río, etc.)." },
      { id: "ped_2", text: "Los profesores demuestran que confían en los estudiantes y que creen en sus capacidades y habilidades." },
      { id: "ped_3", text: "Los profesores tienen en cuenta los intereses y necesidades de los estudiantes para escoger los temas que se van a tratar en clase." },
      { id: "ped_4", text: "Los profesores del colegio hacen las clases garantizando el derecho a la educación de los estudiantes que viven condiciones o situaciones especiales (por ejemplo, alguna discapacidad, que sean desplazados o que entraron tarde al curso)." },
      { id: "ped_5", text: "Cuando los profesores evalúan a los estudiantes tienen en cuenta su dimensión afectiva y emocional, además de la cognitiva y la comportamental." },
      { id: "ped_6", text: "El colegio organiza o participa en actividades como torneos, campeonatos, olimpiadas o ferias con otros colegios o instituciones." },
    ],
  },
  {
    title: "Convivencia",
    instruction: "Seleccione con qué frecuencia ocurren las siguientes situaciones",
    items: [
      { id: "conv_1", text: "Los estudiantes tratan con respeto a los profesores, directivos y administrativos del colegio." },
      { id: "conv_2", text: "En el colegio recibo apoyo para resolver los conflictos que se dan y generar aprendizajes a partir de estos." },
      { id: "conv_3", text: "En el colegio los estudiantes son respetuosos y solidarios entre ellos, comprendiendo y aceptando las creencias religiosas, el género, la orientación sexual, el grupo étnico y las capacidades o talentos de los demás." },
      { id: "conv_4", text: "Los profesores establecen acuerdos de convivencia con los estudiantes al comenzar el año escolar." },
      { id: "conv_5", text: "Mis opiniones, propuestas y sugerencias se tienen en cuenta cuando se construyen acuerdos de convivencia en el colegio." },
      { id: "conv_6", text: "En el colegio los estudiantes son tratados con respeto sin importar sus creencias religiosas, género, orientación sexual, grupo étnico y capacidades o talentos." },
    ],
  },
];

// ── ESTUDIANTES ──
export const ESTUDIANTES_LIKERT: LikertSection[] = [
  {
    title: "Comunicación",
    instruction: "Seleccione con qué frecuencia ocurren las siguientes situaciones",
    items: [
      { id: "com_1", text: "Mis profesores están dispuestos a hablar con mis acudientes sobre cómo me está yendo en el colegio, en momentos diferentes a la entrega de notas." },
      { id: "com_2", text: "En mi colegio reconocen públicamente las actividades y esfuerzos exitosos que hacen los profesores para que nosotros aprendamos." },
      { id: "com_3", text: "La comunicación que tengo con los directivos de mi colegio es respetuosa y clara." },
      { id: "com_4", text: "La comunicación entre mis profesores es respetuosa y clara." },
      { id: "com_5", text: "Mis profesores me dejan actividades para hacer en casa, las cuales necesitan el apoyo de mis acudientes." },
      { id: "com_6", text: "En mi colegio se promueve mi participación en la toma de decisiones sobre las metas institucionales." },
    ],
  },
  {
    title: "Prácticas Pedagógicas",
    instruction: "Seleccione con qué frecuencia ocurren las siguientes situaciones",
    items: [
      { id: "ped_1", text: "Los profesores me llevan a otros sitios fuera del salón o del colegio para hacer las clases (por ejemplo, la biblioteca, el laboratorio, el parque, el museo, el río, etc.)." },
      { id: "ped_2", text: "Los profesores tienen en cuenta mis intereses y afinidades para escoger lo que vamos a hacer en clase." },
      { id: "ped_3", text: "Los profesores trabajan juntos en proyectos para hacer actividades que nos ayudan a aprender más y mejor." },
      { id: "ped_4", text: "Mis profesores hacen las clases de manera que nos permiten aprender a todas y todos sin importar nuestras diferencias (discapacidad, situaciones familiares o sociales)." },
      { id: "ped_5", text: "Cuando mis profesores me evalúan tienen en cuenta mis emociones, además de mis aprendizajes y comportamiento." },
      { id: "ped_6", text: "Participamos en campeonatos deportivos, ferias y olimpiadas con otros colegios o instituciones." },
      { id: "ped_7", text: "Mis profesores logran hacer sus clases de manera fluida." },
      { id: "ped_8", text: "Mis profesores me demuestran que confían en mí y creen en mis habilidades y capacidades." },
    ],
  },
  {
    title: "Convivencia",
    instruction: "Seleccione con qué frecuencia ocurren las siguientes situaciones",
    items: [
      { id: "conv_1", text: "Mis compañeros y yo tratamos con respeto a los profesores, directivos y administrativos del colegio." },
      { id: "conv_2", text: "Mis compañeros y yo somos solidarios entre nosotros, respetando y aceptando las creencias religiosas, el género, la orientación sexual, el grupo étnico y las capacidades o talentos de los demás." },
      { id: "conv_3", text: "Mis profesores establecen conmigo y mis compañeros acuerdos de convivencia al comienzo del año." },
      { id: "conv_4", text: "Mis opiniones, propuestas y sugerencias se tienen en cuenta cuando se construyen acuerdos de convivencia en el colegio." },
      { id: "conv_5", text: "En el colegio mis compañeros y yo somos tratados con respeto sin importar nuestras creencias religiosas, género, orientación sexual, grupo étnico y capacidades o talentos." },
      { id: "conv_6", text: "En el colegio me siento escuchado/a y comprendido/a por los profesores, los directivos, los estudiantes y otros acudientes." },
      { id: "conv_7", text: "En el colegio recibo apoyo para resolver los conflictos que se dan y generar aprendizajes a partir de estos." },
    ],
  },
];

// ── DOCENTES ──
export const DOCENTES_LIKERT: LikertSection[] = [
  {
    title: "Comunicación",
    instruction: "Seleccione con qué frecuencia ocurren las siguientes situaciones",
    items: [
      { id: "com_1", text: "Tengo la disposición de dialogar con los acudientes sobre los aprendizajes de los estudiantes en momentos adicionales a la entrega de notas." },
      { id: "com_2", text: "Promuevo el apoyo de los acudientes al aprendizaje de los estudiantes, a través de actividades académicas y lúdicas para realizar en espacios fuera de la institución educativa." },
      { id: "com_3", text: "En el colegio se promueve mi participación en la toma de decisiones sobre las metas institucionales." },
      { id: "com_4", text: "En el colegio se hace reconocimiento público de nuestras prácticas pedagógicas exitosas e innovadoras." },
      { id: "com_5", text: "La comunicación que tengo con los directivos docentes del colegio es respetuosa y clara." },
      { id: "com_6", text: "La comunicación que tengo con otros docentes es asertiva." },
    ],
  },
  {
    title: "Prácticas Pedagógicas",
    instruction: "Seleccione con qué frecuencia ocurren las siguientes situaciones",
    items: [
      { id: "ped_1", text: "Utilizo diferentes espacios dentro y fuera del colegio como la biblioteca, el laboratorio o el parque para el desarrollo de mis clases." },
      { id: "ped_2", text: "Cuando preparo mis clases tengo en cuenta los intereses y necesidades de los estudiantes." },
      { id: "ped_3", text: "Me articulo con profesores de otras áreas y niveles para llevar a cabo proyectos pedagógicos que mejoren los aprendizajes de los estudiantes." },
      { id: "ped_4", text: "Logro cumplir los objetivos y el desarrollo que planeo para mis clases." },
      { id: "ped_5", text: "Desarrollo mis clases con enfoque diferencial para garantizar el derecho a la educación de todas y todos mis estudiantes, independiente de su entorno social, afectivo y sus capacidades físicas y cognitivas." },
      { id: "ped_6", text: "Cuando evalúo a mis estudiantes tengo en cuenta su dimensión afectiva y emocional, además de la cognitivas y comportamental." },
      { id: "ped_7", text: "Los profesores organizamos con otros colegios o instituciones actividades deportivas, académicas y culturales." },
      { id: "ped_8", text: "Demuestro a mis estudiantes que confío en ellos y que creo en sus capacidades y habilidades." },
    ],
  },
  {
    title: "Convivencia",
    instruction: "Seleccione con qué frecuencia ocurren las siguientes situaciones",
    items: [
      { id: "conv_1", text: "Los estudiantes me tratan con respeto a mí y a mis otros compañeros docentes, directivos y administrativos." },
      { id: "conv_2", text: "Mis estudiantes son respetuosos y solidarios entre ellos, comprendiendo y aceptando las creencias religiosas, el género, la orientación sexual, el grupo étnico y las capacidades o talentos de los demás." },
      { id: "conv_3", text: "Establezco con mis estudiantes acuerdos de convivencia al comenzar el año escolar." },
      { id: "conv_4", text: "Mis opiniones, propuestas y sugerencias se tienen en cuenta cuando se construyen acuerdos de convivencia en el colegio." },
      { id: "conv_5", text: "En el colegio mis estudiantes son tratados con respeto, independiente de sus creencias religiosas, género, orientación sexual, grupo étnico y capacidades o talentos de los demás." },
      { id: "conv_6", text: "En el colegio recibo apoyo para resolver los conflictos que surgen y generar aprendizajes a partir de estos." },
      { id: "conv_7", text: "En el colegio me siento escuchado/a y comprendido/a por otros docentes, los directivos, los estudiantes y los acudientes." },
    ],
  },
];

export const INTRO_TEXT = `Con el propósito de brindar insumos valiosos a los directivos docentes sobre su Institución Educativa y apoyar la identificación de retos y oportunidades de mejora, el Programa Rectores Líderes Transformadores y Coordinadores Líderes Transformadores ha diseñado la "Encuesta de Ambiente Escolar", centrada en tres aspectos clave: la comunicación, la convivencia y las prácticas pedagógicas.

Las respuestas de los participantes son fundamentales para generar información que permita a rectores y coordinadores fortalecer su gestión institucional y avanzar en procesos de transformación, sustentados en la toma de decisiones basada en datos.

La información recolectada será tratada de manera confidencial y utilizada exclusivamente con fines estadísticos y de mejoramiento continuo.`;

export const FORM_TITLES: Record<string, string> = {
  acudientes: "CUESTIONARIO PARA ACUDIENTES",
  estudiantes: "CUESTIONARIO PARA ESTUDIANTES",
  docentes: "CUESTIONARIO PARA DOCENTES",
};
