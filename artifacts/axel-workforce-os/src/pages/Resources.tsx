import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { GlassCard, SectionHeader, PinkButton, GhostButton, AxelBadge } from "@/components/ui/axel-index";
import { Search, Plus, X, FileText, Table, Video, Link as LinkIcon, Trash2 } from "lucide-react";
import { useThemeStore } from "@/lib/theme-store";
import { useAuthStore } from "@/lib/auth-store";

const CATEGORIES = ["All", "Guides", "Templates", "Forms", "Training", "Marketing"];
const TYPE_ICONS: Record<string, any> = { doc: FileText, spreadsheet: Table, video: Video, link: LinkIcon };

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: "14px", outline: "none",
};

export default function Resources() {
  const { theme } = useThemeStore();
  const { user } = useAuthStore();
  const isDark = theme === "dark";
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [showAdd, setShowAdd] = useState(false);

  const isAdmin = user?.role === "ADMIN";

  const { data: resources = [] } = useQuery({
    queryKey: ["resources"],
    queryFn: () => api.get<any[]>("/resources"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/resources/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["resources"] }),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => api.post("/resources", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["resources"] }); setShowAdd(false); },
  });

  const filtered = resources.filter((r: any) => {
    const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase()) || (r.description || "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "All" || r.category === category;
    return matchesSearch && matchesCategory;
  });

  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";

  return (
    <div style={{ maxWidth: "1200px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <SectionHeader title="Resources" subtitle="Docs, guides, and templates" />
        {isAdmin && (
          <PinkButton onClick={() => setShowAdd(true)} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Plus style={{ width: 16, height: 16 }} /> Add Resource
          </PinkButton>
        )}
      </div>

      <div style={{ position: "relative", marginBottom: "16px", maxWidth: "400px" }}>
        <Search style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: textMuted }} />
        <input
          placeholder="Search resources..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, paddingLeft: "36px", maxWidth: "400px" }}
        />
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            style={{
              padding: "6px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 500,
              background: category === cat ? "#E91E8C" : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
              color: category === cat ? "#fff" : textMuted,
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
        {filtered.map((r: any) => {
          const Icon = TYPE_ICONS[r.resourceType] || FileText;
          return (
            <GlassCard key={r.id}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Icon style={{ width: 20, height: 20, color: "#E91E8C", flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, margin: 0 }}>{r.title}</p>
                    <AxelBadge label={r.category} color="light-violet" />
                  </div>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => deleteMut.mutate(r.id)}
                    style={{ background: "none", border: "none", color: textMuted, cursor: "pointer", padding: "4px", opacity: 0.5 }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.color = "#E91E1E"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.5"; e.currentTarget.style.color = textMuted; }}
                  >
                    <Trash2 style={{ width: 14, height: 14 }} />
                  </button>
                )}
              </div>
              <p style={{ fontSize: "13px", color: textMuted, marginBottom: "14px", lineHeight: 1.5 }}>{r.description || "—"}</p>
              <GhostButton onClick={() => window.open(r.fileUrl || "#", "_blank")} style={{ fontSize: "13px", padding: "6px 14px" }}>
                {r.resourceType === "link" ? "View" : "Download"}
              </GhostButton>
            </GlassCard>
          );
        })}
        {filtered.length === 0 && (
          <GlassCard><p style={{ fontSize: "14px", color: textMuted, textAlign: "center" }}>No resources found</p></GlassCard>
        )}
      </div>

      {showAdd && (
        <AddResourceModal onClose={() => setShowAdd(false)} onSubmit={(data: any) => createMut.mutate(data)} />
      )}
    </div>
  );
}

function AddResourceModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (data: any) => void }) {
  const [form, setForm] = useState({ title: "", category: "Guides", description: "", fileUrl: "", resourceType: "doc" });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "480px", background: "#111118", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 600, color: "#fff", margin: 0 }}>Add Resource</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}><X style={{ width: 20, height: 20 }} /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginBottom: "4px", display: "block" }}>Title *</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginBottom: "4px", display: "block" }}>Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ ...inputStyle, appearance: "auto" }}>
              {["Guides", "Templates", "Forms", "Training", "Marketing"].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginBottom: "4px", display: "block" }}>Type</label>
            <select value={form.resourceType} onChange={(e) => setForm({ ...form, resourceType: e.target.value })} style={{ ...inputStyle, appearance: "auto" }}>
              {[["doc", "Document"], ["spreadsheet", "Spreadsheet"], ["video", "Video"], ["link", "External Link"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginBottom: "4px", display: "block" }}>Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
          </div>
          <div>
            <label style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginBottom: "4px", display: "block" }}>File URL or External Link</label>
            <input value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} style={inputStyle} placeholder="https://..." />
          </div>
          <PinkButton onClick={() => onSubmit(form)} style={{ marginTop: "8px" }}>Save</PinkButton>
        </div>
      </div>
    </div>
  );
}
