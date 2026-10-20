"use client"

import React, { useEffect } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { IconX, IconArrowRight } from "@tabler/icons-react"

interface PiewLaunchModalProps {
  isOpen: boolean
  onClose: () => void
  lang: "id" | "en"
}

export function PiewLaunchModal({ isOpen, onClose, lang }: PiewLaunchModalProps) {
  // Close on Escape key and freeze scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "hidden"
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [isOpen, onClose])

  const workspaces = [
    {
      name: "Classic",
      href: "/classic",
    },
    {
      name: "Pro",
      href: "/pro",
    },
    {
      name: "Agent",
      href: "/agent",
    },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 select-none">
          {/* Backdrop blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-md cursor-pointer"
          />

          {/* Modal Container: 3 kotak bersih berdampingan */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl bg-[#090a0d] border border-white/10 rounded-3xl p-5 sm:p-7 shadow-[0_30px_90px_rgba(0,0,0,0.9)] z-10"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute -top-3.5 -right-3.5 sm:-top-4 sm:-right-4 w-8 h-8 rounded-full bg-[#181920] border border-white/15 text-zinc-400 hover:text-white hover:border-white/30 transition-all flex items-center justify-center cursor-pointer shadow-lg"
            >
              <IconX className="w-4 h-4" />
            </button>

            {/* 3 Columns: Classic | Pro | Agent */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
              {workspaces.map((ws) => (
                <Link
                  key={ws.name}
                  href={ws.href}
                  onClick={onClose}
                  className="group relative flex flex-col justify-between min-h-[145px] sm:min-h-[165px] p-5 sm:p-6 rounded-2xl bg-[#121318] hover:bg-[#181920] border border-white/8 hover:border-white/20 transition-all duration-200 shadow-md cursor-pointer"
                >
                  {/* Workspace Name */}
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white group-hover:text-white transition-colors">
                    {ws.name}
                  </h3>

                  {/* Action Link: Buka → / Open → */}
                  <div className="flex items-center gap-1.5 text-sm font-medium text-zinc-400 group-hover:text-white transition-colors pt-6">
                    <span>{lang === "en" ? "Open" : "Buka"}</span>
                    <IconArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
