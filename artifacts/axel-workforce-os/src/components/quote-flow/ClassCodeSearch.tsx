import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X } from "lucide-react";

interface ClassCodeResult {
  classCode: string;
  description: string;
}

export default function ClassCodeSearch({ value, description, onChange, state }: {
  value: string;
  description: string;
  onChange: (classCode: string, description: string) => void;
  state?: string;
}) {
  const [query, setQuery] = useState(value ? `${value} - ${description}` : "");
  const [results, setResults] = useState<ClassCodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (value && description) {
      setQuery(`${value} - ${description}`);
    }
  }, [value, description]);

  const searchCodes = useCallback(async (term: string) => {
    if (term.length < 1) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || `${window.location.origin}/api`;
      const stateParam = state ? `&state=${encodeURIComponent(state)}` : "";
      const res = await fetch(`${baseUrl}/wc-rates/class-codes/search?q=${encodeURIComponent(term)}${stateParam}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (val: string) => {
    setQuery(val);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchCodes(val), 250);
  };

  const handleSelect = (item: ClassCodeResult) => {
    // Normalize numeric codes by stripping leading zeros so "0035" -> "35"
    // matches the canonical form stored in the WC rate sheet.
    const normalizedCode = /^[0-9]+$/.test(item.classCode)
      ? item.classCode.replace(/^0+/, "") || "0"
      : item.classCode;
    onChange(normalizedCode, item.description);
    setQuery(`${normalizedCode} - ${item.description}`);
    setOpen(false);
  };

  const handleClear = () => {
    setQuery("");
    onChange("", "");
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <Search style={{
          position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
          width: 14, height: 14, color: "#666", pointerEvents: "none",
        }} />
        <input
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Search code or description..."
          style={{
            width: "100%",
            padding: "10px 32px 10px 30px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "#1a1a26",
            color: "#fff",
            fontSize: 13,
            outline: "none",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--accent-primary)";
            if (query.length >= 1 && !value) setOpen(true);
          }}
          onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer", padding: 2,
              color: "rgba(255,255,255,0.3)", display: "flex",
            }}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        )}
      </div>
      {open && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          marginTop: 4,
          background: "#1a1a26",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 10,
          maxHeight: 280,
          overflowY: "auto",
          zIndex: 100,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}>
          {loading && (
            <div style={{ padding: "12px 14px", color: "#888", fontSize: 13 }}>Searching...</div>
          )}
          {!loading && results.length === 0 && query.length >= 1 && (
            <div style={{ padding: "12px 14px", color: "#666", fontSize: 13 }}>
              No class codes found for "{query}"
            </div>
          )}
          {!loading && results.map((item) => (
            <button
              key={item.classCode}
              type="button"
              onClick={() => handleSelect(item)}
              style={{
                width: "100%",
                display: "flex",
                gap: 8,
                padding: "10px 14px",
                border: "none",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                background: "transparent",
                color: "#fff",
                fontSize: 13,
                textAlign: "left",
                cursor: "pointer",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(124,58,237,0.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ color: "var(--accent-primary)", fontWeight: 600, flexShrink: 0, minWidth: 48 }}>
                {item.classCode}
              </span>
              <span style={{ color: "#ccc" }}>{item.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
