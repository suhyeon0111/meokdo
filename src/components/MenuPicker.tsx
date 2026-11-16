"use client";

import { MENUS } from "@/lib/menus";

export default function MenuPicker({
  onSelect,
}: {
  onSelect: (menuKey: string) => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
      {MENUS.map((m) => (
        <button
          key={m.key}
          onClick={() => onSelect(m.key)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--fg)",
            fontSize: 15,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: m.color,
              flexShrink: 0,
            }}
          />
          {m.label}
        </button>
      ))}
    </div>
  );
}
