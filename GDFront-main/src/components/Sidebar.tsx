import React, { useMemo, useCallback, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { FaHome, FaUsers, FaCogs, FaSignOutAlt, FaBars, FaTimes } from "react-icons/fa";
import clsx from "clsx";
import axios from "axios";

/* ========= Helpers locales tipadas para obtener el usuario ========= */
type StoredUser = {
  id: number;
  nombreUsuario: string;
  email: string;
  nivel: string;
  isAdmin: boolean;
};

type JwtPayload = {
  id: number;
  email: string;
  nivel: string;
  isAdmin: boolean;
  nombreUsuario?: string;
  exp?: number;
  iat?: number;
};

const Sidebar: React.FC<{
  isOpen: boolean;
  toggleSidebar: () => void;
  onLogout?: () => void;
  isMobile: boolean;
}> = ({ isOpen, toggleSidebar, onLogout, isMobile }) => {
  // Mover las funciones helper DENTRO del componente
  const getStoredUser = (): StoredUser | null => {
    const raw = localStorage.getItem("user") ?? sessionStorage.getItem("user");
    if (!raw) return null;
    try { 
      return JSON.parse(raw) as StoredUser; 
    } catch { 
      return null; 
    }
  };

  const getToken = (): string | null =>
    localStorage.getItem("auth_token") ?? sessionStorage.getItem("auth_token");

  const decodeJwt = (token: string | null): JwtPayload | null => {
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    try {
      const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
      return JSON.parse(json) as JwtPayload;
    } catch { 
      return null; 
    }
  };

  const getDisplayName = (): string => {
    const u = getStoredUser();
    if (u?.nombreUsuario) return u.nombreUsuario;
    const jwt = decodeJwt(getToken());
    if (jwt?.nombreUsuario) return jwt.nombreUsuario;
    if (u?.email) return u.email.split("@")[0];
    if (jwt?.email) return jwt.email.split("@")[0];
    return "Usuario";
  };

  const getInitials = (name: string): string => {
    const p = name.trim().split(/\s+/);
    const out = ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
    return out || (name[0]?.toUpperCase() ?? "U");
  };

  // Usar las funciones en los useMemo
  const name = useMemo(() => getDisplayName(), []);
  const initials = useMemo(() => getInitials(name), [name]);
  const navigate = useNavigate();
  const location = useLocation();

  // Cerrar sidebar en móvil al navegar - CORREGIDO
  useEffect(() => {
    if (isMobile && isOpen) {
      console.log('Cerrando sidebar por navegación en móvil');
      toggleSidebar();
    }
  }, [location.pathname]); // Solo dependencia de location.pathname

  // === Axios + Vite API URL ===
  const API_URL = import.meta.env.VITE_API_URL as string;
  const api = useMemo(
    () => axios.create({ baseURL: API_URL, withCredentials: true }),
    [API_URL]
  );

  const handleLogout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Si falla igual limpiamos el lado cliente
    } finally {
      try {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user");
        sessionStorage.removeItem("auth_token");
        sessionStorage.removeItem("user");
      } catch {}
      
      try {
        localStorage.setItem("app:logout", String(Date.now()));
      } catch {}
      
      navigate("/login", { replace: true });
    }
  }, [api, navigate]);

  const menuItems = [
    { to: "/dashboard", icon: <FaHome />, label: "Dashboard" },
    { to: "/registro", icon: <FaUsers />, label: "Registro de usuarios" },
    { to: "/usuarios", icon: <FaUsers />, label: "Usuarios" },
    { to: "/settings", icon: <FaCogs />, label: "Configuración" },
  ];

  // Componente Item interno para evitar problemas de scope
  const Item: React.FC<{
    to: string;
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
  }> = ({ to, icon, label, onClick }) => (
    <NavLink
      to={to}
      title={(!isOpen && !isMobile) ? label : undefined}
      onClick={onClick}
      className={({ isActive }) =>
        clsx(
          "group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all duration-200",
          "hover:bg-white/10 hover:scale-105 active:scale-95",
          isActive 
            ? "bg-white/15 ring-1 ring-white/15 shadow-lg" 
            : "text-zinc-200 hover:text-white",
          isMobile ? "py-4" : "py-2"
        )
      }
    >
      <span
        className={clsx(
          "absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full transition-all",
          "h-6 w-1 bg-emerald-400",
          "[&[aria-current]]:opacity-100 opacity-0"
        )}
        aria-hidden
      />
      <span className={clsx(
        "text-zinc-100 transition-transform",
        isMobile ? "text-lg" : "text-base"
      )}>{icon}</span>
      {(isOpen || isMobile) && (
        <span className={clsx(
          "text-zinc-50 font-medium transition-all",
          isMobile ? "text-base" : "text-sm"
        )}>{label}</span>
      )}
    </NavLink>
  );

  return (
    <>
      {/* Overlay para móvil - SOLO cuando está abierto en móvil */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40",
          "transition-all duration-300 ease-in-out",
          "bg-zinc-900/95 backdrop-blur-xl border-r border-white/10",
          isMobile
            ? clsx(
                "w-64 transform",
                isOpen ? "translate-x-0" : "-translate-x-full"
              )
            : clsx(
                isOpen ? "w-64" : "w-20"
              )
        )}
        aria-label="Sidebar principal"
      >
        <div className="relative flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className={clsx(
              "flex items-center gap-3 transition-all duration-300",
              (!isOpen && !isMobile) && "justify-center"
            )}>
              <div className={clsx(
                "overflow-hidden rounded-xl bg-white",
                (!isOpen && !isMobile) ? "h-8 w-8" : "h-10 w-10"
              )}>
                <img
                  src="/login/LOGO2.jpg"
                  alt="Logo"
                  className="h-full w-full object-cover"
                />
              </div>
              {(isOpen || isMobile) && (
                <div className={clsx("transition-opacity duration-300")}>
                  <h1 className="text-white font-bold text-lg">GDIAMOND</h1>
                </div>
              )}
            </div>

            {/* Botón cerrar/toggle - Siempre visible en desktop, solo cuando está abierto en móvil */}
            {(isOpen || !isMobile) && (
              <button
                onClick={toggleSidebar}
                className={clsx(
                  "p-2 rounded-lg transition-all duration-200",
                  "text-white hover:bg-white/10 active:scale-95",
                  isMobile ? "bg-red-500/20 hover:bg-red-500/30" : "bg-zinc-800/60"
                )}
                aria-label={isMobile ? "Cerrar menú" : "Alternar sidebar"}
              >
                {isMobile ? <FaTimes className="text-lg" /> : (
                  <span className="text-lg font-bold">
                    {isOpen ? "«" : "»"}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Navegación */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            {/* Sección General */}
            {(isOpen || isMobile) && (
              <div className="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-400/80">
                General
              </div>
            )}

            <ul className="space-y-1">
              {menuItems.map((item) => (
                <li key={item.to}>
                  <Item 
                    to={item.to} 
                    icon={item.icon} 
                    label={item.label}
                    onClick={isMobile ? toggleSidebar : undefined}
                  />
                </li>
              ))}
            </ul>

            <div className="my-4 h-px w-full bg-white/10" />

            {/* Sección Sesión */}
            {(isOpen || isMobile) && (
              <div className="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-400/80">
                Sesión
              </div>
            )}

            <button
              onClick={onLogout ?? handleLogout}
              title={(!isOpen && !isMobile) ? "Cerrar sesión" : undefined}
              className={clsx(
                "mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm",
                "text-red-300 hover:bg-red-500/10 hover:text-red-200",
                "transition-all duration-200 hover:scale-105 active:scale-95",
                isMobile ? "py-4 text-base" : "py-2 text-sm"
              )}
            >
              <FaSignOutAlt className={clsx(isMobile ? "text-lg" : "text-base")} />
              {(isOpen || isMobile) && <span>Cerrar sesión</span>}
            </button>
          </nav>

          {/* Footer - Información del usuario */}
          <div className="border-t border-white/10 p-3">
            <div
              className={clsx(
                "flex items-center gap-3 rounded-xl bg-white/5 ring-1 ring-white/10",
                "p-3 transition-all duration-200",
                (!isOpen && !isMobile) ? "justify-center" : ""
              )}
              title={(!isOpen && !isMobile) ? name : undefined}
            >
              <div className={clsx(
                "grid place-items-center rounded-lg bg-emerald-400/20 text-emerald-200 ring-1 ring-emerald-300/30",
                "flex-shrink-0",
                (!isOpen && !isMobile) ? "h-8 w-8" : "h-9 w-9"
              )}>
                <span className={clsx(
                  "font-bold",
                  (!isOpen && !isMobile) ? "text-xs" : "text-sm"
                )}>
                  {initials}
                </span>
              </div>

              {(isOpen || isMobile) && (
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-white">{name}</div>
                  <div className="truncate text-xs text-emerald-200/80">
                    {getStoredUser()?.nivel ?? "Usuario"}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Botón hamburguesa para móvil - SOLO cuando está cerrado en móvil */}
      {isMobile && !isOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-50 p-3 bg-zinc-900/90 rounded-lg text-white md:hidden shadow-lg"
          aria-label="Abrir menú"
        >
          <FaBars className="text-xl" />
        </button>
      )}
    </>
  );
};

export default Sidebar;