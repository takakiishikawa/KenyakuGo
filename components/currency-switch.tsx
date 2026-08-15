"use client";

export type DisplayCurrency = "JPY" | "VND";

export function CurrencySwitch({
  value,
  onChange,
}: {
  value: DisplayCurrency;
  onChange: (v: DisplayCurrency) => void;
}) {
  return (
    <div className="flex rounded-[10px] overflow-hidden shrink-0" style={{ border: "1px solid var(--color-border-default)" }}>
      {(["JPY", "VND"] as const).map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          title={c === "JPY" ? "Japanese Yen" : "Vietnamese Dong"}
          className="w-10 h-[38px] text-base font-semibold cursor-pointer transition-all hover:opacity-80 active:scale-95"
          style={{
            backgroundColor: value === c ? "var(--color-primary)" : "transparent",
            color: value === c ? "#fff" : "var(--color-text-secondary)",
          }}
        >
          {c === "JPY" ? "¥" : "₫"}
        </button>
      ))}
    </div>
  );
}
