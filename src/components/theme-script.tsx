"use client";

import { useEffect, useState } from "react";

export function ThemeScript() {
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    setMounted(false);
    try {
      var theme = localStorage.getItem("theme");
      var systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      var resolvedTheme = theme === "system" ? systemTheme : theme || "light";
      if (resolvedTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch (e) {}
  }, []);

  if (mounted) {
    return null;
  }

  return null;
}
