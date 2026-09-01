export function MainTextPane({ text, isStreaming }: { text: string; isStreaming: boolean }) {
  return (
    <div className="st-maintext">
      {text}{isStreaming && <span className="st-cursor" aria-hidden="true" />}
    </div>
  );
}
