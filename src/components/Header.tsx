export type TabId = 'balls' | 'slots' | 'frame';

interface Tab {
  id: TabId;
  label: string;
  badge: string;
}

const TABS: Tab[] = [
  { id: 'balls', label: 'Balls', badge: 'demo' },
  { id: 'slots', label: 'Slots', badge: 'slot' },
  { id: 'frame', label: 'Frame', badge: 'preview' },
];

interface Props {
  active: TabId;
  onChange: (id: TabId) => void;
}

export function Header({ active, onChange }: Props) {
  return (
    <header className="app-header">
      <nav className="tab-list" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active === tab.id}
            className={`tab-btn${active === tab.id ? ' tab-btn--active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
            <span className={`tab-badge tab-badge--${tab.id}`}>{tab.badge}</span>
          </button>
        ))}
      </nav>
    </header>
  );
}
