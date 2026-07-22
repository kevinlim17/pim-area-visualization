import type { EdgeRelationDetail } from "../lib/edgeDetail";

interface Props {
  detail: EdgeRelationDetail | null;
  onClear: () => void;
}

export default function EdgeRelationPanel({ detail, onClear }: Props) {
  return (
    <section className={`edge-relation-panel${detail ? " is-active" : ""}`} aria-live="polite" aria-label="선택한 Relation 설명">
      {detail ? (
        <>
          <div className="edge-relation-heading">
            <div>
              <span>{detail.suggested ? "제안 Edge" : "확정 Relation"}</span>
              <strong>{detail.title}</strong>
            </div>
            <button type="button" onClick={onClear} aria-label="Relation 설명 닫기">닫기</button>
          </div>
          <div className="edge-relation-body">
            <strong>{detail.relation}</strong>
            <p>{detail.description}</p>
            <small>{detail.meta}</small>
          </div>
        </>
      ) : (
        <p className="edge-relation-empty">Edge를 두 번 클릭하면 이곳에 Relation 설명이 표시됩니다.</p>
      )}
    </section>
  );
}
