import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router";
import { useAuth } from "@/react-app/contexts/AuthContext";
import {
  LayoutDashboard,
  Package,
  FlaskConical,
  Scale,
  Workflow,
  Factory,
  Wind,
  Split,
  ScrollText,
  CheckCircle,
  Box,
  Kanban,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  path: string;
  icon: any;
  label: string;
}

interface NavSection {
  id: string;
  icon: any;
  label: string;
  items: NavItem[];
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const toggleSection = (sectionId: string) => {
    if (isCollapsed) return;
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  // Simple nav items (no children)
  const simpleNavItems: NavItem[] = [
    { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/gerenciamento", icon: BarChart3, label: "Gerenciamento" },
    { path: "/pcp", icon: Kanban, label: "PCP" },
    { path: "/almoxarifado", icon: Package, label: "Almoxarifado" },
    { path: "/laboratorio", icon: FlaskConical, label: "Laboratório" },
    { path: "/pesagem", icon: Scale, label: "Pesagem" },
  ];

  // Collapsible sections
  const navSections: NavSection[] = [
    {
      id: "preparacao",
      icon: Workflow,
      label: "Preparação",
      items: [
        { path: "/preparacao", icon: Workflow, label: "Preparação" },
        { path: "/preparacao-lote", icon: Workflow, label: "Lote" },
      ]
    },
    {
      id: "producao",
      icon: Factory,
      label: "Produção",
      items: [
        { path: "/producao", icon: Box, label: "Box 1, 2, 3" },
        { path: "/box4", icon: Box, label: "Box 4" },
        { path: "/box5", icon: Box, label: "Box 5" },
        { path: "/box6", icon: Box, label: "Box 6" },
      ]
    },
  ];

  // Items after collapsible sections
  const bottomNavItems: NavItem[] = [
    { path: "/secadora", icon: Wind, label: "Secadora" },
    { path: "/destrinchagem", icon: Split, label: "Destrinchagem" },
    { path: "/enrolagem", icon: ScrollText, label: "Enrolagem" },
    { path: "/qualidade", icon: CheckCircle, label: "Qualidade" },
    { path: "/qualidade-malhas", icon: CheckCircle, label: "Qual. Malhas" },
    { path: "/admin", icon: Settings, label: "Admin" },
    { path: "/configuracoes", icon: Settings, label: "Configurações" },
  ];

  const renderNavItem = (item: NavItem, isSubItem = false) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;
    
    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={() => setIsSidebarOpen(false)}
        title={isCollapsed ? item.label : undefined}
        className={`group relative flex items-center rounded-lg transition-all duration-200 ${
          isCollapsed 
            ? "justify-center p-1.5" 
            : isSubItem 
              ? "pl-10 pr-3 py-1.5 space-x-2" 
              : "px-3 py-2 space-x-3"
        } ${
          isActive
            ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-900/30"
            : "hover:bg-red-900/60 text-red-100"
        }`}
      >
        {!isSubItem && <Icon className={`${isCollapsed ? "w-4 h-4" : "w-4 h-4"} flex-shrink-0`} />}
        {!isCollapsed && <span className="font-medium text-sm">{item.label}</span>}
        
        {/* Tooltip for collapsed mode */}
        {isCollapsed && (
          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-lg">
            {item.label}
          </div>
        )}
      </Link>
    );
  };

  const renderSection = (section: NavSection) => {
    const Icon = section.icon;
    const isExpanded = expandedSections.includes(section.id);
    const hasActiveChild = section.items.some(item => location.pathname === item.path);
    
    if (isCollapsed) {
      // In collapsed mode, show as dropdown on hover
      return (
        <div key={section.id} className="relative group">
          <button
            className={`w-full flex items-center justify-center p-1.5 rounded-lg transition-all duration-200 ${
              hasActiveChild 
                ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-900/30" 
                : "text-red-100 hover:bg-red-900/60"
            }`}
          >
            <Icon className="w-4 h-4" />
          </button>
          
          {/* Dropdown menu for collapsed mode */}
          <div className="absolute left-full top-0 ml-2 py-2 bg-red-950 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 min-w-40 z-50 shadow-xl border border-red-900">
            <div className="px-3 py-1 text-xs font-semibold text-red-300 uppercase tracking-wide">
              {section.label}
            </div>
            {section.items.map(item => {
              const ItemIcon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center space-x-2 px-3 py-2 transition-colors ${
                    isActive
                      ? "bg-red-700 text-white"
                      : "text-red-100 hover:bg-red-900"
                  }`}
                >
                  <ItemIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      );
    }
    
    return (
      <div key={section.id}>
        <button
          onClick={() => toggleSection(section.id)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 ${
            hasActiveChild 
              ? "bg-red-900/40 text-white" 
              : "text-red-100 hover:bg-red-900/60"
          }`}
        >
          <div className="flex items-center space-x-3">
            <Icon className="w-4 h-4" />
            <span className="font-medium text-sm">{section.label}</span>
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-0" : "-rotate-90"}`} />
        </button>
        <div className={`overflow-hidden transition-all duration-200 ${isExpanded ? "max-h-40 mt-1" : "max-h-0"}`}>
          <div className="space-y-0.5">
            {section.items.map(item => renderNavItem(item, true))}
          </div>
        </div>
      </div>
    );
  };

  const sidebarWidth = isCollapsed ? "w-16" : "w-52";
  const mainMargin = isCollapsed ? "lg:ml-16" : "lg:ml-52";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-red-950 text-white px-4 py-3 flex items-center justify-between z-50 shadow-lg">
        <h1 className="text-xl font-bold">Colortim</h1>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 hover:bg-red-900 rounded-lg transition-colors"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-red-950 text-white ${sidebarWidth} transform transition-all duration-300 z-40 flex flex-col ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 shadow-2xl`}
      >
        {/* Header */}
        <div className={`border-b border-red-900/50 flex-shrink-0 ${isCollapsed ? "p-2" : "p-4"}`}>
          <div className="flex items-center justify-between">
            {isCollapsed ? (
              <div className="flex justify-center w-full">
                <div className="w-7 h-7 bg-gradient-to-br from-red-500 to-red-700 rounded-lg flex items-center justify-center font-bold text-xs shadow-lg">
                  C
                </div>
              </div>
            ) : (
              <div className="flex-1">
                <h1 className="text-xl font-bold">Colortim</h1>
                <p className="text-red-300 text-xs mt-0.5">Gestão de Produção</p>
              </div>
            )}
            
            {/* Collapse Button - Desktop only */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`hidden lg:flex items-center justify-center w-7 h-7 rounded-md hover:bg-red-900/60 transition-all duration-200 text-red-300 hover:text-white ${
                isCollapsed ? "absolute right-1 top-4" : ""
              }`}
              title={isCollapsed ? "Expandir menu" : "Recolher menu"}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 ${isCollapsed ? "overflow-hidden" : "overflow-y-auto"} ${isCollapsed ? "py-1 px-2 space-y-0.5" : "py-2 px-2 space-y-1"} border-0`}>
          {simpleNavItems.map(item => renderNavItem(item))}
          
          <div className="my-2 border-t border-red-900/30" />
          
          {navSections.map(section => renderSection(section))}
          
          {bottomNavItems.map(item => renderNavItem(item))}
        </nav>

        {/* Footer */}
        <div className={`flex-shrink-0 border-0 ${isCollapsed ? "p-1.5" : "p-3"}`}>
          {/* User info */}
          {!isCollapsed && (
            <div className="mb-2 px-1">
              <p className="text-xs text-red-300">Conectado como</p>
              <p className="text-sm font-medium truncate">{user?.name}</p>
            </div>
          )}
          
          {/* Logout button */}
          <button
            onClick={logout}
            title={isCollapsed ? "Sair" : undefined}
            className={`group relative w-full flex items-center rounded-lg hover:bg-red-900/60 transition-all duration-200 text-red-200 hover:text-white ${
              isCollapsed ? "justify-center p-1.5" : "px-3 py-2 space-x-3"
            }`}
          >
            <LogOut className={`${isCollapsed ? "w-4 h-4" : "w-4 h-4"}`} />
            {!isCollapsed && <span className="font-medium text-sm">Sair</span>}
            
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-lg">
                Sair
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className={`${mainMargin} pt-16 lg:pt-0 h-screen lg:h-screen transition-all duration-300 overflow-hidden`}>
        <div className="h-full p-4 md:p-6 overflow-auto">{children}</div>
      </main>
    </div>
  );
}
