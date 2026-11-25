import {
  DEPARTMENT_POLICIES,
  SEVERITY_RUBRIC,
} from '../shared/triageSchema';

const EXAMPLE_SCHEMA_JSON = `{
  "is_valid_civic_issue": true,
  "rejection_reason": null,
  "department": "Electrical & Streetlights (KSEB)",
  "issue_category": "Snapped Overhead Electrical Cable",
  "severity_score": 10,
  "severity_level": "Critical",
  "recommended_sla": "Immediate (0–4 hours)",
  "severity_reasoning": "A snapped overhead electrical cable is resting across a wet public carriageway adjacent to pedestrians and traffic.",
  "ticket_title": "Snapped Overhead Power Wire Near Anil Bakery, Ward 14",
  "formal_summary": "A detached overhead electrical cable has fallen onto the wet carriageway opposite Anil Bakery in Ward 14, requiring immediate KSEB line isolation and restoration.",
  "detected_language": "Manglish",
  "location_clues": "Aluva Municipality — Ward 14, Anil Bakery",
  "visual_verification_note": "Photo directly confirms a hanging electrical cable on a wet paved street.",
  "exaggeration_or_mismatch": false
}`;

export function RoutingPolicyView() {
  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
        <div className="p-5 sm:p-6">
          <h1 className="text-lg font-semibold text-slate-900 tracking-tight">
            Municipal Triage Rules &amp; Routing Policy
          </h1>
          <p className="mt-1 text-sm text-slate-600 leading-relaxed max-w-3xl">
            Every citizen submission is evaluated against seven strict Local Self-Government triage rules: visual spam filtering, multimodal visual cross-checking over exaggerated text, strict six-department routing, objective 1–10 severity scoring, single-sentence explainability, K-SMART formal English drafting, and schema-enforced JSON output.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                <th scope="col" className="py-3 pl-6 pr-3 whitespace-nowrap">Department</th>
                <th scope="col" className="py-3 px-3">Jurisdiction Scope</th>
                <th scope="col" className="py-3 pl-3 pr-6">Mapped Field Issues</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {DEPARTMENT_POLICIES.map((policy) => (
                <tr key={policy.department}>
                  <td className="py-3.5 pl-6 pr-3 font-medium text-slate-900 whitespace-nowrap align-top">
                    {policy.department}
                  </td>
                  <td className="py-3.5 px-3 text-xs text-slate-600 leading-relaxed align-top max-w-sm">
                    {policy.scope}
                  </td>
                  <td className="py-3.5 pl-3 pr-6 text-xs text-slate-700 leading-relaxed align-top">
                    {policy.examples.join(' · ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <section className="xl:col-span-7 bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
          <div className="p-5 sm:p-6">
            <h2 className="text-base font-semibold text-slate-900">
              Severity Scoring Matrix (0–10)
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Visual hazard evidence always supersedes exaggerated citizen claims.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th scope="col" className="py-3 pl-5 pr-3 whitespace-nowrap">Score</th>
                  <th scope="col" className="py-3 px-3 whitespace-nowrap">Tier &amp; SLA</th>
                  <th scope="col" className="py-3 pl-3 pr-5">Criteria &amp; Examples</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {SEVERITY_RUBRIC.map((tier) => (
                  <tr key={tier.band}>
                    <td className="py-3.5 pl-5 pr-3 font-mono font-semibold text-slate-900 whitespace-nowrap tabular-nums align-top">
                      {tier.range}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap align-top">
                      <p className="font-semibold text-slate-900">{tier.band}</p>
                      <p className="text-slate-500 mt-0.5">{tier.sla}</p>
                    </td>
                    <td className="py-3.5 pl-3 pr-5 text-slate-700 leading-relaxed align-top">
                      <p className="font-medium text-slate-800">{tier.criteria}</p>
                      <p className="mt-0.5 text-slate-500">{tier.examples}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="xl:col-span-5 bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
          <div className="p-5 sm:p-6">
            <h2 className="text-base font-semibold text-slate-900">
              K-SMART Strict JSON Output Contract
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Returned directly by <code className="font-mono text-slate-800">POST /api/triage</code> without markdown fences.
            </p>
          </div>
          <div className="p-5 sm:p-6">
            <pre className="p-4 rounded-md bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed overflow-x-auto">
              <code>{EXAMPLE_SCHEMA_JSON}</code>
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
}
