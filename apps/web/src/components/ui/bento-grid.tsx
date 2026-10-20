import React from "react"
import { cn } from "@/lib/utils"

export const BentoGrid = ({
  className,
  children,
}: {
  className?: string
  children?: React.ReactNode
}) => {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 max-w-7xl mx-auto",
        className
      )}
    >
      {children}
    </div>
  )
}

export const BentoCard = ({
  className,
  title,
  description,
  header,
  icon,
  badge,
}: {
  className?: string
  title: string
  description: string
  header?: React.ReactNode
  icon?: React.ReactNode
  badge?: string
}) => {
  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-[#121318] border border-white/[0.08] p-6 sm:p-8 transition-all duration-300 hover:bg-[#161820] hover:border-white/20 shadow-xl",
        className
      )}
    >
      {/* Blueprint Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
          backgroundSize: "24px 24px",
        }}
      />

      {/* Subtle hover glow */}
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(ellipse_at_top_right,rgba(56,189,248,0.06),transparent_70%)]" />

      {/* Top Graphic / Preview */}
      <div className="relative z-10 w-full mb-6 min-h-[140px] flex flex-col justify-center">
        {header}
      </div>

      {/* Bottom Text Content */}
      <div className="relative z-10 border-t border-white/[0.08] pt-4">
        <div className="flex items-center gap-2 mb-2">
          {icon && <div>{icon}</div>}
          {badge && (
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full font-semibold">
              {badge}
            </span>
          )}
        </div>
        <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white mb-2">
          {title}
        </h3>
        <p className="text-sm text-zinc-400 leading-relaxed font-normal">
          {description}
        </p>
      </div>
    </div>
  )
}
