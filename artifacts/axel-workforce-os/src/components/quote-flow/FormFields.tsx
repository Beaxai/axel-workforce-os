import { Check, ChevronDown, Plus, Trash2, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const inputBase: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid var(--input-border)",
  background: "var(--input-bg)",
  color: "var(--input-text)",
  fontSize: 14,
  outline: "none",
  transition: "border-color 0.15s",
};

export function FormSection({ title, subtitle, children }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--section-heading)", margin: 0, marginBottom: subtitle ? 4 : 16 }}>
        {title}
      </h3>
      {subtitle && (
        <p style={{ fontSize: 14, color: "var(--label-text)", margin: 0, marginBottom: 16, fontFamily: "var(--app-font-heading)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{subtitle}</p>
      )}
      {children}
    </div>
  );
}

export function FieldGrid({ columns = 2, children }: { columns?: number; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 16 }}>
      {children}
    </div>
  );
}

export function FieldLabel({ label, required, children }: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 13, color: "var(--label-text)", marginBottom: 6, fontFamily: "var(--app-font-sans)" }}>
        {label} {required && <span style={{ color: "var(--accent-primary)" }}>*</span>}
      </label>
      {children}
    </div>
  );
}

export function TextInput({ value, onChange, placeholder, type = "text", error, style, disabled }: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: string;
  error?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}) {
  return (
    <div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          ...inputBase,
          borderColor: error ? "#ef4444" : "var(--input-border)",
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? "not-allowed" : "text",
          ...style,
        }}
        onFocus={(e) => { if (!disabled) e.currentTarget.style.borderColor = "var(--input-border-focus)"; }}
        onBlur={(e) => (e.currentTarget.style.borderColor = error ? "#ef4444" : "var(--input-border)")}
      />
      {error && <p style={{ fontSize: 12, color: "#ef4444", margin: "4px 0 0" }}>{error}</p>}
    </div>
  );
}

export function CurrencyInput({ value, onChange, placeholder, error, disabled }: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <div style={{ position: "relative" }}>
      <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--input-text)", fontSize: 14, pointerEvents: "none" }}>$</span>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9]/g, "");
          onChange(raw ? Number(raw).toLocaleString() : "");
        }}
        placeholder={placeholder}
        inputMode="numeric"
        disabled={disabled}
        style={{
          ...inputBase,
          paddingLeft: 28,
          borderColor: error ? "#ef4444" : "var(--input-border)",
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? "not-allowed" : "text",
        }}
        onFocus={(e) => { if (!disabled) e.currentTarget.style.borderColor = "var(--input-border-focus)"; }}
        onBlur={(e) => (e.currentTarget.style.borderColor = error ? "#ef4444" : "var(--input-border)")}
      />
      {error && <p style={{ fontSize: 12, color: "#ef4444", margin: "4px 0 0" }}>{error}</p>}
    </div>
  );
}

export function NumberInput({ value, onChange, placeholder, error, min, max, style, disabled }: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  error?: string;
  min?: number;
  max?: number;
  style?: React.CSSProperties;
  disabled?: boolean;
}) {
  return (
    <div>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        step="any"
        disabled={disabled}
        style={{
          ...inputBase,
          borderColor: error ? "#ef4444" : "var(--input-border)",
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? "not-allowed" : "text",
          ...style,
        }}
        onFocus={(e) => { if (!disabled) e.currentTarget.style.borderColor = "var(--input-border-focus)"; }}
        onBlur={(e) => (e.currentTarget.style.borderColor = error ? "#ef4444" : "var(--input-border)")}
      />
      {error && <p style={{ fontSize: 12, color: "#ef4444", margin: "4px 0 0" }}>{error}</p>}
    </div>
  );
}

export function SelectInput({ value, onChange, options, placeholder, error, disabled }: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{
          ...inputBase,
          appearance: "none",
          paddingRight: 36,
          color: value ? "var(--input-text)" : "var(--input-placeholder)",
          borderColor: error ? "#ef4444" : "var(--input-border)",
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--input-border-focus)")}
        onBlur={(e) => (e.currentTarget.style.borderColor = error ? "#ef4444" : "var(--input-border)")}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "var(--label-text)", pointerEvents: "none" }} />
      {error && <p style={{ fontSize: 12, color: "#ef4444", margin: "4px 0 0" }}>{error}</p>}
    </div>
  );
}

export function MultiSelect({ values, onChange, options, placeholder, disabled }: {
  values: string[];
  onChange: (vals: string[]) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setSearch(""); }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus();
  }, [open]);

  const toggle = (val: string) => {
    if (disabled) return;
    onChange(values.includes(val) ? values.filter((v) => v !== val) : [...values, val]);
  };

  const filtered = search.trim()
    ? options.filter((o) =>
        o.value.toLowerCase().startsWith(search.trim().toLowerCase()) ||
        o.label.toLowerCase().includes(search.trim().toLowerCase())
      )
    : options;

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && filtered.length === 1) {
      e.preventDefault();
      toggle(filtered[0].value);
      setSearch("");
    }
    if (e.key === "Escape") { setOpen(false); setSearch(""); }
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          ...inputBase,
          textAlign: "left",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 44,
          flexWrap: "wrap",
          gap: 4,
        }}
      >
        {values.length === 0 ? (
          <span style={{ color: "var(--input-placeholder)" }}>{placeholder || "Select..."}</span>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {values.map((v) => (
              <span
                key={v}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 8px",
                  borderRadius: 6,
                  background: "var(--accent-primary-soft)",
                  color: "var(--accent-primary)",
                  fontSize: 12,
                }}
              >
                {options.find((o) => o.value === v)?.label || v}
                <X
                  style={{ width: 12, height: 12, cursor: "pointer" }}
                  onClick={(e) => { e.stopPropagation(); toggle(v); }}
                />
              </span>
            ))}
          </div>
        )}
        <ChevronDown style={{ width: 16, height: 16, color: "var(--label-text)", flexShrink: 0 }} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            background: "hsl(var(--popover))",
            border: "1px solid var(--input-border)",
            borderRadius: 10,
            maxHeight: 300,
            overflowY: "auto",
            zIndex: 50,
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--input-border)", position: "sticky", top: 0, background: "hsl(var(--popover))", zIndex: 1 }}>
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Type abbreviation (e.g. CA)..."
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid var(--input-border)",
                background: "var(--input-bg)",
                color: "var(--input-text)",
                fontSize: 13,
                outline: "none",
                fontFamily: "inherit",
              }}
            />
          </div>
          {filtered.length === 0 && (
            <div style={{ padding: "12px 14px", color: "var(--input-placeholder)", fontSize: 13 }}>No states match "{search}"</div>
          )}
          {filtered.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { toggle(o.value); setSearch(""); }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                border: "none",
                background: values.includes(o.value) ? "var(--accent-primary-soft)" : "transparent",
                color: "var(--input-text)",
                fontSize: 14,
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: 4,
                border: values.includes(o.value) ? "none" : "2px solid var(--input-border)",
                background: values.includes(o.value) ? "var(--accent-primary)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                {values.includes(o.value) && <Check style={{ width: 12, height: 12, color: "#fff" }} />}
              </div>
              <span><strong style={{ marginRight: 6 }}>{o.value}</strong>{STATE_NAMES[o.value] || ""}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function YesNoToggle({ value, onChange, options, disabled }: {
  value: string;
  onChange: (val: string) => void;
  options?: string[];
  disabled?: boolean;
}) {
  const opts = options || ["Yes", "No"];
  return (
    <div style={{ display: "flex", gap: 8, opacity: disabled ? 0.5 : 1 }}>
      {opts.map((opt) => (
        <button
          key={opt}
          type="button"
          disabled={disabled}
          onClick={() => { if (!disabled) onChange(opt); }}
          style={{
            padding: "8px 20px",
            borderRadius: 8,
            border: value === opt ? "1px solid var(--accent-primary)" : "1px solid var(--input-border)",
            background: value === opt ? "var(--accent-primary-soft)" : "transparent",
            color: value === opt ? "var(--accent-primary)" : "var(--label-text)",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export function RadioGroup({ value, onChange, options }: {
  value: string;
  onChange: (val: string) => void;
  options: string[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderRadius: 8,
            border: value === opt ? "1px solid var(--accent-primary)" : "1px solid var(--input-border)",
            background: value === opt ? "var(--accent-primary-soft)" : "transparent",
            color: "var(--input-text)",
            fontSize: 14,
            textAlign: "left",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          <div style={{
            width: 18, height: 18, borderRadius: 9,
            border: value === opt ? "none" : "2px solid var(--input-border)",
            background: value === opt ? "var(--accent-primary)" : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            {value === opt && <div style={{ width: 6, height: 6, borderRadius: 3, background: "#fff" }} />}
          </div>
          {opt}
        </button>
      ))}
    </div>
  );
}

export function TextArea({ value, onChange, placeholder, rows }: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows || 4}
      style={{ ...inputBase, resize: "vertical", minHeight: 80 }}
      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--input-border-focus)")}
      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--input-border)")}
    />
  );
}

export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 16px",
        borderRadius: 8,
        border: "1px dashed var(--accent-primary)",
        background: "transparent",
        color: "var(--accent-primary)",
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-primary-soft)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <Plus style={{ width: 14, height: 14 }} />
      {label}
    </button>
  );
}

export function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: 6,
        borderRadius: 6,
        border: "none",
        background: "transparent",
        color: "var(--input-placeholder)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = "var(--input-placeholder)"; e.currentTarget.style.background = "transparent"; }}
    >
      <Trash2 style={{ width: 16, height: 16 }} />
    </button>
  );
}

export function ProgressBar({ current, total, label }: { current: number; total: number; label: string }) {
  return (
    <div>
      <div style={{ height: 3, background: "var(--input-border)", width: "100%", borderRadius: 2 }}>
        <div style={{ height: "100%", width: `${(current / total) * 100}%`, background: "var(--accent-primary)", borderRadius: 2, transition: "width 0.3s" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-primary)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--app-font-heading)" }}>
          {label}
        </span>
        <span style={{ fontSize: 13, color: "var(--label-text)" }}>
          Step {current} of {total}
        </span>
      </div>
    </div>
  );
}

const STATE_NAMES: Record<string, string> = {
  AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",
  CT:"Connecticut",DE:"Delaware",FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",
  IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",
  ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",
  MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",
  NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",
  OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",
  TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",WA:"Washington",
  WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",
};
export const US_STATES_OPTIONS = Object.entries(STATE_NAMES).map(([abbr, name]) => ({
  value: abbr,
  label: `${abbr} — ${name}`,
}));
