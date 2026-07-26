import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Mail, 
  Phone, 
  Calendar, 
  Clock, 
  MessageSquare, 
  UserPlus, 
  Briefcase, 
  Edit3,
  FileText,
  Activity,
  CheckCircle2,
  Shield,
  MoreHorizontal
} from 'lucide-react';

// --- MOCK DATA ---

type Role = 'BROKER' | 'UNDERWRITER' | 'CLIENT' | 'AGENT' | 'COMPANY' | 'ADMIN';

interface ProfileData {
  id: string;
  name: string;
  role: Role;
  title: string;
  organization: string;
  location: string;
  status: 'Active' | 'Invited' | 'Suspended';
  email: string;
  phone: string;
  joinedDate: string;
  lastActive: string;
  avatar: string;
  stats: Array<{ label: string; value: string; trend?: string }>;
  roleSpecific: Array<{ label: string; value: string | React.ReactNode }>;
  activity: Array<{ id: string; action: string; target: string; timestamp: string; icon: React.ReactNode }>;
  connections: Array<{ id: string; name: string; type: string; value: string; status: string; statusColor: string }>;
}

const mockProfiles: ProfileData[] = [
  {
    id: 'p1',
    name: 'Jordan Cole',
    role: 'BROKER',
    title: 'Senior Partner',
    organization: 'Meridian Risk Partners',
    location: 'Chicago, IL',
    status: 'Active',
    email: 'jcole@meridianrisk.com',
    phone: '(312) 555-0192',
    joinedDate: 'Mar 12, 2021',
    lastActive: 'Just now',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80',
    stats: [
      { label: 'Total Premium', value: '$12.4M', trend: '+14%' },
      { label: 'Active Deals', value: '142' },
      { label: 'Win Rate', value: '68%', trend: '+2.4%' },
      { label: 'Avg Deal Size', value: '$87.3K' }
    ],
    roleSpecific: [
      { label: 'License Number', value: 'BR-9021-IL' },
      { label: 'States Licensed', value: 'IL, IN, WI, MI, OH' },
      { label: 'Primary Agency', value: 'Meridian Risk Partners' },
      { label: 'Specialties', value: 'Construction, Cannabis, Manufacturing' }
    ],
    connections: [
      { id: 'c1', name: 'Greenhouse Growers', type: 'Cannabis WC', value: '$184,200', status: 'Quoting', statusColor: 'bg-blue-500/20 text-blue-400' },
      { id: 'c2', name: 'Summit Construction', type: 'GL / XS', value: '$412,000', status: 'Bound', statusColor: 'bg-green-500/20 text-green-400' },
      { id: 'c3', name: 'Apex Logistics', type: 'Auto Fleet', value: '$95,500', status: 'Pending UW', statusColor: 'bg-orange-500/20 text-orange-400' },
    ],
    activity: [
      { id: 'a1', action: 'Uploaded document', target: 'Loss Runs - Greenhouse Growers.pdf', timestamp: 'Today, 2:41 PM', icon: <FileText size={14} /> },
      { id: 'a2', action: 'Moved deal to Quoting', target: 'Greenhouse Growers WC', timestamp: 'Today, 10:15 AM', icon: <Activity size={14} /> },
      { id: 'a3', action: 'Left a note on', target: 'Summit Construction Renewal', timestamp: 'Yesterday, 4:30 PM', icon: <MessageSquare size={14} /> },
    ]
  },
  {
    id: 'p2',
    name: 'Sarah Jenkins',
    role: 'UNDERWRITER',
    title: 'Lead Underwriter',
    organization: 'AmTrust Financial',
    location: 'New York, NY',
    status: 'Active',
    email: 'sarah.jenkins@amtrust.com',
    phone: '(212) 555-4081',
    joinedDate: 'Jan 05, 2023',
    lastActive: '2 hours ago',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80',
    stats: [
      { label: 'Open Submissions', value: '42' },
      { label: 'Avg Turnaround', value: '2.4 Days', trend: '-0.3 Days' },
      { label: 'Bound Premium (YTD)', value: '$8.2M' },
      { label: 'Quote Ratio', value: '45%' }
    ],
    roleSpecific: [
      { label: 'Carrier', value: 'AmTrust Financial' },
      { label: 'Appetite Tags', value: 'Workers Comp, Artisan Contractors, Retail' },
      { label: 'Authority Limit', value: '$5,000,000' },
      { label: 'Territory', value: 'Northeast Region' }
    ],
    connections: [
      { id: 'c4', name: 'Greenhouse Growers', type: 'Cannabis WC', value: '$184,200', status: 'In Review', statusColor: 'bg-orange-500/20 text-orange-400' },
      { id: 'c5', name: 'Metro Electric', type: 'Artisan WC', value: '$45,000', status: 'Declined', statusColor: 'bg-red-500/20 text-red-400' },
    ],
    activity: [
      { id: 'a4', action: 'Requested information on', target: 'Greenhouse Growers WC', timestamp: 'Today, 11:20 AM', icon: <MessageSquare size={14} /> },
      { id: 'a5', action: 'Issued quote for', target: 'Beacon Retail Group', timestamp: 'Yesterday, 3:45 PM', icon: <CheckCircle2 size={14} /> },
    ]
  }
];

// --- COMPONENTS ---

const Badge = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${className}`}>
    {children}
  </span>
);

const IconButton = ({ icon: Icon, label, primary }: { icon: any; label: string; primary?: boolean }) => (
  <button className={`
    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
    ${primary 
      ? 'bg-[#E91E8C] hover:bg-[#E91E8C]/90 text-white shadow-[0_0_15px_rgba(233,30,140,0.3)]' 
      : 'bg-white/[0.04] hover:bg-white/[0.08] text-white/80 border border-white/[0.08]'}
  `}>
    <Icon size={16} />
    {label}
  </button>
);

const ProfileLedger = ({ profile }: { profile: ProfileData }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'connections'>('overview');

  return (
    <div className="max-w-4xl mx-auto mb-24">
      {/* IDENTITY CARD (Centered) */}
      <div className="flex flex-col items-center pt-16 pb-12">
        <div className="relative mb-6">
          <img 
            src={profile.avatar} 
            alt={profile.name} 
            className="w-28 h-28 rounded-2xl object-cover border border-white/[0.12] shadow-2xl shadow-black/50"
          />
          <div className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-[#0a0a0c] flex items-center justify-center">
            <div className="w-3.5 h-3.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
          </div>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-semibold text-white tracking-tight">{profile.name}</h1>
          <Badge className="bg-[#E91E8C]/10 text-[#E91E8C] border border-[#E91E8C]/20">
            {profile.role}
          </Badge>
        </div>

        <p className="text-white/55 text-base mb-6 flex items-center gap-2">
          <Briefcase size={16} className="text-white/40" />
          {profile.title} at {profile.organization}
          <span className="text-white/20 px-1">•</span>
          <MapPin size={16} className="text-white/40" />
          {profile.location}
        </p>

        {/* Contact Chips */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-sm text-white/70">
            <Mail size={14} className="text-[#E91E8C]" />
            {profile.email}
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-sm text-white/70">
            <Phone size={14} className="text-[#E91E8C]" />
            {profile.phone}
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-sm text-white/70">
            <Calendar size={14} className="text-white/40" />
            Joined {profile.joinedDate}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <IconButton icon={MessageSquare} label="Message" primary />
          <IconButton icon={Briefcase} label="Assign Deal" />
          <IconButton icon={UserPlus} label="Connect" />
          <button className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/80 border border-white/[0.08] transition-all">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* SEGMENTED CONTROL */}
      <div className="flex justify-center border-b border-white/[0.08] mb-8">
        <div className="flex gap-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'activity', label: 'Activity Feed' },
            { id: 'connections', label: 'Relationships' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                pb-4 text-sm font-medium transition-colors relative
                ${activeTab === tab.id ? 'text-white' : 'text-white/40 hover:text-white/70'}
              `}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#E91E8C] shadow-[0_0_8px_rgba(233,30,140,0.5)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* LEDGER CONTENT */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
        {activeTab === 'overview' && (
          <div className="space-y-12">
            
            {/* Stats Row */}
            <section>
              <h3 className="uppercase tracking-widest text-xs font-semibold text-white/30 mb-3 ml-1">Key Metrics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 border-y border-white/[0.08] bg-white/[0.01]">
                {profile.stats.map((stat, i) => (
                  <div key={i} className={`p-5 ${i !== profile.stats.length - 1 ? 'border-r border-white/[0.08]' : ''} ${i >= 2 ? 'border-t md:border-t-0 border-white/[0.08]' : ''}`}>
                    <div className="text-white/40 text-xs mb-2 uppercase tracking-wide">{stat.label}</div>
                    <div className="flex items-baseline gap-2">
                      <div className="text-2xl font-mono text-white/90">{stat.value}</div>
                      {stat.trend && (
                        <div className={`text-xs font-medium ${stat.trend.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                          {stat.trend}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Role Specific Def List */}
            <section>
              <h3 className="uppercase tracking-widest text-xs font-semibold text-white/30 mb-3 ml-1">Role Credentials</h3>
              <div className="border-t border-white/[0.08]">
                {profile.roleSpecific.map((item, i) => (
                  <div key={i} className="flex flex-col sm:flex-row py-4 border-b border-white/[0.08] hover:bg-white/[0.02] transition-colors px-2">
                    <div className="w-1/3 text-sm text-white/40 mb-1 sm:mb-0 flex items-center">
                      {item.label}
                    </div>
                    <div className="w-2/3 text-sm text-white/80 font-medium">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </div>
        )}

        {activeTab === 'activity' && (
          <section>
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="uppercase tracking-widest text-xs font-semibold text-white/30">Recent Activity</h3>
              <div className="text-xs text-white/40 flex items-center gap-1">
                <Clock size={12} /> Last active: {profile.lastActive}
              </div>
            </div>
            
            <div className="border-t border-white/[0.08]">
              {profile.activity.map((item, i) => (
                <div key={item.id} className="flex gap-4 py-4 border-b border-white/[0.08] px-2 hover:bg-white/[0.02] transition-colors">
                  <div className="mt-0.5 text-white/40 p-1.5 rounded-full bg-white/[0.03] border border-white/[0.05] h-fit">
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="text-white/60">{item.action}</span>{' '}
                      <span className="text-white/90 font-medium">{item.target}</span>
                    </p>
                    <p className="text-xs text-white/40 mt-1">{item.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'connections' && (
          <section>
            <h3 className="uppercase tracking-widest text-xs font-semibold text-white/30 mb-3 ml-1">Active Deals & Relationships</h3>
            <div className="border-t border-white/[0.08]">
              {profile.connections.map((conn) => (
                <div key={conn.id} className="flex items-center justify-between py-4 border-b border-white/[0.08] px-2 hover:bg-white/[0.02] transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white/[0.05] border border-white/[0.1] flex items-center justify-center">
                      <Building2 size={18} className="text-white/50" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white/90 group-hover:text-[#E91E8C] transition-colors cursor-pointer">{conn.name}</div>
                      <div className="text-xs text-white/40 mt-0.5">{conn.type}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-8">
                    <div className="text-right hidden sm:block">
                      <div className="text-sm font-mono text-white/80">{conn.value}</div>
                      <div className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">Value</div>
                    </div>
                    <Badge className={`${conn.statusColor} w-24 justify-center`}>
                      {conn.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default function Ledger() {
  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white font-sans selection:bg-[#E91E8C]/30 selection:text-white p-6 sm:p-10">
      
      <div className="max-w-6xl mx-auto flex items-center justify-between mb-8 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-2 text-white/50 text-sm">
          <Shield size={16} />
          <span>Workforce OS • Universal Profile System (Ledger Variant)</span>
        </div>
        <div className="text-xs font-mono text-white/30 bg-white/[0.03] px-2 py-1 rounded border border-white/[0.05]">
          v1.4.0
        </div>
      </div>

      <div className="space-y-12">
        {/* We render the primary profile (Broker) */}
        <div className="bg-[#0a0a0c] border border-white/[0.08] rounded-[24px] shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent" />
          <ProfileLedger profile={mockProfiles[0]} />
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-white/[0.08]" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[#0a0a0c] px-4 text-xs font-medium text-white/30 uppercase tracking-widest">
              Example 2: Underwriter Role
            </span>
          </div>
        </div>

        {/* We render the secondary profile (Underwriter) */}
        <div className="bg-[#0a0a0c] border border-white/[0.08] rounded-[24px] shadow-2xl overflow-hidden relative opacity-90 scale-[0.98] origin-top">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#E91E8C]/20 to-transparent" />
          <ProfileLedger profile={mockProfiles[1]} />
        </div>
      </div>

    </div>
  );
}
