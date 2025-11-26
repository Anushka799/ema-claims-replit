import React, { useState, useRef } from "react";

// --- Mock AI functions (simulate LLM + Vision) ---
const mockVisionAnalyze = async (file) => {
  await new Promise((r) => setTimeout(r, 900));
  const name = file?.name || "photo.jpg";
  const severity = name.toLowerCase().includes("major") ? "High" : name.toLowerCase().includes("minor") ? "Low" : "Medium";
  const estimate = severity === "High" ? 4200 : severity === "Low" ? 480 : 1800;
  const damageSummary = `Detected ${severity} damage to bumper/front panel based on photo (${name}).`;
  return { damageSummary, severity, estimate };
};

const mockLLMSummarize = async (text, vision) => {
  await new Promise((r) => setTimeout(r, 600));
  const claimantMatch = text.match(/name:?\s*([A-Za-z ]+)/i);
  const dateMatch = text.match(/date:?\s*(\d{4}-\d{2}-\d{2})/i);
  const locMatch = text.match(/location:?\s*([A-Za-z0-9, ]+)/i);

  return {
    claimant: claimantMatch ? claimantMatch[1].trim() : "John Doe",
    incidentDate: dateMatch ? dateMatch[1] : new Date().toISOString().slice(0, 10),
    location: locMatch ? locMatch[1].trim() : "Unknown",
    autoFilledNotes: `${vision.damageSummary} Witness statement: ${text.slice(0, 180)}...`,
  };
};

const mockTriage = async (combined) => {
  await new Promise((r) => setTimeout(r, 400));
  const severityScore = combined.severity === "High" ? 0.9 : combined.severity === "Medium" ? 0.6 : 0.2;
  const fraudScore = (combined.description?.toLowerCase().includes("staged") ? 0.7 : 0.1) + (Math.random() * 0.2);
  const route = severityScore > 0.8 ? "Senior Adjuster" : severityScore > 0.4 ? "Field Adjuster" : "Auto-Settle Bot";
  return { severityScore: severityScore.toFixed(2), fraudScore: fraudScore.toFixed(2), route };
};

// --- Main Component ---
export default function App() {
  const [upload, setUpload] = useState(null);
  const [textInput, setTextInput] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [adjusterQueue, setAdjusterQueue] = useState([]);
  const fileRef = useRef();

  const handleFile = (e) => {
    const f = e.target.files[0];
    setUpload(f || null);
  };

  const runAnalysis = async () => {
    setLoading(true);
    setAnalysis(null);
    try {
      const vision = upload ? await mockVisionAnalyze(upload) : await mockVisionAnalyze({ name: "no-photo.jpg" });
      const llm = await mockLLMSummarize(textInput || "", vision);
      const triage = await mockTriage({ severity: vision.severity, description: textInput });

      const result = {
        vision,
        llm,
        triage,
        suggestedPayout: Math.round(vision.estimate * (1 - parseFloat(triage.fraudScore || 0) * 0.25)),
      };

      setAnalysis(result);

      const task = {
        id: Date.now(),
        claimant: llm.claimant,
        severity: vision.severity,
        route: triage.route,
        fraudScore: triage.fraudScore,
      };
      setAdjusterQueue((q) => [task, ...q].slice(0, 8));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const quickExample = (type) => {
    if (type === "minor") setTextInput("Name: Anushka Gupta\nDate: 2025-11-24\nLocation: Downtown, City\nDescription: Low-speed rear-end collision, no injuries.");
    if (type === "major") setTextInput("Name: Ravi Kumar\nDate: 2025-11-22\nLocation: Highway 8\nDescription: High impact front collision, airbags deployed. Suspect staged? no.");
  };

  return (
    <div style={{ fontFamily: "Inter, system-ui, Arial", background: "#f7fafc", minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", background: "white", borderRadius: 12, padding: 20, boxShadow: "0 6px 18px rgba(15,23,42,0.08)", display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>AI FNOL Assistant</h2>
          <p style={{ color: "#4b5563" }}>Upload a photo or paste a short description. The agent will extract fields, analyze damage, and triage the claim.</p>

          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, marginTop: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Accident Photo (optional)</label>
            <input ref={fileRef} onChange={handleFile} type="file" accept="image/*" style={{ marginTop: 8 }} />
            {upload && <div style={{ marginTop: 8, fontSize: 13, color: "#374151" }}>Selected: {upload.name}</div>}
          </div>

          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, marginTop: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Claimant / Incident Description</label>
            <textarea value={textInput} onChange={(e) => setTextInput(e.target.value)} rows={6} style={{ marginTop: 8, padding: 8, width: "100%", borderRadius: 6, border: "1px solid #e5e7eb" }} placeholder={`Example:\nName: Jane Doe\nDate: 2025-11-24\nLocation: Main St\nDescription: Rear-ended at a stop light.`} />
            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <button onClick={() => quickExample("minor")} style={{ padding: "8px 12px", borderRadius: 8, background: "#4f46e5", color: "white", border: "none" }}>Load Minor Example</button>
              <button onClick={() => quickExample("major")} style={{ padding: "8px 12px", borderRadius: 8, background: "#dc2626", color: "white", border: "none" }}>Load Major Example</button>
              <button onClick={runAnalysis} style={{ marginLeft: "auto", padding: "8px 16px", borderRadius: 8, background: "#16a34a", color: "white", border: "none" }} disabled={loading}>{loading ? 'Analyzing...' : 'Run Agent'}</button>
            </div>
          </div>

          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, marginTop: 12 }}>
            <h3 style={{ fontWeight: 700 }}>Analysis</h3>
            {!analysis && <div style={{ color: "#6b7280", marginTop: 8 }}>No analysis yet. Click <strong>Run Agent</strong> to simulate AI intake & triage.</div>}
            {analysis && (
              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ padding: 10, border: "1px solid #eef2ff", borderRadius: 8 }}>
                  <h4 style={{ fontWeight: 700 }}>Auto-filled FNOL</h4>
                  <div style={{ marginTop: 8, fontSize: 14 }}><strong>Claimant:</strong> {analysis.llm.claimant}</div>
                  <div style={{ fontSize: 14 }}><strong>Date:</strong> {analysis.llm.incidentDate}</div>
                  <div style={{ fontSize: 14 }}><strong>Location:</strong> {analysis.llm.location}</div>
                  <div style={{ marginTop: 8, fontSize: 14 }}><strong>Notes:</strong> {analysis.llm.autoFilledNotes}</div>
                </div>

                <div style={{ padding: 10, border: "1px solid #eef2ff", borderRadius: 8 }}>
                  <h4 style={{ fontWeight: 700 }}>Vision + Triage</h4>
                  <div style={{ marginTop: 8, fontSize: 14 }}><strong>Damage:</strong> {analysis.vision.damageSummary}</div>
                  <div style={{ fontSize: 14 }}><strong>Severity:</strong> {analysis.vision.severity}</div>
                  <div style={{ fontSize: 14 }}><strong>Estimated Repair:</strong> ₹{analysis.vision.estimate}</div>
                  <div style={{ fontSize: 14 }}><strong>Fraud Score:</strong> {analysis.triage.fraudScore}</div>
                  <div style={{ fontSize: 14 }}><strong>Suggested Route:</strong> {analysis.triage.route}</div>
                  <div style={{ marginTop: 8, fontSize: 14 }}><strong>Suggested Payout:</strong> ₹{analysis.suggestedPayout}</div>
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 12, fontSize: 12, color: "#6b7280" }}>Reference spec: /mnt/data/Ema APM THP - Claims Processing.pdf</div>
        </div>

        <aside style={{ borderLeft: "1px solid #e5e7eb", paddingLeft: 12 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Adjuster Workspace</h3>
          <p style={{ color: "#4b5563", marginBottom: 12 }}>Tasks created by agent for adjusters. Click a task to mark as picked up.</p>

          <div style={{ display: "grid", gap: 10 }}>
            {adjusterQueue.length === 0 && <div style={{ color: "#6b7280" }}>No outstanding tasks.</div>}
            {adjusterQueue.map((t) => (
              <div key={t.id} style={{ padding: 10, borderRadius: 8, border: "1px solid #e5e7eb", background: "white", boxShadow: "0 1px 2px rgba(15,23,42,0.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{t.claimant}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>Severity: {t.severity} · Fraud: {t.fraudScore}</div>
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>Route: {t.route}</div>
                  </div>
                  <div>
                    <button onClick={() => setAdjusterQueue((q) => q.filter((x) => x.id !== t.id))} style={{ fontSize: 12, padding: "6px 8px", borderRadius: 8, background: "#4f46e5", color: "white", border: "none" }}>Pick</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            <h4 style={{ fontWeight: 700, fontSize: 13 }}>Quick Metrics</h4>
            <div style={{ marginTop: 8, fontSize: 13, color: "#4b5563" }}>Pending Tasks: {adjusterQueue.length}</div>
            <div style={{ marginTop: 6, fontSize: 13, color: "#4b5563" }}>Last Analysis: {analysis ? new Date().toLocaleTimeString() : '—'}</div>
          </div>
        </aside>
      </div>

      <div style={{ maxWidth: 1100, margin: "20px auto 40px", color: "#6b7280", fontSize: 13 }}>
        <h4 style={{ fontWeight: 700 }}>Deploy</h4>
        <ol>
          <li>Create a new React project (Vite or CRA).</li>
          <li>Copy <code>src/App.jsx</code> from this repo into your project.</li>
          <li>Run <code>npm run dev</code> (Vite) or <code>npm start</code> (CRA).</li>
        </ol>
        <div style={{ marginTop: 8 }}>Note: AI calls are mocked locally — to connect real models, replace <code>mockVisionAnalyze</code>, <code>mockLLMSummarize</code>, and <code>mockTriage</code> with API calls to your model infra.</div>
      </div>
    </div>
  );
}
