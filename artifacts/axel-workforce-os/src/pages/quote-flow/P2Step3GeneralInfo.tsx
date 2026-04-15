import { useQuoteFlowStore } from "@/lib/quote-flow-store";
import { FormSection, FieldLabel, TextInput, TextArea, YesNoToggle } from "@/components/quote-flow/FormFields";

const QUESTIONS = [
  { id: "q1", text: "Does applicant own, operate or lease aircraft / watercraft?" },
  { id: "q2", text: "Do past, present or discontinued operations involve storing, treating, discharging, applying, disposing, or transporting hazardous material?" },
  { id: "q3", text: "Any work performed underground or above 15 feet?" },
  { id: "q4", text: "Any work performed on barges, vessels, docks, or bridge over water?" },
  { id: "q5", text: "Is applicant engaged in any other type of business?" },
  { id: "q6", text: "Are sub-contractors used?", followUp: { type: "number", label: "% of work subcontracted" } },
  { id: "q7", text: "Any work sublet without certificates of insurance?" },
  { id: "q8", text: "Is a written safety program in operation?" },
  { id: "q9", text: "Any group transportation provided?" },
  { id: "q10", text: "Any employees under 16 or over 60 years of age?" },
  { id: "q11", text: "Any seasonal employees?" },
  { id: "q12", text: "Is there any volunteer or donated labor?", followUp: { type: "text", label: "Specify" } },
  { id: "q13", text: "Any employees with physical handicaps?" },
  { id: "q14", text: "Do employees travel out of state?", followUp: { type: "text", label: "States and frequency" } },
  { id: "q15", text: "Are athletic teams sponsored?" },
  { id: "q16", text: "Are physicals required after offers of employment?" },
  { id: "q17", text: "Any other insurance with this insurer?" },
  { id: "q18", text: "Any prior coverage declined / cancelled / non-renewed in the last three (3) years?" },
  { id: "q19", text: "Are employee health plans provided?" },
  { id: "q20", text: "Do any employees perform work for other businesses or subsidiaries?" },
  { id: "q21", text: "Do you lease employees to or from other employers?" },
  { id: "q22", text: "Do any employees predominantly work at home?", followUp: { type: "number", label: "# of employees" } },
  { id: "q23", text: "Any tax liens or bankruptcy within the last 5 years?", followUp: { type: "text", label: "Specify" } },
  { id: "q24", text: "Any undisputed and unpaid workers compensation premium due?", followUp: { type: "textarea", label: "Explain with entity names and policy numbers" } },
];

export default function P2Step3GeneralInfo() {
  const s = useQuoteFlowStore();
  const q = s.generalQuestions;
  const details = s.generalQuestionsDetails;

  const setQ = (id: string, val: string) => {
    s.update({ generalQuestions: { ...q, [id]: val } });
  };

  const setDetail = (id: string, val: string) => {
    s.update({ generalQuestionsDetails: { ...details, [id]: val } });
  };

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto" }}>
      <FormSection title="General Underwriting Questions" subtitle="Answer Yes or No to each question">
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {QUESTIONS.map((question, i) => (
            <div
              key={question.id}
              style={{
                padding: "14px 16px",
                borderRadius: 10,
                background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                <span style={{ fontSize: 14, color: "#ccc", flex: 1 }}>
                  <span style={{ color: "#666", marginRight: 8 }}>{i + 1}.</span>
                  {question.text}
                </span>
                <YesNoToggle value={q[question.id] || ""} onChange={(v) => setQ(question.id, v)} />
              </div>
              {question.followUp && q[question.id] === "Yes" && (
                <div style={{ marginTop: 12, marginLeft: 28 }}>
                  <FieldLabel label={question.followUp.label}>
                    {question.followUp.type === "textarea" ? (
                      <TextArea
                        value={details[question.id] || ""}
                        onChange={(v) => setDetail(question.id, v)}
                        rows={3}
                      />
                    ) : (
                      <TextInput
                        value={details[question.id] || ""}
                        onChange={(v) => setDetail(question.id, v)}
                        type={question.followUp.type}
                        style={{ maxWidth: 300 }}
                      />
                    )}
                  </FieldLabel>
                </div>
              )}
            </div>
          ))}
        </div>
      </FormSection>
    </div>
  );
}
