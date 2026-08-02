import React, { useState } from 'react';
import {
  Star, ChevronRight, FileText, Activity, Folder,
  ClipboardList, ShieldCheck, FileSignature, Send, Paperclip,
  Plus, Calendar, Check,
  UserCircle2, MessageSquare, RefreshCcw, Circle, CheckCircle2,
  AlertTriangle, Clock, ListFilter,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types & hardcoded data
// ---------------------------------------------------------------------------

type TaskStatus = 'open' | 'completed';
type TaskBucket = 'overdue' | 'thisWeek' | 'later' | 'done';

interface DealTask {
  id: string;
  name: string;
  assigneeName: string | null;
  assigneeRole: string | null;
  dueDate: string;
  status: TaskStatus;
  bucket: TaskBucket;
  createdBy: string;
  createdOn: string;
}

const TASKS: DealTask[] = [
  {
    id: 't1',
    name: 'Collect loss runs for 2023–2025',
    assigneeName: 'Marcus Webb',
    assigneeRole: 'Claims Analyst',
    dueDate: 'Jul 29',
    status: 'open',
    bucket: 'overdue',
    createdBy: 'Sarah Chen',
    createdOn: 'Jul 21',
  },
  {
    id: 't2',
    name: 'Confirm class codes 0035 & 8017 with the carrier before binding',
    assigneeName: 'Sarah Chen',
    assigneeRole: 'Underwriter',
    dueDate: 'Aug 1',
    status: 'open',
    bucket: 'overdue',
    createdBy: 'Sarah Chen',
    createdOn: 'Jul 28',
  },
  {
    id: 't3',
    name: 'Schedule safety inspection for the Tampa grow facility',
    assigneeName: 'David Ruiz',
    assigneeRole: 'Loss Control',
    dueDate: 'Aug 4',
    status: 'open',
    bucket: 'thisWeek',
    createdBy: 'Marcus Webb',
    createdOn: 'Jul 30',
  },
  {
    id: 't4',
    name: 'Follow up on outstanding subjectivities with broker',
    assigneeName: 'Alex Johnson',
    assigneeRole: 'Broker Relations',
    dueDate: 'Aug 6',
    status: 'open',
    bucket: 'thisWeek',
    createdBy: 'Sarah Chen',
    createdOn: 'Aug 1',
  },
  {
    id: 't5',
    name: 'Verify certificate of insurance wording',
    assigneeName: null,
    assigneeRole: null,
    dueDate: 'Aug 12',
    status: 'open',
    bucket: 'later',
    createdBy: 'Alex Johnson',
    createdOn: 'Aug 1',
  },
  {
    id: 't6',
    name: 'Request updated payroll report',
    assigneeName: 'Sarah Chen',
    assigneeRole: 'Underwriter',
    dueDate: 'Jul 18',
    status: 'completed',
    bucket: 'done',
    createdBy: 'Sarah Chen',
    createdOn: 'Jul 12',
  },
  {
    id: 't7',
    name: 'Send indication to broker',
    assigneeName: 'Alex Johnson',
    assigneeRole: 'Broker Relations',
    dueDate: 'Jul 22',
    status: 'completed',
    bucket: 'done',
    createdBy: 'Marcus Webb',
    createdOn: 'Jul 15',
  },
];

const AVATAR_COLORS: Record<string, string> = {
  'Sarah Chen': 'from-[#E91E8C] to-fuchsia-600',
  'Marcus Webb': 'from-sky-500 to-blue-600',
  'David Ruiz': 'from-emerald-500 to-teal-600',
  'Alex Johnson': 'from-amber-500 to-orange-600',
};

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

// ---------------------------------------------------------------------------
// Small shared UI atoms
// ---------------------------------------------------------------------------

function Kpi({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div>
      <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1">{label}</div>
      <div className="text-xl sm:text-2xl font-light tabular-nums text-slate-200 flex items-baseline gap-1">
        {value} {suffix && <span className="text-[11px] text-slate-500 font-medium">{suffix}</span>}
      </div>
    </div>
  );
}

function NavItem({ active, icon, label }: { active?: boolean; icon: React.ReactNode; label: string }) {
  return (
    <button
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
        active
          ? 'bg-white/[0.07] text-white shadow-[inset_2px_0_0_#E91E8C]'
          : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
      }`}
    >
      {icon}
      <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
    </button>
  );
}

const STAGE_NAMES = ['Lead', 'Qualified', 'Submission', 'Quote', 'Bound', 'Live'];
const CURRENT_STAGE_IDX = 3;

function StageTracker() {
  return (
    <div className="h-12 border-t border-white/10 bg-slate-950/40 backdrop-blur-md px-4 sm:px-8 flex items-center gap-1 z-10 w-full overflow-x-auto no-scrollbar shrink-0">
      {STAGE_NAMES.map((name, idx) => {
        const isCurrent = idx === CURRENT_STAGE_IDX;
        const isPast = idx < CURRENT_STAGE_IDX;
        return (
          <React.Fragment key={name}>
            <div
              className={`flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold whitespace-nowrap px-3 py-1.5 rounded-md ${
                isCurrent
                  ? 'text-[#E91E8C] bg-[#E91E8C]/10'
                  : isPast
                  ? 'text-slate-300'
                  : 'text-slate-600'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isCurrent ? 'bg-[#E91E8C] shadow-[0_0_8px_#E91E8C]' : isPast ? 'bg-slate-400' : 'bg-slate-700'
                }`}
              />
              {name}
            </div>
            {idx < STAGE_NAMES.length - 1 && <ChevronRight className="w-3 h-3 text-slate-700 shrink-0" />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Center: Overview activity feed (context only)
// ---------------------------------------------------------------------------

interface FeedEvent {
  id: string;
  kind: 'system' | 'note' | 'doc';
  title: string;
  desc?: string;
  date: string;
  author?: string;
}

const FEED: FeedEvent[] = [
  { id: 'f1', kind: 'system', title: 'Stage moved to Quote', date: 'Aug 1, 09:14 AM' },
  {
    id: 'f2',
    kind: 'doc',
    title: 'Quote v2 — WC premium $48,200/yr generated',
    date: 'Aug 1, 09:20 AM',
  },
  {
    id: 'f3',
    kind: 'note',
    title: 'Note from Sarah Chen',
    desc: 'Carrier wants class codes confirmed before they finalize — flagged as a task. Otherwise appetite looks solid.',
    date: 'Aug 1, 11:02 AM',
    author: 'Sarah Chen',
  },
  {
    id: 'f4',
    kind: 'doc',
    title: 'Loss runs 2023-25.pdf uploaded',
    date: 'Jul 30, 03:45 PM',
  },
  {
    id: 'f5',
    kind: 'note',
    title: 'Note from Alex Johnson',
    desc: 'Broker confirmed the Tampa facility expansion — headcount will bump to ~48 by Q4.',
    date: 'Jul 29, 04:30 PM',
    author: 'Alex Johnson',
  },
];

function FeedRow({ ev }: { ev: FeedEvent }) {
  if (ev.kind === 'system') {
    return (
      <div className="flex items-start gap-3 py-1.5">
        <div className="w-6 h-6 shrink-0 rounded-full bg-slate-800/60 flex items-center justify-center border border-white/5 mt-0.5">
          <Activity className="w-3 h-3 text-slate-400" />
        </div>
        <div className="flex-1 pt-0.5">
          <div className="text-[13px] font-medium text-slate-300">{ev.title}</div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-0.5 tabular-nums">{ev.date}</div>
        </div>
      </div>
    );
  }

  const isDoc = ev.kind === 'doc';
  return (
    <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 hover:bg-slate-800/60 hover:border-white/10 transition-all">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1 rounded-lg border ${isDoc ? 'bg-blue-500/10 border-blue-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
            {isDoc ? <FileText className="w-3.5 h-3.5 text-blue-400" /> : <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />}
          </div>
          <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">{isDoc ? 'Document' : 'Note'}</span>
        </div>
        <div className="text-[10px] uppercase tracking-widest text-slate-500 tabular-nums font-medium">{ev.date}</div>
      </div>
      <h4 className="text-[13.5px] text-slate-200 font-medium leading-snug">{ev.title}</h4>
      {ev.desc && <p className="text-[12.5px] text-slate-400 mt-1.5 leading-relaxed">{ev.desc}</p>}
      {ev.author && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
          <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${AVATAR_COLORS[ev.author] ?? 'from-slate-600 to-slate-700'} border border-white/10 flex items-center justify-center text-[9px] text-white font-bold`}>
            {initials(ev.author)}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">{ev.author}</span>
        </div>
      )}
    </div>
  );
}

function OverviewContent() {
  return (
    <div className="flex-1 overflow-y-auto bg-[#07090E] flex flex-col">
      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        <div className="max-w-2xl mx-auto flex flex-col gap-3.5">
          <div className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">Activity</div>
          {FEED.map((ev) => (
            <FeedRow key={ev.id} ev={ev} />
          ))}
        </div>
      </div>
      {/* Composer */}
      <div className="shrink-0 border-t border-white/10 bg-slate-950/40 p-4 sm:px-8 sm:py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-2 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 focus-within:border-[#E91E8C]/40 transition-colors">
          <button className="text-slate-500 hover:text-slate-300 transition-colors">
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            type="text"
            placeholder="Add a note about this deal…"
            className="flex-1 bg-transparent outline-none text-[13px] text-slate-200 placeholder:text-slate-600"
          />
          <button className="p-1.5 rounded-lg bg-[#E91E8C] text-white hover:bg-[#d31a80] transition-colors">
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Right: Task Ledger panel — the star of the mockup
// ---------------------------------------------------------------------------

type FilterId = 'all' | 'mine' | 'overdue';
const CURRENT_USER = 'Sarah Chen';

function ProgressRing({ done, total }: { done: number; total: number }) {
  const size = 40;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = done / total;
  const offset = circumference * (1 - pct);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E91E8C"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 0 4px rgba(233,30,140,0.55))' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[9px] font-bold text-slate-200 tabular-nums">
          {done}/{total}
        </span>
      </div>
    </div>
  );
}

function FilterChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border transition-colors ${
        active
          ? 'bg-[#E91E8C]/15 border-[#E91E8C]/40 text-[#E91E8C]'
          : 'bg-transparent border-white/10 text-slate-500 hover:text-slate-300 hover:border-white/20'
      }`}
    >
      {label}
    </button>
  );
}

const BUCKET_META: Record<TaskBucket, { label: string; icon: React.ReactNode; dot: string }> = {
  overdue: { label: 'Overdue', icon: <AlertTriangle className="w-3 h-3" />, dot: 'bg-rose-500' },
  thisWeek: { label: 'This Week', icon: <Clock className="w-3 h-3" />, dot: 'bg-amber-400' },
  later: { label: 'Later', icon: <Calendar className="w-3 h-3" />, dot: 'bg-slate-400' },
  done: { label: 'Done', icon: <CheckCircle2 className="w-3 h-3" />, dot: 'bg-emerald-500' },
};

function CompactTaskCard({ task, onExpand }: { task: DealTask; onExpand: () => void }) {
  const isDone = task.status === 'completed';
  return (
    <button
      onClick={onExpand}
      className="w-full text-left group relative pl-0 pr-1 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors"
    >
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 shrink-0">
          {isDone ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          ) : (
            <Circle className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={`text-[12.5px] leading-snug font-medium break-words ${
              isDone ? 'text-slate-500 line-through decoration-slate-600' : 'text-slate-200'
            }`}
          >
            {task.name}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {task.assigneeName ? (
              <div className="flex items-center gap-1">
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-gradient-to-br ${AVATAR_COLORS[task.assigneeName] ?? 'from-slate-600 to-slate-700'} flex items-center justify-center text-[6.5px] text-white font-bold shrink-0`}
                >
                  {initials(task.assigneeName)}
                </div>
                <span className="text-[10.5px] text-slate-500 font-medium truncate">{task.assigneeName}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <UserCircle2 className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-[10.5px] text-slate-600 italic">Unassigned</span>
              </div>
            )}
            <span className="text-slate-700">·</span>
            <span
              className={`text-[10.5px] tabular-nums font-semibold ${
                task.bucket === 'overdue' && !isDone ? 'text-rose-400' : 'text-slate-500'
              }`}
            >
              {isDone ? `Completed ${task.dueDate}` : `Due ${task.dueDate}`}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function ExpandedTaskCard({ task, onCollapse }: { task: DealTask; onCollapse: () => void }) {
  return (
    <div className="rounded-2xl border border-[#E91E8C]/30 bg-gradient-to-b from-[#E91E8C]/[0.08] to-white/[0.02] p-4 shadow-[0_0_0_1px_rgba(233,30,140,0.08),0_8px_24px_-8px_rgba(233,30,140,0.25)]">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-widest text-[#E91E8C]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E91E8C] shadow-[0_0_6px_#E91E8C]" />
          Selected task
        </div>
        <button onClick={onCollapse} className="text-slate-500 hover:text-slate-300 text-[10px] uppercase tracking-wider font-bold">
          Collapse
        </button>
      </div>

      <h4 className="text-[14px] font-semibold text-white leading-snug mb-4">{task.name}</h4>

      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-2.5">
          {task.assigneeName ? (
            <div
              className={`w-7 h-7 rounded-full bg-gradient-to-br ${AVATAR_COLORS[task.assigneeName] ?? 'from-slate-600 to-slate-700'} flex items-center justify-center text-[10px] text-white font-bold shrink-0 border border-white/10`}
            >
              {initials(task.assigneeName)}
            </div>
          ) : (
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-dashed border-slate-600 flex items-center justify-center shrink-0">
              <UserCircle2 className="w-4 h-4 text-slate-500" />
            </div>
          )}
          <div className="leading-tight">
            <div className="text-[12.5px] font-semibold text-slate-100">{task.assigneeName ?? 'Unassigned'}</div>
            <div className="text-[10.5px] text-slate-500 uppercase tracking-wide">{task.assigneeRole ?? 'No role assigned'}</div>
          </div>
        </div>

        <button className="w-full flex items-center justify-between gap-2 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 hover:border-white/20 transition-colors">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[12px] text-slate-300 font-medium">Due {task.dueDate}, 2025</span>
          </div>
          <span className="text-[9.5px] uppercase tracking-wider text-slate-500 font-bold">Change</span>
        </button>

        <div className="text-[11px] text-slate-500 italic px-0.5">
          Created by {task.createdBy} · {task.createdOn}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="flex-1 flex items-center justify-center gap-1.5 bg-[#E91E8C] hover:bg-[#d31a80] text-white text-[11px] font-bold uppercase tracking-wider rounded-lg py-2 transition-colors">
          <Check className="w-3.5 h-3.5" /> Complete
        </button>
        <button className="flex-1 flex items-center justify-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 text-[11px] font-bold uppercase tracking-wider rounded-lg py-2 transition-colors">
          <RefreshCcw className="w-3.5 h-3.5" /> Reassign
        </button>
      </div>
    </div>
  );
}

function TaskGroup({
  bucket,
  tasks,
  expandedId,
  setExpandedId,
  isLast,
}: {
  bucket: TaskBucket;
  tasks: DealTask[];
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  isLast: boolean;
}) {
  if (tasks.length === 0) return null;
  const meta = BUCKET_META[bucket];

  return (
    <div className={`relative pl-4 ${isLast ? '' : 'pb-5'}`}>
      {/* timeline spine */}
      <div className="absolute left-[5px] top-2 bottom-0 w-px bg-white/[0.07]" />
      <div className="flex items-center gap-1.5 mb-2 relative">
        <div className={`absolute -left-4 w-2.5 h-2.5 rounded-full ${meta.dot} ring-4 ring-[#0A0C12]`} />
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{meta.label}</span>
        <span className="text-[10px] text-slate-600 font-semibold tabular-nums">({tasks.length})</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {tasks.map((task) =>
          expandedId === task.id ? (
            <ExpandedTaskCard key={task.id} task={task} onCollapse={() => setExpandedId(null)} />
          ) : (
            <CompactTaskCard key={task.id} task={task} onExpand={() => setExpandedId(task.id)} />
          )
        )}
      </div>
    </div>
  );
}

function TaskLedgerPanel() {
  const [filter, setFilter] = useState<FilterId>('all');
  const [expandedId, setExpandedId] = useState<string | null>('t2');
  const [showAdd, setShowAdd] = useState(false);

  const done = TASKS.filter((t) => t.status === 'completed').length;
  const total = TASKS.length;

  const filtered = TASKS.filter((t) => {
    if (filter === 'mine') return t.assigneeName === CURRENT_USER;
    if (filter === 'overdue') return t.bucket === 'overdue';
    return true;
  });

  const buckets: TaskBucket[] = ['overdue', 'thisWeek', 'later', 'done'];
  const grouped = buckets.map((b) => ({ bucket: b, tasks: filtered.filter((t) => t.bucket === b) }));
  const visibleBuckets = grouped.filter((g) => g.tasks.length > 0);

  return (
    <div className="hidden lg:flex w-[360px] shrink-0 border-l border-white/10 bg-[#0A0C12]/95 backdrop-blur-xl flex-col z-20">
      {/* Mini header */}
      <div className="shrink-0 p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <ProgressRing done={done} total={total} />
            <div className="leading-tight">
              <div className="text-[13px] font-semibold text-white">Task Ledger</div>
              <div className="text-[10.5px] text-slate-500 font-medium tabular-nums">{done} of {total} done</div>
            </div>
          </div>
          <button className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors">
            <ListFilter className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <FilterChip active={filter === 'all'} label="All" onClick={() => setFilter('all')} />
          <FilterChip active={filter === 'mine'} label="Mine" onClick={() => setFilter('mine')} />
          <FilterChip active={filter === 'overdue'} label="Overdue" onClick={() => setFilter('overdue')} />
        </div>
      </div>

      {/* Grouped list */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
        {visibleBuckets.length > 0 ? (
          visibleBuckets.map((g, idx) => (
            <TaskGroup
              key={g.bucket}
              bucket={g.bucket}
              tasks={g.tasks}
              expandedId={expandedId}
              setExpandedId={setExpandedId}
              isLast={idx === visibleBuckets.length - 1}
            />
          ))
        ) : (
          <div className="py-10 text-center text-[12px] text-slate-600 border border-dashed border-white/10 rounded-xl">
            No tasks match this filter.
          </div>
        )}
      </div>

      {/* Add task */}
      <div className="shrink-0 border-t border-white/10 p-3 bg-[#0A0C12]">
        {showAdd ? (
          <div className="bg-white/[0.04] border border-white/10 rounded-xl p-3 flex flex-col gap-2">
            <input
              autoFocus
              placeholder="Task name…"
              className="w-full bg-transparent outline-none text-[12.5px] text-slate-200 placeholder:text-slate-600 border-b border-white/10 pb-2"
            />
            <div className="flex items-center gap-2">
              <select className="flex-1 bg-white/[0.03] border border-white/10 rounded-md text-[11px] text-slate-300 px-2 py-1.5 outline-none">
                <option>Assignee…</option>
                <option>Sarah Chen</option>
                <option>Marcus Webb</option>
                <option>David Ruiz</option>
                <option>Alex Johnson</option>
              </select>
              <input
                type="date"
                className="flex-1 bg-white/[0.03] border border-white/10 rounded-md text-[11px] text-slate-300 px-2 py-1.5 outline-none"
              />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 bg-[#E91E8C] hover:bg-[#d31a80] text-white text-[11px] font-bold uppercase tracking-wider rounded-lg py-1.5 transition-colors"
              >
                Add Task
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="w-full flex items-center justify-center gap-1.5 bg-[#E91E8C] hover:bg-[#d31a80] text-white text-[11px] font-bold uppercase tracking-wider rounded-xl py-2.5 transition-colors shadow-[0_4px_14px_-4px_rgba(233,30,140,0.5)]"
          >
            <Plus className="w-3.5 h-3.5" /> New Task
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root export
// ---------------------------------------------------------------------------

export function TaskLedger() {
  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-6 font-sans selection:bg-[#E91E8C]/30 selection:text-white relative">
      {/* backdrop */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />

      <div className="relative w-full max-w-[1200px] h-[92vh] max-h-[860px] flex flex-col bg-[#07090E] border border-white/10 rounded-2xl shadow-2xl overflow-hidden shadow-[#E91E8C]/[0.05]">
        {/* Header */}
        <div className="relative shrink-0 border-b border-white/10 bg-slate-900/50 flex flex-col overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 85% 0%, #E91E8C 0%, transparent 45%)' }}>
            <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <pattern id="tl-grid" width="36" height="36" patternUnits="userSpaceOnUse">
                <path d="M 36 0 L 0 0 0 36" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-white/20" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#tl-grid)" />
            </svg>
          </div>

          <div className="px-6 sm:px-8 pt-5 pb-4 relative z-10 flex flex-col gap-5">
            <div className="flex justify-between items-start gap-4">
              <div>
                <div className="text-[10px] font-bold tracking-widest text-[#E91E8C] uppercase mb-2.5 flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 fill-[#E91E8C]" /> Pipeline / New Business
                </div>
                <h1 className="text-2xl sm:text-3xl font-light text-white tracking-tight mb-1.5">Emerald Coast Cultivation</h1>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                    Cannabis
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 bg-sky-500/10 border border-sky-500/20 rounded-full px-2 py-0.5">
                    WC
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 bg-[#E91E8C]/10 border border-[#E91E8C]/25 rounded-2xl px-4 py-2.5 backdrop-blur-xl shrink-0">
                <span className="text-[9.5px] text-[#E91E8C]/80 uppercase tracking-widest font-bold">Est. Premium</span>
                <span className="text-xl font-semibold text-white tabular-nums">$48,200</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-6 sm:gap-9">
              <Kpi label="Locations" value="3" />
              <Kpi label="Employees" value="42" />
              <Kpi label="Payroll" value="$2.1M" />
              <Kpi label="ExMod" value="1.12" />
            </div>
          </div>

          <StageTracker />
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left nav rail */}
          <div className="hidden sm:flex w-[132px] shrink-0 border-r border-white/10 bg-[#04060A]/80 p-3 flex-col gap-1 backdrop-blur-xl z-20">
            <NavItem active icon={<Activity className="w-4 h-4" />} label="Overview" />
            <NavItem icon={<ClipboardList className="w-4 h-4" />} label="Submission" />
            <NavItem icon={<ShieldCheck className="w-4 h-4" />} label="Subjects" />
            <NavItem icon={<Folder className="w-4 h-4" />} label="Documents" />
            <NavItem icon={<FileText className="w-4 h-4" />} label="Quote" />
            <NavItem icon={<FileSignature className="w-4 h-4" />} label="Policy" />
          </div>

          {/* Center content */}
          <OverviewContent />

          {/* Right persistent Tasks panel */}
          <TaskLedgerPanel />
        </div>
      </div>
    </div>
  );
}
