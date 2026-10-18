import type { ScenarioFixture } from "@/lib/fixtures/voice-comparison";

export interface PhrasePracticeListProps {
  phrases: ScenarioFixture["phrases"];
  selectedId: string;
  onSelect(index: number): void;
  counts?: Readonly<Record<string, number>>;
  pending?: Readonly<Record<string, number>>;
  onRetry?: () => void;
}

export function PhrasePracticeList({
  phrases,
  selectedId,
  onSelect,
  counts,
  pending,
  onRetry,
}: PhrasePracticeListProps) {
  return (
    <ol className="phrase-list">
      {phrases.map((item, index) => {
        const isSelected = item.id === selectedId;
        const count = counts?.[item.id] ?? 0;
        const isHeard = count > 0;
        const pendingCount = pending?.[item.id] ?? 0;
        const hasPending = pendingCount > 0;

        const heardLabel = isHeard ? `, Heard ${count} ${count === 1 ? "time" : "times"}` : "";
        const unsavedLabel = hasPending ? ", Unsaved" : "";

        return (
          <li key={item.id} className="phrase-item">
            <button
              type="button"
              data-feedback-action="select-phrase"
              aria-label={`Choose phrase ${index + 1}: ${item.text}${heardLabel}${unsavedLabel}`}
              aria-pressed={isSelected}
              onClick={() => onSelect(index)}
              className="phrase-select-button"
            >
              <span className="phrase-number">{String(index + 1).padStart(2, "0")}</span>
              <span className="phrase-body">
                <span className="phrase-text">{item.text}</span>
                <span className="sr-only">{item.category}</span>
                {(isHeard || hasPending) && (
                  <span className="phrase-badges">
                    {isHeard && (
                      <span
                        className="phrase-badge phrase-heard-badge"
                        data-testid="phrase-heard-badge"
                      >
                        Heard{count > 1 ? ` (${count})` : ""}
                      </span>
                    )}
                    {hasPending && (
                      <span
                        className="phrase-badge phrase-unsaved-badge"
                        data-testid="phrase-unsaved-badge"
                      >
                        Unsaved
                      </span>
                    )}
                  </span>
                )}
              </span>
            </button>
            {hasPending && onRetry && (
              <button
                type="button"
                className="phrase-retry-button text-button"
                data-feedback-action="retry-phrase-history"
                aria-label={`Retry saving history for phrase ${index + 1}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onRetry();
                }}
              >
                Retry
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}
