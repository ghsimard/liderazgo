// Mapa región → entidad territorial réelle (Antioquia pour Oriente, Chocó pour Quibdó)
export const entidadTerritorialPorRegion: Record<string, string> = {
  Oriente: "Antioquia",
  Quibdó: "Quibdó",
};

export const institucionesPorRegion: Record<string, string[]> = {
  Oriente: [
    "I.E. Ignacio Botero - El Retiro",
    "I.E. La Paz - La Ceja",
    "I.E.R. Campestre Nuevo Horizonte - El Carmen de Viboral",
    "I.E. El Progreso - El Carmen de Viboral",
    "I.E.R. Santa María - El Carmen de Viboral",
    "I.E.R. Obispo Emilio Botero - Marinilla",
    "CER Monseñor Francisco Luis Gómez - El Santuario",
    "CER José Ignacio Botero Palacio - El Santuario",
    "IE San Rafael - San Rafael",
    "IER Samaná - San Carlos",
    "IER La Josefina - San Carlos",
    "IER El Prodigio - San Luis",
    "CER Guamito - San Luis",
    "I.E.R SANTA ANA - El Peñol",
    "IER Chaparral - Granada",
    "IE San Vicente Ferrer - San Vicente",
  ],
  Quibdó: [
    "I.E. Santo Domingo Savio - Quibdó",
    "I.E. Normal Superior Antonio María Claret - Quibdó",
    "I.E. Técnico Agropecuario de Carmen de Atrato - Carmen de Atrato",
    "I.E. Agrícola de Carmen de Atrato - Carmen de Atrato",
    "I.E. Miguel Antonio Caicedo Mena - Río Quito",
    "I.E. Diocesano Pedro Grau y Arola - Quibdó",
    "I.E. Isaac Rodríguez Marín - Quibdó",
    "I.E. MIA Jorge Valencia Lozano - Quibdó",
    "I.E. José Martí - Carmen de Atrato",
    "I.E. Monte Carmelo - Quibdó",
    "I.E. Luis Carlos Gómez - Quibdó",
    "I.E. Comfachocó Santiago Quintero - Quibdó",
    "I.E. Gimnasio de Quibdó - Quibdó",
    "I.E. Normal Superior de Quibdó - Quibdó",
    "I.E. Armando Luna Roa - Quibdó",
    "I.E. María Inmaculada - Quibdó",
    "I.E. Técnico Industrial Gerardo Valencia Cano - Quibdó",
    "I.E. Benjamín Herrera - Bahía Solano",
    "I.E. Carrasquilla Industrial - Quibdó",
    "Centro Educativo Mingulos - Carmen de Atrato",
    "Centro Educativo El Vargadito - Medio Baudó",
    "Centro Educativo Bárbaro Luis Córdoba - Unión Panamericana",
    "I.E. Diego Luis Córdoba - Quibdó",
    "Centro Educativo Inmaculada Concepción - Carmen del Darién",
    "Centro Educativo José Antonio Velásquez del 21 - Quibdó",
  ],
};

// Extraire les municipios uniques d'une région depuis le nom des institutions (partie après " - ")
export function getMunicipiosPorRegion(region: string): string[] {
  const ies = institucionesPorRegion[region] ?? [];
  const municipios = ies.map((ie) => {
    const parts = ie.split(" - ");
    return parts[parts.length - 1].trim();
  });
  return [...new Set(municipios)].sort();
}

// Filtrer les institutions par municipio
export function getInstitucionesPorMunicipio(region: string, municipio: string): string[] {
  return (institucionesPorRegion[region] ?? []).filter((ie) =>
    ie.endsWith(` - ${municipio}`)
  );
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
