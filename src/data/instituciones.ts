// Mapa región → entidad territorial réelle (Antioquia pour Oriente, Chocó pour Quibdó)
export const entidadTerritorialPorRegion: Record<string, string> = {
  Oriente: "Antioquia",
  Quibdó: "Quibdó",
};

export const institucionesPorRegion: Record<string, string[]> = {
  Oriente: [
    "Institución Educativa Ignacio Botero - El Retiro",
    "Institución Educativa La Paz - La Ceja",
    "Institución Educativa Rural Campestre Nuevo Horizonte - El Carmen de Viboral",
    "Institución Educativa El Progreso - El Carmen de Viboral",
    "Institución Educativa Rural Santa María - El Carmen de Viboral",
    "Institución Educativa Rural Obispo Emilio Botero - Marinilla",
    "Centro Educativo Rural Monseñor Francisco Luis Gómez - El Santuario",
    "Centro Educativo Rural José Ignacio Botero Palacio - El Santuario",
    "Institución Educativa San Rafael - San Rafael",
    "Institución Educativa Rural Samaná - San Carlos",
    "Institución Educativa Rural La Josefina - San Carlos",
    "Institución Educativa Rural El Prodigio - San Luis",
    "Centro Educativo Rural Guamito - San Luis",
    "Institución Educativa Rural Santa Ana - El Peñol",
    "Institución Educativa Rural Chaparral - Granada",
    "Institución Educativa San Vicente Ferrer - San Vicente",
  ],
  Quibdó: [
    "Institución Educativa Santo Domingo Savio",
    "Institución Educativa Normal Superior Manuel Cañizales",
    "Institución Educativa Técnica Antonio Ricaurte",
    "Institución Educativa Técnica Agropecuaria de Tagachi",
    "Institución Educativa Técnica Agroecológica Cristo Rey de Tutunendo",
    "Institución Educativa Miguel Antonio Caicedo Mena - Obapo",
    "Institución Educativa Diocesano Pedro Grau y Arola",
    "Institución Educativa Isaac Rodríguez Martínez",
    "Institución Educativa MIA Rogerio Velásquez Murillo",
    "Institución Educativa MIA Jorge Valencia",
    "Institución Educativa José del Carmén Cuesta Rentería",
    "Institución Educativa Manuel Agustín Santacoloma Villa",
    "Institución Educativa Santo Domingo de Guzmán",
    "Institución Educativa Gimnasio de Quibdó",
    "Institución Educativa Normal Superior de Quibdó",
    "Institución Educativa Armando Luna Roa",
    "Institución Educativa Antonio María Claret",
    "Institución Educativa Técnico Integrado Carrasquilla Industrial",
    "Institución Educativa Feminina de Enseñanza Media",
    "Centro Educativo Munguido",
    "Centro Educativo Diego Luis Córdoba",
    "Centro Educativo El Barranco",
    "Centro Educativo Indígena Emberá Alfonso Dumasa de Caimanero de Jampapa",
    "Centro Educativo José Melanio Tunay del 21",
    "Centro Educativo José Antonio Velásquez del 20",
  ],
};

// Formater le nom d'une IE : remplacer les abréviations par les noms complets
export function formatIEName(name: string): string {
  return name
    .replace(/^I\.E\.R\.\s+/, "Institución Educativa Rural ")
    .replace(/^I\.E\.R\s+/, "Institución Educativa Rural ")
    .replace(/^IER\s+/, "Institución Educativa Rural ")
    .replace(/^I\.E\.\s+/, "Institución Educativa ")
    .replace(/^IE\s+/, "Institución Educativa ")
    .replace(/^CER\s+/, "Centro Educativo Rural ");
}

// Extraire les municipios uniques d'une région — uniquement pour les institutions qui ont un suffixe " - Municipio"
export function getMunicipiosPorRegion(region: string): string[] {
  const ies = institucionesPorRegion[region] ?? [];
  const municipios = ies
    .filter((ie) => ie.includes(" - "))
    .map((ie) => {
      const parts = ie.split(" - ");
      return parts[parts.length - 1].trim();
    });
  return [...new Set(municipios)].sort();
}

// Filtrer les institutions par municipio
export function getInstitucionesPorMunicipio(region: string, municipio: string): string[] {
  return (institucionesPorRegion[region] ?? []).filter((ie) => ie.endsWith(` - ${municipio}`));
}

export const entidadesTerritorialesColombia = [
  "Amazonas",
  "Antioquia",
  "Arauca",
  "Atlántico",
  "Barranquilla",
  "Bogotá D.C.",
  "Bolívar",
  "Boyacá",
  "Bucaramanga",
  "Caldas",
  "Cali",
  "Caquetá",
  "Cartagena",
  "Cauca",
  "Cesar",
  "Chocó",
  "Córdoba",
  "Cundinamarca",
  "Cúcuta",
  "Huila",
  "Ibagué",
  "La Guajira",
  "Magdalena",
  "Manizales",
  "Medellín",
  "Meta",
  "Nariño",
  "Norte de Santander",
  "Pasto",
  "Pereira",
  "Putumayo",
  "Quindío",
  "Risaralda",
  "San Andrés y Providencia",
  "Santa Marta",
  "Santander",
  "Sincelejo",
  "Sucre",
  "Tolima",
  "Valle del Cauca",
  "Vaupés",
  "Vichada",
  "Villavicencio",
];
