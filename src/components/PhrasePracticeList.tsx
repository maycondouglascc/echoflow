import type { ScenarioFixture } from "@/lib/fixtures/voice-comparison";

export function PhrasePracticeList({
  phrases,
  selectedId,
  onSelect,
}: {
  phrases: ScenarioFixture["phrases"];
  selectedId: string;
  onSelect(index: number): void;
}) {
  return (
    <ol className="phrase-list">
      {phrases.map((item, index) => (
        <li key={item.id}>
          <button
            type="button"
            data-feedback-action="select-phrase"
            aria-label={`Choose phrase ${index + 1}: ${item.text}`}
            aria-pressed={item.id === selectedId}
            onClick={() => onSelect(index)}
          >
            <span className="phrase-number">{String(index + 1).padStart(2, "0")}</span>
            <span>
              {item.text}
              <span className="sr-only">{item.category}</span>
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}
