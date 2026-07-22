import type { NodeWarning } from "../lib/dataLayer";

interface Props {
  warningsById: Record<string, NodeWarning[]>;
  paperCount: number;
}

export default function ValidationPanel({ warningsById, paperCount }: Props) {
  const entries = Object.entries(warningsById).filter(([, ws]) => ws.length > 0);
  const total = entries.reduce((sum, [, ws]) => sum + ws.length, 0);

  if (total === 0) {
    return <div className="validation-panel validation-ok">검증 통과 — 표시된 {paperCount}편 모두 경고 없음</div>;
  }

  return (
    <div className="validation-panel validation-warn">
      <strong>검증 경고 {total}건 ({entries.length}개 노드)</strong> — 콘솔에도 출력됨
      <ul>
        {entries.map(([id, ws]) => (
          <li key={id}>
            {id}: {ws.length}건
          </li>
        ))}
      </ul>
    </div>
  );
}
