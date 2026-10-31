// Botón redondo para cambiar entre modo oscuro y modo claro.
// - El modo se controla con la clase "dark" en <html> (ver index.css e index.html).
// - La elección se guarda en localStorage ("tema" = "dark" o "light") para recordarla.
import { useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle({ className = "" }) {
  // Estado inicial: lo que ya dejó puesto el script de index.html
  const [oscuro, setOscuro] = useState(() => document.documentElement.classList.contains("dark"));

  function alternar() {
    const nuevo = !oscuro;
    document.documentElement.classList.toggle("dark", nuevo); // agrega o quita la clase
    try {
      localStorage.setItem("tema", nuevo ? "dark" : "light");
    } catch {
      // Si no se puede guardar, el cambio funciona igual (solo no se recordará)
    }
    setOscuro(nuevo);
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-borde bg-superficie-2 text-texto-suave transition-colors hover:border-acento/50 hover:text-texto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento ${className}`}
    >
      {/* En oscuro se muestra el Sol (para ir a claro) y viceversa */}
      {oscuro ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
    </button>
  );
}
