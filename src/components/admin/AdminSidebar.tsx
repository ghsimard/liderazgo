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
} from "lucide-react";
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
  linkUrl?: string; // renders as a copyable link instead of a tab
}

interface SidebarSection {
  label: string;
  icon: React.ElementType;
  items: SidebarItem[];
}

const topLevelItems: SidebarItem[] = [
  { tab: "formularios", label: "Enlaces", icon: Link2 },
];

const sections: SidebarSection[] = [
  {
    label: "Fichas RLT",
    icon: FolderOpen,
    items: [
      { tab: "enlace-ficha", label: "Enlace Ficha", icon: Link2, linkUrl: "https://884bdecf-dfd4-47e7-ac2b-4a0fa0ab7c80.lovableproject.com/" },
      { tab: "fichas", label: "Lista", icon: FileText },
      { tab: "geography", label: "Regiones", icon: MapPin },
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
      { tab: "enlaces360", label: "Formularios", icon: Link2 },
      { tab: "ponderaciones", label: "Configuración", icon: Settings2 },
      { tab: "encuestas360", label: "Inicial", icon: PlayCircle },
      { tab: "encuestas360final", label: "Final", icon: FlagTriangleRight },
      { tab: "invitaciones", label: "Invitaciones", icon: Users },
      { tab: "reportes360", label: "Informes Inicial", icon: FileBarChart },
      { tab: "reportes360final", label: "Informes Final", icon: FileBarChart2 },
    ],
  },
  {
    label: "Ambiente Escolar",
    icon: School,
    items: [
      { tab: "ambiente-escolar", label: "Encuestas", icon: School },
    ],
  },
  {
    label: "MEL",
    icon: TrendingUp,
    items: [
      { tab: "mel", label: "MEL", icon: TrendingUp },
    ],
  },
  {
    label: "Sistema",
    icon: Settings2,
    items: [
      { tab: "users", label: "Administradores", icon: Users },
      { tab: "activity-log", label: "Registro de Actividad", icon: Activity },
      { tab: "reviews", label: "Apreciaciones", icon: Star, superadminOnly: true },
      { tab: "mensajes", label: "Mensajes", icon: MessageSquare, superadminOnly: true },
      { tab: "changelog", label: "Changelog", icon: GitCommit, superadminOnly: true },
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
        {sections.map((section) => {
          const visibleItems = section.items.filter(
            (i) => !i.superadminOnly || isSuperAdmin
          );
          if (visibleItems.length === 0) return null;

          if (collapsed) {
            // When collapsed, show section icon that clicks to first visible item
            const SectionIcon = section.icon;
            const firstItem = visibleItems[0];
            const sectionActive = sectionContainsTab(section, activeTab);
            return (
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
          }

          const isOpen = sectionContainsTab(section, activeTab);

          return (
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
        })}
      </SidebarContent>
    </Sidebar>
  );
}
