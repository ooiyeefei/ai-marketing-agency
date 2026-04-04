"use client";

import type { Persona } from "@/lib/types";
import { PERSONAS } from "@/lib/personas";

interface PersonaSelectorProps {
  selected: Persona | null;
  onSelect: (persona: Persona) => void;
}

export default function PersonaSelector({
  selected,
  onSelect,
}: PersonaSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium uppercase tracking-wider text-gray-400">
        Brand Persona
      </label>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {PERSONAS.map((persona) => {
          const isSelected = selected === persona.id;
          return (
            <button
              key={persona.id}
              type="button"
              onClick={() => onSelect(persona.id)}
              className={`
                glass-card group relative p-4 text-left
                transition-all duration-300 ease-out
                ${
                  isSelected
                    ? "border-transparent shadow-[0_0_25px_rgba(99,102,241,0.2)] scale-[1.02]"
                    : "hover:border-[var(--surface-light)] hover:scale-[1.01]"
                }
              `}
              style={{
                borderColor: isSelected ? persona.color : undefined,
                boxShadow: isSelected
                  ? `0 0 25px ${persona.color}25, inset 0 0 20px ${persona.color}08`
                  : undefined,
              }}
            >
              {/* Accent dot */}
              <div className="mb-3 flex items-center gap-2">
                <div
                  className={`
                    h-2.5 w-2.5 rounded-full transition-all duration-300
                    ${isSelected ? "scale-125" : "scale-100 opacity-60 group-hover:opacity-100"}
                  `}
                  style={{
                    backgroundColor: persona.color,
                    boxShadow: isSelected
                      ? `0 0 10px ${persona.color}80`
                      : "none",
                  }}
                />
                <span
                  className={`
                    text-sm font-semibold transition-colors duration-200
                    ${isSelected ? "text-white" : "text-gray-300 group-hover:text-white"}
                  `}
                >
                  {persona.name}
                </span>
              </div>

              <p
                className={`
                  text-xs leading-relaxed transition-colors duration-200
                  ${isSelected ? "text-gray-300" : "text-gray-500 group-hover:text-gray-400"}
                `}
              >
                {persona.description}
              </p>

              {/* Tone tag */}
              <div
                className={`
                  mt-3 inline-block rounded-full px-2 py-0.5
                  text-[10px] font-medium uppercase tracking-wider
                  transition-all duration-300
                  ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-70"}
                `}
                style={{
                  backgroundColor: `${persona.color}15`,
                  color: persona.color,
                  border: `1px solid ${persona.color}30`,
                }}
              >
                {persona.tone}
              </div>

              {/* Selection check */}
              {isSelected && (
                <div
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] text-white"
                  style={{ backgroundColor: persona.color }}
                >
                  &#10003;
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
