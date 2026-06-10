/** Shown when PAD-relevant address is rural — PAID requires the village (sat), not only the commune. */
export default function RuralAddressHint() {
  return (
    <p className="mb-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
      Pentru mediul rural, selectați <strong>satul</strong> unde se află imobilul (ex. Bățanii
      Mari), nu doar comuna. Folosiți codul poștal al satului sau autocompletarea străzii după
      ce alegeți localitatea.
    </p>
  );
}
