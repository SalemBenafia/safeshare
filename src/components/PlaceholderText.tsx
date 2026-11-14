const PLACEHOLDER = /(\[[A-Z_]+_\d+\])/;

/** Masked text with placeholders such as [PERSON_1] highlighted in the cloud colour. */
export function PlaceholderText({ text }: { text: string }) {
  return (
    <>
      {text.split(PLACEHOLDER).map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="rounded-sm bg-cloud-soft px-0.5 font-semibold text-cloud">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}
