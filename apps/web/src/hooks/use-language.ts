"use client"

import { useState, useEffect } from "react"

export type Language = "en" | "id"

export function useLanguage() {
  const [lang, setLangState] = useState<Language>("en")

  useEffect(() => {
    try {
      const saved = localStorage.getItem("piew_lang") as Language | null
      if (saved === "en" || saved === "id") {
        setLangState(saved)
      } else {
        setLangState("en")
        localStorage.setItem("piew_lang", "en")
      }
    } catch {
      // fallback if storage restricted
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "piew_lang" && (e.newValue === "en" || e.newValue === "id")) {
        setLangState(e.newValue as Language)
      }
    }

    const handleCustomChange = (e: Event) => {
      const customEvent = e as CustomEvent<Language>
      if (customEvent.detail === "en" || customEvent.detail === "id") {
        setLangState(customEvent.detail)
      }
    }

    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("piew_lang_change", handleCustomChange)
    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("piew_lang_change", handleCustomChange)
    }
  }, [])

  const setLang = (newLang: Language) => {
    setLangState(newLang)
    try {
      localStorage.setItem("piew_lang", newLang)
      window.dispatchEvent(new CustomEvent("piew_lang_change", { detail: newLang }))
    } catch {
      // fallback
    }
  }

  return { lang, setLang }
}
