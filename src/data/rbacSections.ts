/** Catalogue of all RBAC sections and sub-sections */

export interface RbacSection {
  key: string;
  label: string;
  children?: { key: string; label: string }[];
}

export const RBAC_SECTIONS: RbacSection[] = [
  { key: "formularios", label: "Enlaces" },
  {
    key: "fichas-rlt",
    label: "Fichas de Información",
    children: [
      { key: "fichas-rlt.fichas", label: "Lista" },
      { key: "fichas-rlt.geography", label: "Configuración geográfica" },
      { key: "fichas-rlt.campos", label: "Campos y reglas" },
    ],
  },
  { key: "rubricas", label: "Rúbricas" },
  {
    key: "encuesta360",
    label: "Encuesta 360°",
    children: [
      { key: "encuesta360.formularios", label: "Formularios" },
      { key: "encuesta360.inicial", label: "Entrada" },
      { key: "encuesta360.final", label: "Salida" },
      { key: "encuesta360.invitaciones", label: "Invitaciones" },
      { key: "encuesta360.informes-inicial", label: "Informes Entrada" },
      { key: "encuesta360.informes-final", label: "Informes Salida" },
      { key: "encuesta360.configuracion", label: "Configuración" },
    ],
  },
  { key: "informe-modulo", label: "Informe de Módulo" },
  {
    key: "ambiente-escolar",
    label: "Ambiente Escolar",
    children: [
      { key: "ambiente-escolar.monitoreo", label: "Monitoreo" },
      { key: "ambiente-escolar.estadisticas", label: "Estadísticas" },
      { key: "ambiente-escolar.enlaces", label: "Enlaces" },
    ],
  },
  { key: "satisfacciones", label: "Satisfacciones" },
  { key: "certificaciones", label: "Certificaciones" },
  {
    key: "mel",
    label: "MEL",
    children: [
      { key: "mel.mel-360", label: "MEL 360°" },
      { key: "mel.mel-rubricas", label: "MEL Rúbricas" },
      { key: "mel.mel-config", label: "Configuración" },
    ],
  },
  {
    key: "sistema",
    label: "Sistema",
    children: [
      { key: "sistema.gestion-cuentas", label: "Cuentas" },
      { key: "sistema.roles-permisos", label: "Roles y Permisos" },
      { key: "sistema.activity-log", label: "Actividad" },
      { key: "sistema.papelera", label: "Papelera" },
      { key: "sistema.reviews", label: "Apreciaciones" },
      { key: "sistema.mensajes", label: "Mensajes" },
      { key: "sistema.changelog", label: "Changelog" },
      { key: "sistema.specs", label: "Especificaciones" },
      { key: "sistema.purge-data", label: "Purgar datos" },
    ],
  },
];

/** Flat list of all section keys */
export const ALL_SECTION_KEYS = RBAC_SECTIONS.flatMap((s) =>
  [s.key, ...(s.children?.map((c) => c.key) ?? [])]
);
