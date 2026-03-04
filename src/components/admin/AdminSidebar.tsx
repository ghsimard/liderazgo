import { useState } from "react";
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
}

interface SidebarSection {
  label: string;
  copyUrl?: string;
  items: SidebarItem[];
}

const sections: SidebarSection[] = [
  {
    label: "Formularios",
    items: [
      { tab: "formularios", label: "Enlaces", icon: Link2 },
    ],
  },
  {
    label: "Fichas RLT",
    copyUrl: "https://884bdecf-dfd4-47e7-ac2b-4a0fa0ab7c80.lovableproject.com/",
    items: [
      { tab: "fichas", label: "Lista", icon: FileText },
      { tab: "geography", label: "Regiones", icon: MapPin },
    ],
  },
  {
    label: "Encuesta 360°",
    items: [
      { tab: "ponderaciones", label: "Configuración", icon: Settings2 },
      { tab: "encuestas360", label: "Inicial", icon: ClipboardList },
      { tab: "encuestas360final", label: "Final", icon: ClipboardList },
      { tab: "reportes360", label: "Informes Inicial", icon: BarChart3 },
      { tab: "reportes360final", label: "Informes Final", icon: BarChart3 },
    ],
  },
  {
    label: "Ambiente Escolar",
    items: [
      { tab: "ambiente-escolar", label: "Encuestas", icon: School },
    ],
  },
  {
    label: "Rúbricas",
    items: [
      { tab: "rubricas", label: "Rúbricas", icon: ClipboardList },
    ],
  },
  {
    label: "Análisis",
    items: [
      { tab: "mel", label: "MEL", icon: BarChart3 },
    ],
  },
  {
    label: "Sistema",
    items: [
      { tab: "users", label: "Administradores", icon: Users },
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
        {sections.map((section) => {
          const visibleItems = section.items.filter(
            (i) => !i.superadminOnly || isSuperAdmin
          );
          if (visibleItems.length === 0) return null;

          const isOpen = sectionContainsTab(section, activeTab);

          return (
            <Collapsible key={section.label} defaultOpen={isOpen}>
              <SidebarGroup>
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className="cursor-pointer select-none flex items-center justify-between pr-2 hover:bg-muted/50 rounded-md transition-colors">
                    <span>{section.label}</span>
                    <span className="flex items-center gap-1">
                      {!collapsed && section.copyUrl && (
                        <button
                          onClick={(e) => handleCopyUrl(e, section.copyUrl!, section.label)}
                          className="p-0.5 rounded hover:bg-muted/80 transition-colors"
                          title="Copiar enlace"
                        >
                          {copiedTab === section.label ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </button>
                      )}
                      {!collapsed && <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-0 group-data-[state=closed]:-rotate-90" />}
                    </span>
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {visibleItems.map((item) => {
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
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}
