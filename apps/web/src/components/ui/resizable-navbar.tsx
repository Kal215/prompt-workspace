"use client";
import { cn } from "@/lib/utils";
import { IconMenu2, IconX } from "@tabler/icons-react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "motion/react";
import React, { useRef, useState, useEffect, useCallback } from "react";

interface NavbarProps {
  children: React.ReactNode;
  className?: string;
}

interface NavBodyProps {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
}

interface NavItemsProps {
  items: {
    name: string;
    link: string;
  }[];
  className?: string;
  onItemClick?: () => void;
}

interface MobileNavProps {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
}

interface MobileNavHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface MobileNavMenuProps {
  children: React.ReactNode;
  className?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const Navbar = ({ children, className }: NavbarProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const [visible, setVisible] = useState<boolean>(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    if (latest > 80) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  });

  return (
    <motion.div
      ref={ref}
      className={cn("fixed inset-x-0 top-0 z-50 w-full pt-3 px-4", className)}
    >
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(
              child as React.ReactElement<{ visible?: boolean }>,
              { visible },
            )
          : child,
      )}
    </motion.div>
  );
};

export const NavBody = ({ children, className, visible }: NavBodyProps) => {
  return (
    <motion.div
      animate={{
        backdropFilter: visible ? "blur(14px)" : "none",
        boxShadow: visible
          ? "0 0 24px rgba(0, 0, 0, 0.4), 0 1px 1px rgba(255, 255, 255, 0.05), 0 0 0 1px rgba(255, 255, 255, 0.1), 0 16px 68px rgba(0, 0, 0, 0.5), 0 1px 0 rgba(255, 255, 255, 0.1) inset"
          : "none",
        width: visible ? "54%" : "100%",
        y: visible ? 10 : 0,
      }}
      transition={{
        type: "spring",
        stiffness: 220,
        damping: 35,
      }}
      style={{
        minWidth: "720px",
      }}
      className={cn(
        "relative z-[60] mx-auto hidden w-full max-w-6xl flex-row items-center justify-between self-start rounded-full bg-transparent px-5 py-2.5 lg:flex border transition-colors duration-200",
        visible
          ? "bg-zinc-950/85 border-white/15 text-white"
          : "border-transparent text-zinc-300",
        className,
      )}
    >
      {children}
    </motion.div>
  );
};

export const NavItems = ({ items, className, onItemClick }: NavItemsProps) => {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <motion.div
      onMouseLeave={() => setHovered(null)}
      className={cn(
        "absolute inset-0 hidden flex-1 flex-row items-center justify-center space-x-1 text-sm font-medium transition duration-200 lg:flex pointer-events-none",
        className,
      )}
    >
      {items.map((item, idx) => (
        <a
          onMouseEnter={() => setHovered(idx)}
          onClick={onItemClick}
          className="pointer-events-auto relative px-4 py-1.5 text-zinc-400 hover:text-white transition-colors duration-150"
          key={`link-${idx}`}
          href={item.link}
        >
          {hovered === idx && (
            <motion.div
              layoutId="hovered"
              className="absolute inset-0 h-full w-full rounded-full bg-white/10"
            />
          )}
          <span className="relative z-20">{item.name}</span>
        </a>
      ))}
    </motion.div>
  );
};

export const MobileNav = ({ children, className, visible }: MobileNavProps) => {
  return (
    <motion.div
      animate={{
        backdropFilter: visible ? "blur(14px)" : "none",
        boxShadow: visible
          ? "0 0 24px rgba(0, 0, 0, 0.4), 0 1px 1px rgba(255, 255, 255, 0.05), 0 0 0 1px rgba(255, 255, 255, 0.1)"
          : "none",
        width: visible ? "92%" : "100%",
        y: visible ? 8 : 0,
      }}
      transition={{
        type: "spring",
        stiffness: 220,
        damping: 35,
      }}
      className={cn(
        "relative z-50 mx-auto flex w-full max-w-[calc(100vw-2rem)] flex-col items-center justify-between rounded-2xl bg-transparent px-4 py-2 lg:hidden border transition-colors duration-200",
        visible
          ? "bg-zinc-950/90 border-white/15 text-white"
          : "border-transparent text-zinc-300",
        className,
      )}
    >
      {children}
    </motion.div>
  );
};

export const MobileNavHeader = ({
  children,
  className,
}: MobileNavHeaderProps) => {
  return (
    <div
      className={cn(
        "flex w-full flex-row items-center justify-between",
        className,
      )}
    >
      {children}
    </div>
  );
};

export const MobileNavMenu = ({
  children,
  className,
  isOpen,
  onClose,
}: MobileNavMenuProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className={cn(
            "mt-3 flex w-full flex-col gap-3 rounded-xl border border-white/10 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur-xl",
            className,
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const MobileNavToggle = ({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      type="button"
      aria-label="Toggle menu"
      onClick={onClick}
      className="p-1 text-zinc-300 hover:text-white"
    >
      {isOpen ? <IconX className="h-5 w-5" /> : <IconMenu2 className="h-5 w-5" />}
    </button>
  );
};

export const NavbarLogo = ({
  children,
  href = "#",
  className,
}: {
  children?: React.ReactNode;
  href?: string;
  className?: string;
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [animKey, setAnimKey] = useState<number>(1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastPlayTimeRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(true);
  const hasTriggeredScrollDockRef = useRef<boolean>(false);

  // Trigger 1 full round of the 3D animation (3.35 seconds)
  const triggerAnimation = useCallback((force = false) => {
    const now = Date.now();
    // Debounce non-forced triggers (minimum 6s between auto ambient triggers)
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

  // 1. Initial play on page mount
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setIsPlaying(false);
      isPlayingRef.current = false;
    }, 3400);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // 2. Ambient Breathing Trigger (Every 25 seconds when page is active)
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        triggerAnimation();
      }
    }, 25000);

    return () => clearInterval(interval);
  }, [triggerAnimation]);

  // 3. Tab Focus / Re-focus Trigger ("Welcome back")
  useEffect(() => {
    const handleFocus = () => {
      triggerAnimation(true);
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        triggerAnimation(true);
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [triggerAnimation]);

  // 4. Scroll Dock Trigger (strictly triggers 1 time only across the page session)
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (latest) => {
    const prev = scrollY.getPrevious() ?? 0;
    if (!hasTriggeredScrollDockRef.current && latest > 80 && prev <= 80) {
      hasTriggeredScrollDockRef.current = true;
      triggerAnimation(true);
    }
  });

  return (
    <a
      href={href}
      onMouseEnter={() => triggerAnimation(true)}
      className={cn(
        "relative z-20 mr-4 flex items-center space-x-2.5 px-2 py-1 text-sm font-normal text-white group cursor-pointer select-none",
        className,
      )}
    >
      {children || (
        <>
          <div className="relative flex items-center justify-center h-7 w-auto aspect-video">
            {isPlaying ? (
              <picture className="flex items-center">
                <source srcSet={`/navbar-logo-play.webp?t=${animKey}`} type="image/webp" />
                <img
                  key={animKey}
                  src={`/navbar-logo-play.gif?t=${animKey}`}
                  alt="PIEW Animated Logo"
                  className="h-7 w-auto object-contain select-none pointer-events-none"
                />
              </picture>
            ) : (
              <picture className="flex items-center">
                <source srcSet="/navbar-logo-static.webp" type="image/webp" />
                <img
                  src="/navbar-logo-static.png"
                  alt="PIEW Logo"
                  className="h-7 w-auto object-contain select-none pointer-events-none transition-transform duration-300 group-hover:scale-105"
                />
              </picture>
            )}
          </div>
          <span className="font-bold tracking-tight text-white transition-colors duration-200 group-hover:text-sky-300">
            PIEW
          </span>
        </>
      )}
    </a>
  );
};

export const NavbarButton = ({
  href,
  as: Tag = "a",
  children,
  className,
  variant = "primary",
  ...props
}: {
  href?: string;
  as?: React.ElementType;
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "dark" | "gradient";
} & (
  | React.ComponentPropsWithoutRef<"a">
  | React.ComponentPropsWithoutRef<"button">
)) => {
  const baseStyles =
    "px-3.5 py-1.5 rounded-full text-xs font-medium relative cursor-pointer hover:-translate-y-0.5 transition duration-200 inline-flex items-center justify-center";

  const variantStyles = {
    primary:
      "bg-white text-black font-semibold hover:bg-zinc-200 shadow-sm",
    secondary:
      "bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10",
    dark:
      "bg-zinc-900 border border-white/15 text-white hover:bg-zinc-800",
    gradient:
      "bg-gradient-to-r from-sky-400 to-indigo-400 text-black font-semibold hover:opacity-90",
  };

  return (
    <Tag
      href={href || undefined}
      className={cn(baseStyles, variantStyles[variant], className)}
      {...props}
    >
      {children}
    </Tag>
  );
};
