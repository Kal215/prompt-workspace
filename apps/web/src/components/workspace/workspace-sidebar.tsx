"use client";

import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import SettingsModal from "./settings-modal";
import { useLanguage } from "@/hooks/use-language";

type IconProps = {
  className?: string;
};

function IconBase({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  );
}

export function ClassicIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path
        d="M17.8 7.2A7.25 7.25 0 1 0 18.6 16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path
        d="M15.05 9.15a4 4 0 1 0 .4 5.15"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <circle cx="18.1" cy="7" fill="currentColor" r="1.4" />
    </IconBase>
  );
}

export function ProIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path
        d="m12 3.25 7 5.4-7 12.1-7-12.1 7-5.4Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="m5.2 8.75 6.8 3.7 6.8-3.7M12 12.45v8"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path d="m12 3.25 2.05 7.45L12 12.45 9.95 10.7 12 3.25Z" fill="currentColor" />
    </IconBase>
  );
}

export function AgentIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path
        d="m12 7.4 4 2.3v4.6l-4 2.3-4-2.3V9.7l4-2.3Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M12 7.25V4.5M16.1 9.6l2.4-1.35M16.1 14.4l2.4 1.35M12 16.75v2.75M7.9 14.4l-2.4 1.35M7.9 9.6 5.5 8.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="3.5" fill="currentColor" r="1.25" />
      <circle cx="19.35" cy="7.75" fill="currentColor" r="1.25" />
      <circle cx="19.35" cy="16.25" fill="currentColor" r="1.25" />
      <circle cx="12" cy="20.5" fill="currentColor" r="1.25" />
      <circle cx="4.65" cy="16.25" fill="currentColor" r="1.25" />
      <circle cx="4.65" cy="7.75" fill="currentColor" r="1.25" />
      <circle cx="12" cy="12" fill="currentColor" r="1.45" />
    </IconBase>
  );
}

export function SettingsIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path
        d="M9.75 4.4 10.4 3h3.2l.65 1.4 1.4.58 1.45-.53 2.26 2.26-.53 1.45.58 1.4 1.4.65v3.2l-1.4.65-.58 1.4.53 1.45-2.26 2.26-1.45-.53-1.4.58-.65 1.4h-3.2l-.65-1.4-1.4-.58-1.45.53-2.26-2.26.53-1.45-.58-1.4-1.4-.65v-3.2l1.4-.65.58-1.4-.53-1.45L6.9 4.45l1.45.53 1.4-.58Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.45"
      />
      <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.5" />
    </IconBase>
  );
}

export function DocsIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path
        d="M6.25 3.75h8.1l3.4 3.4v13.1H6.25V3.75Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
      <path
        d="M14.25 3.9v3.6h3.35M9 11h6M9 14.25h6M9 17.5h3.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </IconBase>
  );
}

export function PanelIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <rect
        height="16"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.6"
        width="18"
        x="3"
        y="4"
      />
      <path d="M8.5 4v16" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="m14.5 9-3 3 3 3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </IconBase>
  );
}

export function ExpandIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path
        d="m9 6 6 6-6 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </IconBase>
  );
}

type NavItemProps = {
  active?: boolean;
  compact?: boolean;
  icon: (props: IconProps) => ReactNode;
  label: string;
  onClick: () => void;
};

function NavItem({
  active,
  compact,
  icon: Icon,
  label,
  onClick,
}: NavItemProps) {
  return (
    <button
      aria-current={active ? "page" : undefined}
      className={`nav-entry group relative flex w-full items-center rounded-xl py-2.5 text-left text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300 ${
        compact ? "justify-center px-2" : "gap-3 px-3"
      } ${
        active
          ? "bg-white text-stone-950 shadow-lg shadow-black/20"
          : "text-stone-400 hover:bg-white/5 hover:text-white"
      }`}
      onClick={onClick}
      title={compact ? label : undefined}
      type="button"
    >
      <span
        className={`grid size-8 shrink-0 place-items-center rounded-lg transition-colors ${
          active
            ? "bg-lime-300 text-stone-950"
            : "bg-white/5 group-hover:bg-white/10"
        }`}
      >
        <Icon className="size-4.5" />
      </span>
      <span className={compact ? "sr-only" : "truncate"}>{label}</span>
      {active && (
        <span
          className={
            compact
              ? "absolute right-1 size-1 rounded-full bg-lime-400"
              : "ml-auto size-1.5 rounded-full bg-lime-400"
          }
        />
      )}
    </button>
  );
}

interface WorkspaceSidebarProps {
  activeMode?: "Classic" | "Pro" | "Agent" | "Setting" | "Docs";
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
}

export function WorkspaceSidebar({
  activeMode: controlledMode,
  isOpen: controlledIsOpen,
  onToggle,
}: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang } = useLanguage();

  const [internalIsOpen, setInternalIsOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Animation state matching resizable-navbar from landing & docs
  const [isPlaying, setIsPlaying] = useState(true);
  const [animKey, setAnimKey] = useState(0);
  const isPlayingRef = useRef(true);
  const lastPlayTimeRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerAnimation = useCallback((force = false) => {
    const now = Date.now();
    if (!force && (isPlayingRef.current || now - lastPlayTimeRef.current < 6000)) {
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    isPlayingRef.current = true;
    lastPlayTimeRef.current = now;
    setAnimKey((prev) => prev + 1);
    setIsPlaying(true);
    timerRef.current = setTimeout(() => {
      setIsPlaying(false);
      isPlayingRef.current = false;
    }, 3400);
  }, []);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setIsPlaying(false);
      isPlayingRef.current = false;
    }, 3400);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        triggerAnimation();
      }
    }, 25000);
    return () => clearInterval(interval);
  }, [triggerAnimation]);

  useEffect(() => {
    const handleFocus = () => triggerAnimation(true);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") triggerAnimation(true);
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [triggerAnimation]);

  const isSidebarOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsSidebarOpen = (open: boolean) => {
    if (onToggle) onToggle(open);
    else setInternalIsOpen(open);
  };

  const currentMode = controlledMode || (
    pathname.startsWith("/pro") ? "Pro" :
    pathname.startsWith("/agent") ? "Agent" :
    pathname.startsWith("/docs") ? "Docs" : "Classic"
  );

  const primaryItems = [
    { label: "Classic", href: "/classic", icon: ClassicIcon },
    { label: "Pro", href: "/pro", icon: ProIcon },
    { label: "Agent", href: "/agent", icon: AgentIcon },
  ];

  const secondaryItems = [
    { label: lang === "en" ? "Settings" : "Pengaturan", icon: SettingsIcon, action: "settings" },
    { label: lang === "en" ? "Docs" : "Dokumentasi", href: "/docs", icon: DocsIcon },
  ];

  return (
    <>
      {/* Backdrop for mobile */}
      <button
        aria-label="Close sidebar"
        className={`fixed inset-0 z-40 bg-stone-950/60 backdrop-blur-sm transition-opacity duration-500 md:hidden ${
          isSidebarOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={() => setIsSidebarOpen(false)}
        type="button"
      />

      <aside
        className={`sidebar-shell fixed inset-y-0 left-0 z-50 min-h-screen shrink-0 transition-all duration-500 ease-in-out md:relative ${
          isSidebarOpen ? "w-64" : "w-20"
        }`}
      >
        <div
          className={`relative flex h-full flex-col overflow-hidden bg-stone-950 py-5 text-white transition-all duration-500 ${
            isSidebarOpen ? "w-64 px-4" : "w-20 px-3"
          }`}
        >
          {/* Subtle animated aurora gradients from D:\navbar */}
          <div className="sidebar-pattern pointer-events-none absolute inset-0" />
          <div className="sidebar-aurora sidebar-aurora-primary pointer-events-none absolute" />
          <div className="sidebar-aurora sidebar-aurora-secondary pointer-events-none absolute" />
          <div className="pointer-events-none absolute -right-24 -top-24 size-56 rounded-full bg-lime-300/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-24 size-52 rounded-full bg-cyan-400/8 blur-3xl" />
          <div className="pointer-events-none absolute inset-y-24 right-0 w-px bg-gradient-to-b from-transparent via-lime-300/20 to-transparent" />

          {/* Top Brand Header (Using Navbar Logo from landing & docs) */}
          <div
            className={`relative flex h-11 items-center ${
              isSidebarOpen ? "gap-2 px-1" : "justify-center"
            }`}
          >
            <Link
              href="/"
              onMouseEnter={() => triggerAnimation(true)}
              className="group flex items-center space-x-2.5 select-none cursor-pointer"
              title={lang === "en" ? "Return to Landing Page" : "Kembali ke Beranda"}
            >
              <div className="relative flex items-center justify-center h-8 w-auto aspect-video shrink-0">
                {isPlaying ? (
                  <picture className="flex items-center">
                    <source srcSet={`/navbar-logo-play.webp?t=${animKey}`} type="image/webp" />
                    <img
                      key={animKey}
                      src={`/navbar-logo-play.gif?t=${animKey}`}
                      alt="PIEW Logo"
                      className="h-8 w-auto object-contain select-none pointer-events-none"
                    />
                  </picture>
                ) : (
                  <picture className="flex items-center">
                    <source srcSet="/navbar-logo-static.webp" type="image/webp" />
                    <img
                      src="/navbar-logo-static.png"
                      alt="PIEW Logo"
                      className="h-8 w-auto object-contain select-none pointer-events-none transition-transform duration-300 group-hover:scale-105"
                    />
                  </picture>
                )}
              </div>
              {isSidebarOpen && (
                <span className="font-bold tracking-tight text-white transition-colors duration-200 group-hover:text-lime-300 text-base">
                  PIEW
                </span>
              )}
            </Link>

            {isSidebarOpen && (
              <button
                aria-label="Collapse sidebar"
                className="ml-auto grid size-8 place-items-center rounded-xl text-stone-400 transition-all duration-300 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300 cursor-pointer"
                onClick={() => setIsSidebarOpen(false)}
                title={lang === "en" ? "Collapse sidebar" : "Tutup bilah sisi"}
                type="button"
              >
                <PanelIcon className="size-4" />
              </button>
            )}
          </div>

          {/* Category Section Label */}
          <div
            className={`mt-8 overflow-hidden transition-opacity duration-300 ${
              isSidebarOpen ? "px-2 opacity-100" : "h-2 opacity-0"
            }`}
          >
            <p className="text-[11px] font-semibold tracking-widest text-stone-500 uppercase">
              MODE
            </p>
          </div>

          {/* Main Navigation (Classic, Pro, Agent) */}
          <nav
            aria-label="Main navigation"
            className="sidebar-nav mt-2 space-y-1.5"
          >
            {primaryItems.map((item) => (
              <NavItem
                active={currentMode === item.label}
                compact={!isSidebarOpen}
                icon={item.icon}
                key={item.label}
                label={item.label}
                onClick={() => {
                  router.push(item.href);
                }}
              />
            ))}
          </nav>

          {/* Bottom Secondary Navigation (Setting, Docs, Language Switcher) */}
          <div className="mt-auto border-t border-white/10 pt-4 space-y-3">
            <nav
              aria-label="Support navigation"
              className="sidebar-nav space-y-1.5"
            >
              {secondaryItems.map((item) => (
                <NavItem
                  active={currentMode === item.label}
                  compact={!isSidebarOpen}
                  icon={item.icon}
                  key={item.label}
                  label={item.label}
                  onClick={() => {
                    if (item.action === "settings") {
                      setIsSettingsOpen(true);
                    } else if (item.href) {
                      router.push(item.href);
                    }
                  }}
                />
              ))}
            </nav>

            {/* Language Switcher (Clean, no Exit word) */}
            {isSidebarOpen ? (
              <div className="flex items-center justify-start px-2 pt-2 text-xs text-stone-400">
                <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setLang("id")}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all cursor-pointer ${
                      lang === "id"
                        ? "bg-lime-300 text-stone-950 font-semibold shadow-sm"
                        : "text-stone-400 hover:text-white"
                    }`}
                  >
                    ID
                  </button>
                  <button
                    type="button"
                    onClick={() => setLang("en")}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all cursor-pointer ${
                      lang === "en"
                        ? "bg-lime-300 text-stone-950 font-semibold shadow-sm"
                        : "text-stone-400 hover:text-white"
                    }`}
                  >
                    EN
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setLang(lang === "en" ? "id" : "en")}
                  className="text-[10px] uppercase font-semibold text-stone-400 hover:text-lime-300 transition-colors cursor-pointer"
                  title="Toggle language"
                >
                  {lang}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Expand Sidebar Trigger Button when collapsed */}
        {!isSidebarOpen && (
          <button
            aria-label="Expand sidebar"
            className="absolute -right-3 top-1/2 z-10 grid size-7 -translate-y-1/2 place-items-center rounded-full border border-stone-700 bg-stone-900 text-lime-300 shadow-lg shadow-black/40 transition-all duration-300 hover:scale-110 hover:border-lime-300/50 hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300"
            onClick={() => setIsSidebarOpen(true)}
            title="Expand sidebar"
            type="button"
          >
            <ExpandIcon className="size-4" />
          </button>
        )}
      </aside>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}
    </>
  );
}
