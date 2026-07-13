import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetJourneyTemplates,
  useCreateJourneyTemplate,
  getGetJourneyTemplatesQueryKey,
  type GetJourneyTemplatesParams,
  type CreateJourneyTemplateRequestType,
  type CreateJourneyTemplateRequestProductType,
} from "@workspace/api-client-react";
import { GlassCard, SectionHeader, PrimaryButton, GhostButton, AxelBadge, AxelModal } from "@/components/ui/axel-index";
import { useThemeColors } from "@/lib/use-theme-colors";
import { Plus } from "lucide-react";

const TYPE_OPTIONS = ["IMPLEMENTATION", "ONBOARDING"] as const;
const PRODUCT_OPTIONS = ["WC", "PEO", "ASO", "ANY"] as const;

const TYPE_BADGE_COLOR: Record<string, string> = {
  IMPLEMENTATION: "purple",
  ONBOARDING: "blue",
};

function fmtDate(v?: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function JourneyTemplates() {
  const c = useThemeColors();
  const queryClient = useQueryClient();

  const [typeFilter, setTypeFilter] = useState<string>("");
  const [productFilter, setProductFilter] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);

  const params: GetJourneyTemplatesParams = {};
  if (typeFilter) params.type = typeFilter as GetJourneyTemplatesParams["type"];
  if (productFilter) params.productType = productFilter as GetJourneyTemplatesParams["productType"];
  if (activeFilter) params.isActive = activeFilter === "active";

  const { data: templates, isLoading, error } = useGetJourneyTemplates(params);

  const selectStyle: React.CSSProperties = {
    background: c.inputBg,
    border: `1px solid ${c.inputBorder}`,
    borderRadius: "8px",
    color: c.inputText,
    fontSize: "13.5px",
    padding: "8px 10px",
    outline: "none",
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
        <SectionHeader
          title="Journey Playbooks"
          subtitle="Templates that drive implementation and onboarding journeys when deals bind"
        />
        <PrimaryButton data-testid="button-new-template" onClick={() => setShowCreate(true)} style={{ display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}>
          <Plus size={16} /> New Template
        </PrimaryButton>
      </div>

      {/* FILTERS */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
        <select data-testid="select-filter-type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={selectStyle}>
          <option value="">All types</option>
          {TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select data-testid="select-filter-product" value={productFilter} onChange={(e) => setProductFilter(e.target.value)} style={selectStyle}>
          <option value="">All products</option>
          {PRODUCT_OPTIONS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select data-testid="select-filter-active" value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)} style={selectStyle}>
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* LIST */}
      {isLoading ? (
        <GlassCard><span style={{ color: c.textMuted, fontSize: "14px" }}>Loading templates…</span></GlassCard>
      ) : error ? (
        <GlassCard><span style={{ color: "#ef4444", fontSize: "14px" }}>Failed to load templates.</span></GlassCard>
      ) : !templates || templates.length === 0 ? (
        <GlassCard>
          <span data-testid="text-empty-templates" style={{ color: c.textMuted, fontSize: "14px" }}>
            No templates match. Create one with “New Template”.
          </span>
        </GlassCard>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {templates.map((t) => (
            <GlassCard key={t.id} padding="16px 20px">
              <div data-testid={`row-template-${t.id}`} style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "15px", fontWeight: 600, color: c.textPrimary }}>{t.name}</span>
                <AxelBadge label={t.type} color={TYPE_BADGE_COLOR[t.type] || "gray"} />
                <AxelBadge label={t.productType} color="gray" />
                <AxelBadge label={t.isActive ? "Active" : "Inactive"} color={t.isActive ? "green" : "gray"} />
                <span style={{ marginLeft: "auto", fontSize: "12.5px", color: c.textMuted, whiteSpace: "nowrap" }}>
                  v{t.version} · Updated {fmtDate(t.updatedAt)}
                </span>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateTemplateModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: getGetJourneyTemplatesQueryKey().slice(0, 1) });
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}

function CreateTemplateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const c = useThemeColors();
  const createTemplate = useCreateJourneyTemplate();

  const [name, setName] = useState("");
  const [type, setType] = useState<CreateJourneyTemplateRequestType>("IMPLEMENTATION");
  const [productType, setProductType] = useState<CreateJourneyTemplateRequestProductType>("WC");
  const [isActive, setIsActive] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fieldStyle: React.CSSProperties = {
    width: "100%",
    background: c.inputBg,
    border: `1px solid ${c.inputBorder}`,
    borderRadius: "8px",
    color: c.inputText,
    fontSize: "14px",
    padding: "9px 12px",
    outline: "none",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "12.5px",
    fontWeight: 600,
    color: c.labelText,
    marginBottom: "6px",
  };

  const canSubmit = name.trim().length > 0 && !createTemplate.isPending;

  const submit = () => {
    if (!canSubmit) return;
    setSubmitError(null);
    createTemplate.mutate(
      { data: { name: name.trim(), type, productType, isActive } },
      {
        onSuccess: onCreated,
        onError: () => setSubmitError("Failed to create template. Please try again."),
      },
    );
  };

  return (
    <AxelModal isOpen onClose={onClose} title="New Journey Template">
      <div style={{ width: "420px", maxWidth: "100%", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <label style={labelStyle}>Name</label>
          <input
            data-testid="input-template-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. WC Bind Journey"
            style={fieldStyle}
            autoFocus
          />
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Type</label>
            <select data-testid="select-template-type" value={type} onChange={(e) => setType(e.target.value as CreateJourneyTemplateRequestType)} style={fieldStyle}>
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Product</label>
            <select data-testid="select-template-product" value={productType} onChange={(e) => setProductType(e.target.value as CreateJourneyTemplateRequestProductType)} style={fieldStyle}>
              {PRODUCT_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px", color: c.textSecondary }}>
          <input
            data-testid="checkbox-template-active"
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            style={{ accentColor: "var(--accent-primary)", width: "16px", height: "16px" }}
          />
          Active (instantiates on bind)
        </label>
        {submitError && <span style={{ color: "#ef4444", fontSize: "13px" }}>{submitError}</span>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "4px" }}>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton data-testid="button-create-template" onClick={submit} disabled={!canSubmit}>
            {createTemplate.isPending ? "Creating…" : "Create Template"}
          </PrimaryButton>
        </div>
      </div>
    </AxelModal>
  );
}
