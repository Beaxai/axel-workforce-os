import React from 'react';
import { FileText, Pencil, Trash2 } from 'lucide-react';

const MOCK_DATA = [
  { id: 1, name: "Rate Indication — $126,713 to $154,872", type: "Indication", date: "7/2/2026", by: "System" },
  { id: 2, name: "Application Summary", type: "Summary", date: "7/2/2026", by: "System" },
  { id: 3, name: "WC Application", type: "Application", date: "—", by: "System" },
  { id: 4, name: "Emerald Coast Binder", type: "Binder", date: "7/26/2026", by: "Sarah Mitchell", hover: true },
  { id: 5, name: "Signed Policy 2026", type: "Policy", date: "7/26/2026", by: "Marcus Chen" },
];

export default function AlignedColumns() {
  return (
    <div style={{ padding: '40px', background: '#0b0d16', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        .ac-wrapper {
          --card-bg: rgba(255, 255, 255, 0.03);
          --card-border: rgba(255, 255, 255, 0.10);
          --row-border: rgba(255, 255, 255, 0.08);
          --hover-bg: rgba(255, 255, 255, 0.05);
          --text-muted: rgba(255, 255, 255, 0.55);
          --accent-pink: #E91E8C;
        }
        
        .ac-container {
          container-type: inline-size;
          container-name: docList;
          margin-bottom: 40px;
        }

        .ac-label {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.4);
          margin-bottom: 12px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .ac-card {
          border: 1px solid var(--card-border);
          border-radius: 12px;
          background: var(--card-bg);
          overflow: hidden;
        }

        .ac-grid {
          display: grid;
          grid-template-columns: 16px minmax(0, 1fr) 92px 88px 120px;
          gap: 12px;
          align-items: center;
        }

        .ac-header {
          padding: 12px 16px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-muted);
          border-bottom: 1px solid var(--row-border);
        }

        .ac-row {
          padding: 13px 16px;
          border-bottom: 1px solid var(--row-border);
          transition: background 0.15s ease;
        }
        
        .ac-row:last-child {
          border-bottom: none;
        }

        .ac-row:hover, .ac-row.ac-hover-state {
          background: var(--hover-bg);
        }

        .ac-icon {
          color: var(--text-muted);
          display: flex;
        }

        .ac-name-cell {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-width: 0;
          padding-right: 68px; /* Room for action buttons */
        }

        .ac-name-text {
          font-size: 13.5px;
          font-weight: 500;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ac-meta-mobile {
          display: none;
          font-size: 11.5px;
          color: var(--text-muted);
          margin-top: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ac-type, .ac-date, .ac-by {
          font-size: 11.5px;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ac-actions {
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          gap: 6px;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.15s ease;
        }

        .ac-row:hover .ac-actions, .ac-row.ac-hover-state .ac-actions {
          opacity: 1;
          pointer-events: auto;
        }

        .ac-btn {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.8);
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
          padding: 0;
        }

        .ac-btn:hover {
          background: var(--accent-pink);
          border-color: var(--accent-pink);
          color: #fff;
        }

        @container docList (max-width: 640px) {
          .ac-grid {
            grid-template-columns: 16px minmax(0, 1fr);
          }
          
          .ac-header .ac-type,
          .ac-header .ac-date,
          .ac-header .ac-by,
          .ac-row .ac-type,
          .ac-row .ac-date,
          .ac-row .ac-by {
            display: none;
          }

          .ac-meta-mobile {
            display: block;
          }
        }
      `}</style>

      <div className="ac-wrapper" style={{ maxWidth: '900px', margin: '0 auto' }}>
        
        {/* WIDE VERSION */}
        <div className="ac-container">
          <div className="ac-label">Wide &middot; ~900px</div>
          <div className="ac-card">
            <div className="ac-grid ac-header">
              <div className="ac-icon-spacer"></div>
              <div className="ac-name-col">Document</div>
              <div className="ac-type">Type</div>
              <div className="ac-date">Uploaded</div>
              <div className="ac-by">By</div>
            </div>
            <div className="ac-body">
              {MOCK_DATA.map((doc) => (
                <div key={`wide-${doc.id}`} className={`ac-grid ac-row ${doc.hover ? 'ac-hover-state' : ''}`}>
                  <div className="ac-icon">
                    <FileText size={16} strokeWidth={1.75} />
                  </div>
                  <div className="ac-name-cell">
                    <span className="ac-name-text" title={doc.name}>{doc.name}</span>
                    <div className="ac-meta-mobile">
                      {doc.type} &middot; {doc.date !== '—' ? doc.date : 'Pending'} &middot; {doc.by}
                    </div>
                    <div className="ac-actions">
                      <button className="ac-btn" aria-label="Rename">
                        <Pencil size={13} strokeWidth={2} />
                      </button>
                      <button className="ac-btn" aria-label="Delete">
                        <Trash2 size={13} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                  <div className="ac-type">{doc.type}</div>
                  <div className="ac-date">{doc.date}</div>
                  <div className="ac-by">{doc.by}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* NARROW VERSION */}
        <div className="ac-container" style={{ maxWidth: '420px' }}>
          <div className="ac-label">Narrow &middot; ~420px</div>
          <div className="ac-card">
            <div className="ac-grid ac-header">
              <div className="ac-icon-spacer"></div>
              <div className="ac-name-col">Document</div>
              <div className="ac-type">Type</div>
              <div className="ac-date">Uploaded</div>
              <div className="ac-by">By</div>
            </div>
            <div className="ac-body">
              {MOCK_DATA.map((doc) => (
                <div key={`narrow-${doc.id}`} className={`ac-grid ac-row ${doc.hover ? 'ac-hover-state' : ''}`}>
                  <div className="ac-icon">
                    <FileText size={16} strokeWidth={1.75} />
                  </div>
                  <div className="ac-name-cell">
                    <span className="ac-name-text" title={doc.name}>{doc.name}</span>
                    <div className="ac-meta-mobile">
                      {doc.type} &middot; {doc.date !== '—' ? doc.date : 'Pending'} &middot; {doc.by}
                    </div>
                    <div className="ac-actions">
                      <button className="ac-btn" aria-label="Rename">
                        <Pencil size={13} strokeWidth={2} />
                      </button>
                      <button className="ac-btn" aria-label="Delete">
                        <Trash2 size={13} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                  <div className="ac-type">{doc.type}</div>
                  <div className="ac-date">{doc.date}</div>
                  <div className="ac-by">{doc.by}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
