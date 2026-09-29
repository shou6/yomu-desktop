import { t } from '../l10n/t';
import { buildOutline, type Heading, type OutlineNode } from '../reader/outline';

interface OutlineProps {
  headings: Heading[];
  /** 今読んでいる見出しの番号。-1 なら無し */
  currentIndex: number;
  onSelect: (id: string) => void;
}

/** 目次（F-9）。見出しをレベルで入れ子にしたツリー */
function Outline({ headings, currentIndex, onSelect }: OutlineProps) {
  if (headings.length === 0) {
    return <p className="panel-empty">{t('This document has no headings.')}</p>;
  }
  const current = headings[currentIndex];
  const renderNodes = (nodes: OutlineNode[]) => (
    <ul>
      {nodes.map((node, index) => (
        <li key={`${node.heading.id}-${index}`}>
          <button
            type="button"
            className="outline-item"
            aria-current={node.heading === current ? 'true' : undefined}
            onClick={() => onSelect(node.heading.id)}
          >
            {node.heading.text}
          </button>
          {node.children.length > 0 && renderNodes(node.children)}
        </li>
      ))}
    </ul>
  );
  return <nav className="outline">{renderNodes(buildOutline(headings))}</nav>;
}

export default Outline;
