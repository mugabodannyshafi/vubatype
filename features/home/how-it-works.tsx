const STEPS = [
  { number: "01", text: "Choose Kinyarwanda or English." },
  { number: "02", text: "Join a race or challenge friends." },
  { number: "03", text: "Type fast and reach the finish line first." },
] as const;

export function HowItWorks() {
  return (
    <section className="flex flex-col gap-4 scroll-mt-20" id="how-it-works">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">How it works</h2>
      <ol className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((step) => (
          <li key={step.number} className="flex flex-col gap-1 border-t border-border pt-3">
            <span className="font-mono text-sm text-link tabular-nums">{step.number}</span>
            <p className="text-sm leading-6 text-foreground">{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
