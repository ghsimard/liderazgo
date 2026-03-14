import { useState } from "react";
import { Separator } from "@/components/ui/separator";
import {
  ClipboardList,
  FileText,
  MapPin,
  Settings2,
  BarChart3,
  Users,
  Star,
  MessageSquare,
  GitCommit,
  Link2,
  School,
  Copy,
  Check,
  FolderOpen,
  PlayCircle,
  FlagTriangleRight,
  FileBarChart,
  FileBarChart2,
  TrendingUp,
  ClipboardCheck,
  Gauge,
  Trash2,
  Activity,
  Printer,
  ThumbsUp,
  Award,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppImages } from "@/hooks/useAppImages";
import { generarPDFFichaEnBlanco } from "@/utils/blankFichaPdfGenerator";
import { generarPDFEncuesta360EnBlanco } from "@/utils/blankEncuesta360PdfGenerator";
import { generarPDFAmbienteEscolarEnBlanco } from "@/utils/blankAmbienteEscolarPdfGenerator";

import RegionPdfPicker from "@/components/admin/RegionPdfPicker";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

interface SidebarItem {
  tab: string;
  label: string;
  icon: React.ElementType;
  superadminOnly?: boolean;
  linkUrl?: string;
  action?: "blank-pdf" | "blank-360-docente" | "blank-360-estudiante" | "blank-360-directivo" | "blank-360-acudiente" | "blank-360-autoevaluacion" | "blank-360-administrativo" | "blank-rubrica" | "blank-ambiente-acudientes" | "blank-ambiente-estudiantes" | "blank-ambiente-docentes";
}

interface SidebarSection {
  label: string;
  icon: React.ElementType;
  items: SidebarItem[];
  separatorAfter?: boolean;
}

const topLevelItems: SidebarItem[] = [
  { tab: "formularios", label: "Enlaces", icon: Link2 },
];

const sections: SidebarSection[] = [
  {
    label: "Fichas de Información",
    icon: FolderOpen,
    items: [
      { tab: "fichas-rlt", label: "Fichas de Información", icon: FolderOpen },
    ],
  },
  {
    label: "Rúbricas",
    icon: ClipboardCheck,
    items: [
      { tab: "rubricas", label: "Rúbricas", icon: ClipboardCheck },
    ],
  },
  {
    label: "Encuesta 360°",
    icon: Gauge,
    items: [
      { tab: "encuesta360", label: "Encuesta 360°", icon: Gauge },
    ],
  },
  {
    label: "Informe de Módulo",
    icon: FileBarChart,
    items: [
      { tab: "informe-modulo", label: "Informe de Módulo", icon: FileBarChart },
    ],
  },
  {
    label: "Ambiente Escolar",
    icon: School,
    items: [
      { tab: "ambiente-escolar", label: "Ambiente Escolar", icon: School },
    ],
  },
  {
    label: "Satisfacciones",
    icon: ThumbsUp,
    items: [
      { tab: "satisfacciones", label: "Satisfacciones", icon: ThumbsUp },
    ],
  },
  {
    label: "Certificaciones",
    icon: Award,
    items: [
      { tab: "certificaciones", label: "Certificaciones", icon: Award },
    ],
  },
  {
    label: "MEL",
    icon: TrendingUp,
    items: [
      { tab: "mel", label: "MEL", icon: TrendingUp },
    ],
    separatorAfter: true,
  },
  {
    label: "Sistema",
    icon: Settings2,
    items: [
      { tab: "users", label: "Administradores", icon: Users },
      { tab: "activity-log", label: "Registro de Actividad", icon: Activity },
      { tab: "papelera", label: "Papelera", icon: Trash2 },
      { tab: "reviews", label: "Apreciaciones", icon: Star, superadminOnly: true },
      { tab: "mensajes", label: "Mensajes", icon: MessageSquare, superadminOnly: true },
      { tab: "changelog", label: "Changelog", icon: GitCommit, superadminOnly: true },
      { tab: "purge-data", label: "Purgar datos", icon: Trash2, superadminOnly: true },
    ],
  },
];

function sectionContainsTab(section: SidebarSection, tab: string) {
  return section.items.some((i) => i.tab === tab);
}

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isSuperAdmin: boolean;
}

export default function AdminSidebar({ activeTab, onTabChange, isSuperAdmin }: AdminSidebarProps) {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const { images } = useAppImages();
  const { toast } = useToast();

  const handleTabClick = (tab: string) => {
    onTabChange(tab);
    if (isMobile) setOpenMobile(false);
  };

  const handleCopyUrl = (e: React.MouseEvent, url: string, label: string) => {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard.writeText(url);
    setCopiedTab(label);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  const handleBlankPdf = () => {
    setPendingAction("blank-pdf");
    setPickerOpen(true);
  };

  const handleBlankAction = (action: string) => {
    setPendingAction(action);
    setPickerOpen(true);
  };

  const handleRegionConfirm = async (flags: { showLogoRlt: boolean; showLogoClt: boolean }) => {
    if (!pendingAction || generatingPdf) return;
    setGeneratingPdf(true);
    const logos = {
      logoRLT: images.logo_rlt_white,
      logoCLTDark: images.logo_clt_white,
      logoCosmo: images.logo_cosmo,
    };
    try {
      if (pendingAction === "blank-pdf") {
        await generarPDFFichaEnBlanco(logos, flags);
      } else if (pendingAction.startsWith("blank-ambiente-")) {
        const ambienteType = pendingAction.replace("blank-ambiente-", "") as "acudientes" | "estudiantes" | "docentes";
        await generarPDFAmbienteEscolarEnBlanco(ambienteType, logos, flags);
      } else if (pendingAction.startsWith("blank-360-")) {
        const formType = pendingAction.replace("blank-360-", "");
        await generarPDFEncuesta360EnBlanco(formType, logos, flags);
      }
      toast({ title: "PDF generado", description: "Le formulaire en blanc a été téléchargé." });
      setPickerOpen(false);
      setPendingAction(null);
    } catch (err) {
      toast({ title: "Error", description: "No se pudo generar el PDF.", variant: "destructive" });
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {topLevelItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.tab;
                return (
                  <SidebarMenuItem key={item.tab}>
                    <SidebarMenuButton
                      onClick={() => handleTabClick(item.tab)}
                      isActive={active}
                      tooltip={item.label}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <Separator className="mx-2 my-1" />
        {sections.map((section, idx) => {
          const visibleItems = section.items.filter(
            (i) => !i.superadminOnly || isSuperAdmin
          );
          if (visibleItems.length === 0) return null;

          let rendered: React.ReactNode;
          const isSingleItem = visibleItems.length === 1;

          if (collapsed) {
            const SectionIcon = section.icon;
            const firstItem = visibleItems[0];
            const sectionActive = sectionContainsTab(section, activeTab);
            rendered = (
              <SidebarGroup key={section.label}>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => handleTabClick(firstItem.tab)}
                        isActive={sectionActive}
                        tooltip={section.label}
                      >
                        <SectionIcon className="h-4 w-4 shrink-0" />
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          } else if (isSingleItem) {
            const item = visibleItems[0];
            const Icon = item.icon;
            const active = activeTab === item.tab;
            rendered = (
              <SidebarGroup key={section.label}>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => item.action ? handleBlankAction(item.action) : handleTabClick(item.tab)}
                        isActive={active}
                        tooltip={section.label}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{section.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          } else {
            const isOpen = sectionContainsTab(section, activeTab);
            rendered = (
              <Collapsible key={section.label} defaultOpen={isOpen}>
                <SidebarGroup>
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel className="cursor-pointer select-none flex items-center justify-between pr-2 hover:bg-muted/50 rounded-md transition-colors">
                      <span>{section.label}</span>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-0 group-data-[state=closed]:-rotate-90" />
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {visibleItems.map((item) => {
                          const Icon = item.icon;
                          if (item.linkUrl) {
                            return (
                              <SidebarMenuItem key={item.tab}>
                                <SidebarMenuButton
                                  asChild
                                  tooltip={item.label}
                                  className="cursor-pointer"
                                >
                                  <a href={item.linkUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                                    <Icon className="h-4 w-4 shrink-0" />
                                    <span className="flex items-center gap-1.5 flex-1">
                                      {item.label}
                                      <button
                                        onClick={(e) => handleCopyUrl(e, item.linkUrl!, item.tab)}
                                        className="ml-auto p-0.5 rounded hover:bg-muted/80 transition-colors"
                                        title="Copiar enlace"
                                      >
                                        {copiedTab === item.tab ? (
                                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                                        ) : (
                                          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                                        )}
                                      </button>
                                    </span>
                                  </a>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            );
                          }
                          if (item.action) {
                            return (
                              <SidebarMenuItem key={item.tab}>
                                <SidebarMenuButton
                                  onClick={() => handleBlankAction(item.action!)}
                                  tooltip={item.label}
                                  className="cursor-pointer"
                                >
                                  <Icon className="h-4 w-4 shrink-0" />
                                  <span>{generatingPdf ? "Generando…" : item.label}</span>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            );
                          }
                          const active = activeTab === item.tab;
                          return (
                            <SidebarMenuItem key={item.tab}>
                              <SidebarMenuButton
                                onClick={() => handleTabClick(item.tab)}
                                isActive={active}
                                tooltip={item.label}
                              >
                                <Icon className="h-4 w-4 shrink-0" />
                                <span>{item.label}</span>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        })}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            );
          }

          return section.separatorAfter ? (
            <div key={section.label}>
              {rendered}
              <Separator className="mx-2 my-1" />
            </div>
          ) : <div key={section.label}>{rendered}</div>;
        })}
      </SidebarContent>
      <RegionPdfPicker
        open={pickerOpen}
        onOpenChange={(v) => { setPickerOpen(v); if (!v) setPendingAction(null); }}
        onConfirm={handleRegionConfirm}
        loading={generatingPdf}
      />
    </Sidebar>
  );
}
