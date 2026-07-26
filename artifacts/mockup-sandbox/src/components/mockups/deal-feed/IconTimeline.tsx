import { 
  MessageSquare, 
  ArrowRight, 
  CheckSquare, 
  FileText, 
  CheckCircle2,
  AlertCircle,
  Clock
} from "lucide-react";

interface ActivityEvent {
  id: string;
  type: "comment" | "status" | "task" | "document" | "approval" | "rfi";
  timestamp: string;
  dayGroup: string;
  data: any;
}

const events: ActivityEvent[] = [
  {
    id: "1",
    type: "comment",
    timestamp: "2:34 PM",
    dayGroup: "Today",
    data: {
      author: "Sarah Mitchell",
      role: "ADMIN",
      initials: "SM",
      message: "Reviewed the submission — looks good but we need updated loss runs from @Marcus Webb before moving to indication."
    }
  },
  {
    id: "2",
    type: "task",
    timestamp: "1:15 PM",
    dayGroup: "Today",
    data: {
      title: "Collect loss runs",
      assignee: "Marcus Webb",
      assigneeInitials: "MW",
      completed: false
    }
  },
  {
    id: "3",
    type: "status",
    timestamp: "11:22 AM",
    dayGroup: "Today",
    data: {
      from: "Submission Review",
      to: "Indication",
      label: "Stage"
    }
  },
  {
    id: "4",
    type: "comment",
    timestamp: "10:48 AM",
    dayGroup: "Today",
    data: {
      author: "Marcus Webb",
      role: "AGENT",
      initials: "MW",
      message: "Client confirmed they want to proceed with the quote. Loss runs should arrive by EOD."
    }
  },
  {
    id: "5",
    type: "approval",
    timestamp: "9:12 AM",
    dayGroup: "Yesterday",
    data: {
      label: "Indication params approved"
    }
  },
  {
    id: "6",
    type: "document",
    timestamp: "4:45 PM",
    dayGroup: "Yesterday",
    data: {
      filename: "loss-runs-2025.pdf",
      label: "Loss history uploaded"
    }
  },
  {
    id: "7",
    type: "rfi",
    timestamp: "3:30 PM",
    dayGroup: "Yesterday",
    data: {
      message: "Carrier requesting additional payroll breakdown by class code"
    }
  },
  {
    id: "8",
    type: "task",
    timestamp: "2:15 PM",
    dayGroup: "Yesterday",
    data: {
      title: "Verify FEIN matches application",
      assignee: "Sarah Mitchell",
      assigneeInitials: "SM",
      completed: true
    }
  },
  {
    id: "9",
    type: "status",
    timestamp: "1:05 PM",
    dayGroup: "Yesterday",
    data: {
      from: "New",
      to: "Submission Review",
      label: "Stage"
    }
  },
  {
    id: "10",
    type: "comment",
    timestamp: "12:40 PM",
    dayGroup: "Yesterday",
    data: {
      author: "Sarah Mitchell",
      role: "ADMIN",
      initials: "SM",
      message: "Assigned this to our workers-comp specialist team. @Marcus Webb can you take first pass?"
    }
  }
];

function getIconByType(type: ActivityEvent["type"]) {
  switch (type) {
    case "comment":
      return { Icon: MessageSquare, color: "text-[#E91E8C]", bg: "bg-[#E91E8C]/10" };
    case "status":
      return { Icon: ArrowRight, color: "text-blue-400", bg: "bg-blue-400/10" };
    case "task":
      return { Icon: CheckSquare, color: "text-amber-400", bg: "bg-amber-400/10" };
    case "document":
      return { Icon: FileText, color: "text-[#7C3AED]", bg: "bg-[#7C3AED]/10" };
    case "approval":
      return { Icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10" };
    case "rfi":
      return { Icon: AlertCircle, color: "text-orange-400", bg: "bg-orange-400/10" };
  }
}

function DaySeparator({ label }: { label: string }) {
  return (
    <div className="relative flex items-center justify-center py-4">
      <div className="absolute left-[15px] h-full w-[1px] bg-white/5" />
      <div className="relative z-10 px-4 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-zinc-400 uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}

function CommentEvent({ data, timestamp }: { data: any; timestamp: string }) {
  const highlightMentions = (text: string) => {
    return text.split(/(@\w+\s+\w+)/g).map((part, i) => {
      if (part.startsWith("@")) {
        return (
          <span key={i} className="text-[#E91E8C] font-medium">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex-1 pl-6">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[#E91E8C]/20 border border-[#E91E8C]/30 flex items-center justify-center">
          <span className="text-xs font-semibold text-[#E91E8C]">{data.initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-zinc-100">{data.author}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/5 text-zinc-400 border border-white/10">
              {data.role}
            </span>
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timestamp}
            </span>
          </div>
          <div className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-zinc-300 leading-relaxed">
            {highlightMentions(data.message)}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusEvent({ data, timestamp }: { data: any; timestamp: string }) {
  return (
    <div className="flex-1 pl-6">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-zinc-500 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {timestamp}
        </span>
        <span className="text-sm text-zinc-400">{data.label}:</span>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs font-medium text-zinc-400">
            {data.from}
          </span>
          <ArrowRight className="w-4 h-4 text-blue-400" />
          <span className="px-3 py-1 rounded-full bg-blue-400/10 border border-blue-400/30 text-xs font-medium text-blue-300">
            {data.to}
          </span>
        </div>
      </div>
    </div>
  );
}

function TaskEvent({ data, timestamp }: { data: any; timestamp: string }) {
  return (
    <div className="flex-1 pl-6">
      <div className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
            data.completed 
              ? "bg-amber-400/20 border-amber-400/50" 
              : "border-white/20"
          }`}>
            {data.completed && <CheckSquare className="w-4 h-4 text-amber-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-medium mb-1 ${
              data.completed ? "text-zinc-500 line-through" : "text-zinc-200"
            }`}>
              {data.title}
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Clock className="w-3 h-3" />
              <span>{timestamp}</span>
              <span className="text-zinc-600">•</span>
              <div className="flex items-center gap-1.5">
                <span>Assigned to</span>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                  <div className="w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center">
                    <span className="text-[8px] font-semibold text-zinc-300">{data.assigneeInitials}</span>
                  </div>
                  <span className="text-zinc-400">{data.assignee}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DocumentEvent({ data, timestamp }: { data: any; timestamp: string }) {
  return (
    <div className="flex-1 pl-6">
      <div className="flex items-center gap-3">
        <span className="text-xs text-zinc-500 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {timestamp}
        </span>
        <span className="text-sm text-zinc-400">{data.label}</span>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#7C3AED]/10 border border-[#7C3AED]/30">
          <FileText className="w-4 h-4 text-[#7C3AED]" />
          <span className="text-sm font-medium text-purple-300">{data.filename}</span>
        </div>
      </div>
    </div>
  );
}

function ApprovalEvent({ data, timestamp }: { data: any; timestamp: string }) {
  return (
    <div className="flex-1 pl-6">
      <div className="flex items-center gap-3">
        <span className="text-xs text-zinc-500 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {timestamp}
        </span>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-400/10 border border-emerald-400/30">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-emerald-300">{data.label}</span>
        </div>
      </div>
    </div>
  );
}

function RFIEvent({ data, timestamp }: { data: any; timestamp: string }) {
  return (
    <div className="flex-1 pl-6">
      <div className="px-4 py-3 rounded-xl bg-orange-400/5 border border-orange-400/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-400">Request for Info</span>
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {timestamp}
              </span>
            </div>
            <p className="text-sm text-zinc-300">{data.message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ event, showDaySeparator }: { event: ActivityEvent; showDaySeparator: boolean }) {
  const { Icon, color, bg } = getIconByType(event.type);

  return (
    <>
      {showDaySeparator && <DaySeparator label={event.dayGroup} />}
      <div className="relative flex items-start gap-0">
        {/* Timeline rail */}
        <div className="relative flex flex-col items-center">
          <div className={`relative z-10 w-8 h-8 rounded-full ${bg} border border-white/10 flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
          <div className="absolute top-8 left-[15px] bottom-0 w-[1px] bg-white/5" />
        </div>

        {/* Event content */}
        {event.type === "comment" && <CommentEvent data={event.data} timestamp={event.timestamp} />}
        {event.type === "status" && <StatusEvent data={event.data} timestamp={event.timestamp} />}
        {event.type === "task" && <TaskEvent data={event.data} timestamp={event.timestamp} />}
        {event.type === "document" && <DocumentEvent data={event.data} timestamp={event.timestamp} />}
        {event.type === "approval" && <ApprovalEvent data={event.data} timestamp={event.timestamp} />}
        {event.type === "rfi" && <RFIEvent data={event.data} timestamp={event.timestamp} />}
      </div>
    </>
  );
}

export function IconTimeline() {
  let currentDay = "";

  return (
    <div className="min-h-screen bg-[#0d0d10] p-8">
      <div className="max-w-[860px] mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">Deal Activity Feed</h1>
          <p className="text-sm text-zinc-400">Workers Compensation Insurance — Acme Manufacturing Co.</p>
        </div>

        <div className="px-6 py-6 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
          <div className="space-y-6">
            {events.map((event, index) => {
              const showDaySeparator = event.dayGroup !== currentDay;
              if (showDaySeparator) {
                currentDay = event.dayGroup;
              }
              
              return (
                <ActivityItem 
                  key={event.id} 
                  event={event} 
                  showDaySeparator={showDaySeparator}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default IconTimeline;
