import { useState, useEffect } from "react";
import {
  ChevronRight,
  ChevronLeft,
  Save,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

const accent = "#E91E8C";

interface Question {
  id: string;
  section: string;
  displayOrder: number;
  answerKey: string;
  questionText: string;
  helpText: string | null;
  inputType: string;
  options: string[] | null;
  isRequired: boolean;
  conditionalOnKey: string | null;
  conditionalOnValue: string | null;
}

interface QuestionSet {
  id: string;
  verticalId: string;
  verticalLabel: string;
}

interface SubmissionFlowProps {
  dealId: string;
  verticalId: string;
  quoteId?: string;
  onComplete?: (answers: Record<string, unknown>) => void;
  onClose?: () => void;
}

export default function SubmissionFlow({
  dealId,
  verticalId,
  quoteId,
  onComplete,
  onClose,
}: SubmissionFlowProps) {
  const [questionSet, setQuestionSet] = useState<QuestionSet | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [sections, setSections] = useState<string[]>([]);
  const [activeSection, setActiveSection] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedStatus, setSavedStatus] = useState<"saved" | "error" | null>(null);

  const baseUrl = import.meta.env.VITE_API_URL || `${window.location.origin}/api`;

  useEffect(() => {
    loadQuestionSet();
    loadSavedAnswers();
  }, [dealId, verticalId]);

  async function loadQuestionSet() {
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/submission/question-set/${verticalId}`);
      const data = await res.json();
      if (data.questions) {
        setQuestions(data.questions);
        setQuestionSet(data.questionSet);
        const uniqueSections = [...new Set(data.questions.map((q: Question) => q.section))];
        setSections(uniqueSections);
      }
    } catch {
      console.error("Failed to load question set");
    }
    setLoading(false);
  }

  async function loadSavedAnswers() {
    try {
      const res = await fetch(`${baseUrl}/submission/answers/${dealId}`);
      const data = await res.json();
      if (data.answers) {
        setAnswers((data.answers.answers as Record<string, unknown>) || {});
      }
    } catch {
      console.error("Failed to load saved answers");
    }
  }

  function getSectionQuestions(sectionName: string) {
    return questions.filter((q) => {
      if (q.section !== sectionName) return false;
      if (q.conditionalOnKey) {
        const depValue = answers[q.conditionalOnKey];
        const match =
          depValue === q.conditionalOnValue ||
          String(depValue) === q.conditionalOnValue ||
          (q.conditionalOnValue === "true" && depValue === true);
        if (!match) return false;
      }
      return true;
    });
  }

  function handleAnswer(key: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => { const e = { ...prev }; delete e[key]; return e; });
  }

  async function autoSave() {
    if (!questionSet) return;
    setSaving(true);
    try {
      const res = await fetch(`${baseUrl}/submission/answers/${dealId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, questionSetId: questionSet.id, quoteId, status: "draft" }),
      });
      setSavedStatus(res.ok ? "saved" : "error");
    } catch {
      setSavedStatus("error");
    }
    setSaving(false);
    setTimeout(() => setSavedStatus(null), 3000);
  }

  function validateSection(sectionName: string) {
    const sectionQuestions = getSectionQuestions(sectionName);
    const newErrors: Record<string, string> = {};
    sectionQuestions.forEach((q) => {
      if (
        q.isRequired &&
        (answers[q.answerKey] === undefined ||
          answers[q.answerKey] === "" ||
          answers[q.answerKey] === null)
      ) {
        newErrors[q.answerKey] = "This field is required.";
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleNext() {
    if (!validateSection(sections[activeSection])) return;
    await autoSave();
    if (activeSection < sections.length - 1) {
      setActiveSection((prev) => prev + 1);
      window.scrollTo(0, 0);
    }
  }

  async function handleSubmit() {
    if (!validateSection(sections[activeSection])) return;
    setSaving(true);
    try {
      const res = await fetch(`${baseUrl}/submission/answers/${dealId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers,
          questionSetId: questionSet?.id,
          quoteId,
          status: "submitted",
        }),
      });
      if (res.ok && onComplete) onComplete(answers);
    } catch {
      setSavedStatus("error");
    }
    setSaving(false);
  }

  function renderInput(q: Question) {
    const val = answers[q.answerKey] ?? "";
    const err = errors[q.answerKey];

    const inputBase: React.CSSProperties = {
      background: "#1a1a26",
      border: `1px solid ${err ? "#ff4d4f" : "rgba(255,255,255,0.08)"}`,
      borderRadius: 10,
      color: "#fff",
      padding: "10px 14px",
      width: "100%",
      fontSize: 14,
      outline: "none",
      boxSizing: "border-box",
    };

    if (q.inputType === "boolean") {
      return (
        <div style={{ display: "flex", gap: 12 }}>
          {(["true", "false"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => handleAnswer(q.answerKey, opt === "true")}
              style={{
                padding: "8px 24px",
                borderRadius: 8,
                border: `1px solid ${String(val) === opt ? accent : "rgba(255,255,255,0.08)"}`,
                background: String(val) === opt ? `${accent}22` : "rgba(255,255,255,0.04)",
                color: String(val) === opt ? accent : "rgba(255,255,255,0.7)",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              {opt === "true" ? "Yes" : "No"}
            </button>
          ))}
        </div>
      );
    }

    if (q.inputType === "select") {
      return (
        <select
          value={val as string}
          onChange={(e) => handleAnswer(q.answerKey, e.target.value)}
          style={{ ...inputBase, appearance: "none" as const }}
        >
          <option value="">Select...</option>
          {(q.options || []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    }

    if (q.inputType === "multiselect") {
      const selected = Array.isArray(val) ? val : val ? [val] : [];
      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {(q.options || []).map((opt) => {
            const active = selected.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  const next = active
                    ? selected.filter((s: string) => s !== opt)
                    : [...selected, opt];
                  handleAnswer(q.answerKey, next);
                }}
                style={{
                  padding: "6px 14px",
                  borderRadius: 20,
                  border: `1px solid ${active ? accent : "rgba(255,255,255,0.08)"}`,
                  background: active ? `${accent}22` : "rgba(255,255,255,0.04)",
                  color: active ? accent : "rgba(255,255,255,0.7)",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
      );
    }

    if (q.inputType === "textarea") {
      return (
        <textarea
          value={val as string}
          onChange={(e) => handleAnswer(q.answerKey, e.target.value)}
          rows={4}
          style={{ ...inputBase, resize: "vertical" as const }}
        />
      );
    }

    return (
      <input
        type={q.inputType === "number" ? "number" : q.inputType === "date" ? "date" : "text"}
        value={val as string}
        onChange={(e) => handleAnswer(q.answerKey, e.target.value)}
        style={inputBase}
      />
    );
  }

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 300,
          color: "rgba(255,255,255,0.5)",
        }}
      >
        Loading submission form...
      </div>
    );
  }

  const currentSection = sections[activeSection];
  const sectionQuestions = getSectionQuestions(currentSection);
  const isLastSection = activeSection === sections.length - 1;
  const progress = ((activeSection + 1) / sections.length) * 100;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(8px)",
        display: "flex",
        justifyContent: "center",
        overflowY: "auto",
        padding: "40px 20px 60px",
      }}
    >
      <div style={{ maxWidth: 760, width: "100%" }}>
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 600, margin: 0 }}>
              {questionSet?.verticalLabel} Workers' Compensation Application
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {saving && (
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Saving...</span>
              )}
              {savedStatus === "saved" && (
                <span
                  style={{
                    color: "#4caf50",
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <CheckCircle size={14} /> Saved
                </span>
              )}
              {savedStatus === "error" && (
                <span
                  style={{
                    color: "#ff4d4f",
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <AlertCircle size={14} /> Save failed
                </span>
              )}
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    background: "none",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.6)",
                    borderRadius: 8,
                    padding: "6px 14px",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  Close
                </button>
              )}
            </div>
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.08)",
              borderRadius: 4,
              height: 4,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                background: accent,
                borderRadius: 4,
                transition: "width 0.3s ease",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            {sections.map((s, i) => (
              <button
                key={s}
                type="button"
                onClick={() => i < activeSection && setActiveSection(i)}
                style={{
                  padding: "5px 14px",
                  borderRadius: 20,
                  border: `1px solid ${
                    i === activeSection
                      ? accent
                      : i < activeSection
                      ? "rgba(255,255,255,0.2)"
                      : "rgba(255,255,255,0.06)"
                  }`,
                  background: i === activeSection ? `${accent}22` : "transparent",
                  color:
                    i === activeSection
                      ? accent
                      : i < activeSection
                      ? "rgba(255,255,255,0.6)"
                      : "rgba(255,255,255,0.25)",
                  cursor: i < activeSection ? "pointer" : "default",
                  fontSize: 12,
                  fontWeight: i === activeSection ? 600 : 400,
                }}
              >
                {i < activeSection ? "\u2713 " : ""}
                {s}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            background: "#13131f",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            padding: 28,
          }}
        >
          <h3
            style={{
              color: "#fff",
              fontSize: 16,
              fontWeight: 600,
              marginTop: 0,
              marginBottom: 24,
              paddingBottom: 16,
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {currentSection}
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {sectionQuestions.map((q) => (
              <div key={q.id}>
                <label
                  style={{
                    display: "block",
                    color: "rgba(255,255,255,0.85)",
                    fontSize: 14,
                    marginBottom: 8,
                    fontWeight: 500,
                  }}
                >
                  {q.questionText}
                  {q.isRequired && (
                    <span style={{ color: accent, marginLeft: 4 }}>*</span>
                  )}
                </label>
                {q.helpText && (
                  <p
                    style={{
                      color: "rgba(255,255,255,0.4)",
                      fontSize: 12,
                      marginBottom: 8,
                      marginTop: -4,
                    }}
                  >
                    {q.helpText}
                  </p>
                )}
                {renderInput(q)}
                {errors[q.answerKey] && (
                  <p
                    style={{
                      color: "#ff4d4f",
                      fontSize: 12,
                      marginTop: 6,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <AlertCircle size={12} /> {errors[q.answerKey]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
          <button
            type="button"
            onClick={() => {
              if (activeSection > 0) setActiveSection((prev) => prev - 1);
            }}
            disabled={activeSection === 0}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 20px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "transparent",
              color: activeSection === 0 ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.7)",
              cursor: activeSection === 0 ? "not-allowed" : "pointer",
              fontSize: 14,
            }}
          >
            <ChevronLeft size={16} /> Back
          </button>

          <div style={{ display: "flex", gap: 12 }}>
            <button
              type="button"
              onClick={autoSave}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 20px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "transparent",
                color: "rgba(255,255,255,0.6)",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              <Save size={16} /> Save Draft
            </button>

            {isLastSection ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 24px",
                  borderRadius: 8,
                  border: "none",
                  background: accent,
                  color: "#fff",
                  cursor: saving ? "not-allowed" : "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                <CheckCircle size={16} /> Submit Application
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 24px",
                  borderRadius: 8,
                  border: "none",
                  background: accent,
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Next <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
