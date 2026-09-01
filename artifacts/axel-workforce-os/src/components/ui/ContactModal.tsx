import { useState, useEffect } from "react";
import { Modal, GhostButton } from "./axel-index";
import { useContactRoles } from "@/hooks/use-contact-roles";
import { useThemeStore } from "@/lib/theme-store";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  onDelete?: () => void;
  initialData?: any;
  entityType: string;
  title?: string;
}

export function ContactModal({ isOpen, onClose, onSubmit, onDelete, initialData, entityType, title }: ContactModalProps) {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const { data: rolesDict } = useContactRoles();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    title: "",
    role: "",
    email: "",
    phone: "",
    mobile: "",
    isPrimary: false,
  });

  useEffect(() => {
    if (isOpen && initialData) {
      setForm({
        firstName: initialData.firstName || "",
        lastName: initialData.lastName || "",
        title: initialData.title || "",
        role: initialData.role || "",
        email: initialData.email || "",
        phone: initialData.phone || "",
        mobile: initialData.mobile || "",
        isPrimary: initialData.isPrimary || false,
      });
    } else if (isOpen) {
      setForm({
        firstName: "",
        lastName: "",
        title: "",
        role: "",
        email: "",
        phone: "",
        mobile: "",
        isPrimary: false,
      });
    }
  }, [isOpen, initialData]);

  const roles = rolesDict?.[entityType] || [];

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--input-border)",
    background: "var(--input-bg)", color: "var(--input-text)", fontSize: "14px", outline: "none",
    boxSizing: "border-box"
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "13px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)", marginBottom: "4px", display: "block"
  };

  const handleSave = () => {
    onSubmit(form);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || (initialData ? "Edit Contact" : "Add Contact")}>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <label style={labelStyle}>First Name *</label>
            <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Last Name *</label>
            <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <label style={labelStyle}>Title</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={inputStyle} />
          </div>
          <div>
             <label style={labelStyle}>Role *</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} style={inputStyle}>
              <option value="">Select role...</option>
              {roles.map(r => (
                 <option key={r} value={r}>{r.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
           <label style={labelStyle}>Email *</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <label style={labelStyle}>Direct Phone</label>
             <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Mobile Phone</label>
             <input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--input-text)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={form.isPrimary}
              onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })}
              style={{ accentColor: "var(--accent-primary)", width: "16px", height: "16px" }}
            />
            Primary Contact
          </label>

        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
          {initialData && onDelete && (
            <GhostButton
              onClick={() => {
                if (window.confirm("Are you sure you want to delete this contact?")) {
                  onDelete();
                }
              }}
              style={{ color: "var(--destructive)", marginRight: "auto" }}
            >
              Delete
            </GhostButton>
          )}
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <button
            onClick={handleSave}
            disabled={!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.role}
            style={{
              background: "var(--accent-primary)", color: "#fff", border: "none",
              padding: "8px 16px", borderRadius: "8px", fontWeight: 600, cursor: "pointer",
               opacity: (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.role) ? 0.5 : 1
            }}
          >
            Save Contact
          </button>
        </div>
      </div>
    </Modal>
  );
}
