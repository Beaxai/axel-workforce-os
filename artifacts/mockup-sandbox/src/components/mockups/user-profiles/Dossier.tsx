import React from 'react';
import { 
  Building2, User, Mail, Phone, Calendar, Clock, 
  MapPin, Shield, Briefcase, FileText, Activity,
  ChevronRight, MessageSquare, Edit3, MoreHorizontal,
  CheckCircle2, AlertCircle, Link as LinkIcon
} from 'lucide-react';

export function Dossier() {
  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white p-6 md:p-8 space-y-24 font-sans selection:bg-[#E91E8C]/30 selection:text-white">
       
       <div className="space-y-6">
         <ProfileShell profile={brokerProfile} />
       </div>

       <div className="space-y-6">
         <ProfileShell profile={agentProfile} />
       </div>

       <div className="h-12" />
    </div>
  );
}

function ProfileShell({ profile }: { profile: any }) {
  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Workspace Indicator */}
      <div className="flex items-center gap-3 px-2 mb-2">
        <div className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E91E8C] opacity-40"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E91E8C] shadow-[0_0_8px_rgba(233,30,140,0.5)]"></span>
        </div>
        <span className="text-sm font-medium text-white/60">Viewing as: <span className="text-white/90">{profile.name}</span> <span className="text-white/40">({profile.type})</span></span>
      </div>
      
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Fixed Left Rail */}
        <div className="w-full xl:w-80 shrink-0 space-y-4">
          
          {/* Identity Card */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-[12px] backdrop-blur-xl p-6 flex flex-col items-center text-center relative overflow-hidden">
            {/* Subtle accent glow */}
            <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-[#E91E8C]/5 to-transparent pointer-events-none" />

            <div className={`relative w-24 h-24 flex items-center justify-center text-3xl font-light mb-5 mt-2
              ${profile.avatarType === 'company' 
                ? 'rounded-[12px] bg-gradient-to-br from-[#E91E8C]/10 to-purple-500/10 text-white' 
                : 'rounded-full bg-gradient-to-br from-white/10 to-white/5 text-white/80'}
              border border-white/10 shadow-2xl shadow-black/50 z-10`}>
              {profile.avatar}
            </div>
            
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 border border-white/[0.08] text-[10px] font-medium tracking-wider uppercase mb-4 text-white/70 backdrop-blur-md">
              <span className={`w-1.5 h-1.5 rounded-full ${profile.status === 'Active' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-amber-400'}`}></span>
              {profile.type}
            </div>
            
            <h1 className="text-xl font-medium text-white mb-1.5 tracking-tight">{profile.name}</h1>
            <p className="text-white/55 text-sm mb-6 leading-relaxed">{profile.title} <span className="mx-1.5 text-white/20">•</span> {profile.org}</p>

            <div className="w-full grid grid-cols-[1fr_auto] gap-2 mt-auto">
              <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#E91E8C] hover:bg-[#E91E8C]/90 text-white rounded-lg text-sm font-medium transition-all shadow-[0_0_20px_rgba(233,30,140,0.15)]">
                <Edit3 className="w-4 h-4" />
                Edit Profile
              </button>
              <button className="flex items-center justify-center px-3 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/80 hover:text-white rounded-lg transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Contact & Meta */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-[12px] backdrop-blur-xl p-5 space-y-5">
            
            <div className="space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/[0.04] flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-white/40" />
                </div>
                <div className="min-w-0 pt-0.5">
                  <div className="text-white/80 text-sm truncate font-medium">{profile.contact.email}</div>
                  <div className="text-white/40 text-xs mt-0.5">Primary Email</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/[0.04] flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-white/40" />
                </div>
                <div className="min-w-0 pt-0.5">
                  <div className="text-white/80 text-sm truncate font-medium tabular-nums">{profile.contact.phone}</div>
                  <div className="text-white/40 text-xs mt-0.5">Work Phone</div>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/[0.04] flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-white/40" />
                </div>
                <div className="min-w-0 pt-0.5">
                  <div className="text-white/80 text-sm truncate font-medium">{profile.location}</div>
                  <div className="text-white/40 text-xs mt-0.5">Location</div>
                </div>
              </div>
            </div>

            <div className="h-px w-full bg-white/[0.06]" />
            
            <div className="space-y-3">
              {profile.credentials.map((cred: any, i: number) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-white/40 text-xs">{cred.label}</span>
                  <span className="text-white/80 text-sm font-medium">{cred.value}</span>
                </div>
              ))}
            </div>
            
            <div className="h-px w-full bg-white/[0.06]" />

            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-white/40">Joined</span>
                <span className="text-white/60 tabular-nums">{profile.contact.joined}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-white/40">Last Active</span>
                <span className="text-white/60 tabular-nums">{profile.contact.lastActive}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Content Column */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          
          {/* Stats Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {profile.stats.map((stat: any, i: number) => (
              <div key={i} className="bg-white/[0.03] border border-white/[0.08] rounded-[12px] p-5 flex flex-col justify-center backdrop-blur-xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="text-white/40 text-[10px] mb-2 uppercase tracking-widest font-semibold">{stat.label}</div>
                <div className={`text-3xl font-light tabular-nums tracking-tight ${stat.highlight ? 'text-[#E91E8C]' : 'text-white'}`}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Role Details Card */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-[12px] p-6 lg:p-8 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-8 border-b border-white/[0.06] pb-4">
              <h3 className="text-sm font-medium text-white flex items-center gap-2.5">
                <div className="w-6 h-6 rounded bg-[#E91E8C]/10 flex items-center justify-center">
                  <Briefcase className="w-3.5 h-3.5 text-[#E91E8C]" />
                </div>
                {profile.details.title}
              </h3>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
              {profile.details.items.map((item: any, i: number) => (
                <div key={i} className="space-y-1.5">
                  <div className="text-white/40 text-xs">{item.label}</div>
                  <div className={`text-sm font-medium ${item.highlight ? 'text-emerald-400' : 'text-white/90'}`}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Agents Roster (Broker Only) */}
          {profile.agents && (
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-[12px] p-6 lg:p-8 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-medium text-white flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded bg-emerald-500/10 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  My Agents
                </h3>
                <button className="text-white/40 hover:text-white text-xs flex items-center gap-1 transition-colors font-medium">
                  View Roster <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {profile.agents.map((agent: any, i: number) => (
                  <div key={i} className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 flex flex-col gap-3 hover:bg-white/[0.04] hover:border-white/10 transition-all cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-xs text-white/80 border border-white/10">
                        {agent.avatar}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white/90">{agent.name}</div>
                        <div className="text-[10px] text-white/40 uppercase tracking-wide">{agent.deals} Active Deals</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
                      <div className="text-xs">
                        <div className="text-white/40 mb-0.5">Premium</div>
                        <div className="text-white/80 font-medium tabular-nums">{agent.premium}</div>
                      </div>
                      <div className="text-xs text-right">
                        <div className="text-white/40 mb-0.5">Win Rate</div>
                        <div className="text-emerald-400 font-medium tabular-nums">{agent.winRate}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
            {/* Associated List (Deals/Relations) */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-[12px] p-6 lg:p-8 backdrop-blur-xl flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-medium text-white flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded bg-blue-500/10 flex items-center justify-center">
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  {profile.type === 'BROKER' ? 'Team Active Deals' : 'My Active Deals'}
                </h3>
                <button className="text-white/40 hover:text-white text-xs flex items-center gap-1 transition-colors font-medium">
                  View All <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              
              <div className="space-y-3 flex-1">
                {profile.deals.map((deal: any, i: number) => (
                  <div key={i} className="group flex items-center justify-between p-3.5 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:border-white/10 hover:bg-white/[0.03] transition-all cursor-pointer">
                    <div className="min-w-0 pr-4">
                      <div className="text-sm font-medium text-white/90 group-hover:text-white transition-colors truncate">{deal.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="text-xs text-white/40 tabular-nums">{deal.premium}</div>
                        {deal.owner && (
                          <>
                            <div className="w-1 h-1 rounded-full bg-white/20"></div>
                            <div className="text-[11px] text-white/30 truncate">via {deal.owner}</div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-[10px] font-medium text-white/60 tracking-wide shrink-0">
                      {deal.stage}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-[12px] p-6 lg:p-8 backdrop-blur-xl flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-medium text-white flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded bg-purple-500/10 flex items-center justify-center">
                    <Activity className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  Recent Activity
                </h3>
              </div>
              
              <div className="space-y-6 flex-1 pl-2">
                {profile.activity.map((act: any, i: number) => (
                  <div key={i} className="relative pl-6">
                    {/* Timeline line */}
                    {i !== profile.activity.length - 1 && (
                      <div className="absolute left-[5px] top-6 bottom-[-24px] w-px bg-white/10"></div>
                    )}
                    {/* Timeline dot */}
                    <div className="absolute left-0 top-1.5 w-[11px] h-[11px] rounded-full border-[2.5px] border-[#0a0a0c] bg-white/30 z-10"></div>
                    
                    <div className="text-sm text-white/80 leading-snug">{act.desc}</div>
                    <div className="text-[11px] text-white/30 mt-1.5 tabular-nums font-medium tracking-wide">{act.time}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// Data Models

const brokerProfile = {
  type: 'BROKER',
  name: 'Jordan Cole',
  title: 'Managing Director',
  org: 'Meridian Risk Partners',
  avatar: 'JC',
  avatarType: 'person',
  location: 'Chicago, IL',
  status: 'Active',
  contact: {
    email: 'jordan@meridianrisk.com',
    phone: '+1 (312) 555-0198',
    joined: 'Mar 12, 2024',
    lastActive: '2 mins ago'
  },
  credentials: [
    { label: 'License #', value: 'NPN-8472910' },
    { label: 'States', value: 'IL, NY, CA, TX' },
  ],
  stats: [
    { label: 'Team Premium', value: '$18.4M' },
    { label: 'Team Deals', value: '42' },
    { label: 'Team Win Rate', value: '68%' },
    { label: 'Active Agents', value: '4', highlight: true }
  ],
  details: {
    title: 'Team Book of Business',
    items: [
      { label: 'Top Carrier', value: 'Travelers' },
      { label: 'Primary Line', value: 'Workers Comp' },
      { label: 'Niche', value: 'Construction, Cannabis' },
      { label: 'YTD Growth', value: '+14.2%', highlight: true }
    ]
  },
  agents: [
    { name: 'Marcus Torres', avatar: 'MT', deals: 14, premium: '$6.2M', winRate: '72%' },
    { name: 'Sarah Chen', avatar: 'SC', deals: 11, premium: '$4.8M', winRate: '65%' },
    { name: 'David Okafor', avatar: 'DO', deals: 9, premium: '$4.1M', winRate: '61%' },
    { name: 'Elena Rostova', avatar: 'ER', deals: 8, premium: '$3.3M', winRate: '70%' },
  ],
  deals: [
    { name: 'Apex Construction Group', stage: 'Quoting', premium: '$184,200', owner: 'Marcus Torres' },
    { name: 'Verde Dispensaries', stage: 'Binding', premium: '$42,500', owner: 'Sarah Chen' },
    { name: 'Nautilus Logistics', stage: 'Underwriting', premium: '$310,000', owner: 'David Okafor' }
  ],
  activity: [
    { type: 'note', desc: 'Added note to Verde Dispensaries quote options', time: '7/26/2026 2:41 PM' },
    { type: 'doc', desc: 'Uploaded Loss Runs for Apex Construction Group', time: '7/25/2026 11:15 AM' },
    { type: 'status', desc: 'Moved Nautilus Logistics to Underwriting', time: '7/24/2026 4:30 PM' }
  ]
};

const agentProfile = {
  type: 'AGENT',
  name: 'Marcus Torres',
  title: 'Senior Producer',
  org: 'Meridian Risk Partners',
  avatar: 'MT',
  avatarType: 'person',
  location: 'Chicago, IL',
  status: 'Active',
  contact: {
    email: 'marcus@meridianrisk.com',
    phone: '+1 (312) 555-0199',
    joined: 'Jan 15, 2025',
    lastActive: 'Just now'
  },
  credentials: [
    { label: 'License #', value: 'NPN-9123847' },
    { label: 'States', value: 'IL, WI' },
  ],
  stats: [
    { label: 'Personal Premium', value: '$6.2M' },
    { label: 'Personal Deals', value: '14' },
    { label: 'Win Rate', value: '72%', highlight: true },
    { label: 'Avg Size', value: '$65K' }
  ],
  details: {
    title: 'Personal Book of Business',
    items: [
      { label: 'Top Carrier', value: 'Chubb' },
      { label: 'Primary Line', value: 'Property' },
      { label: 'Niche', value: 'Real Estate' },
      { label: 'YTD Growth', value: '+8.4%', highlight: true }
    ]
  },
  deals: [
    { name: 'Apex Construction Group', stage: 'Quoting', premium: '$184,200' },
    { name: 'River North Towers', stage: 'Binding', premium: '$112,000' },
    { name: 'Lakeside Retail Center', stage: 'Underwriting', premium: '$95,500' }
  ],
  activity: [
    { type: 'doc', desc: 'Uploaded Application for River North Towers', time: '7/26/2026 10:15 AM' },
    { type: 'note', desc: 'Client confirmed coverage limits on Apex', time: '7/25/2026 4:30 PM' },
    { type: 'status', desc: 'Lakeside Retail Center moved to Underwriting', time: '7/24/2026 1:45 PM' }
  ]
};
