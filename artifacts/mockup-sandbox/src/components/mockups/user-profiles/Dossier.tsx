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
         <div className="flex items-center gap-4 max-w-7xl mx-auto px-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
            <h2 className="text-white/40 uppercase tracking-[0.2em] text-[10px] font-semibold text-center">Broker Profile View</h2>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
         </div>
         <ProfileShell profile={brokerProfile} />
       </div>

       <div className="space-y-6">
         <div className="flex items-center gap-4 max-w-7xl mx-auto px-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
            <h2 className="text-white/40 uppercase tracking-[0.2em] text-[10px] font-semibold text-center">Company Profile View</h2>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
         </div>
         <ProfileShell profile={companyProfile} />
       </div>

       <div className="h-12" />
    </div>
  );
}

function ProfileShell({ profile }: { profile: any }) {
  return (
    <div className="flex flex-col xl:flex-row gap-6 max-w-7xl mx-auto">
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
              <MessageSquare className="w-4 h-4" />
              Message
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
            <button className="text-white/40 hover:text-white transition-colors">
              <Edit3 className="w-4 h-4" />
            </button>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
          {/* Associated List (Deals/Relations) */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-[12px] p-6 lg:p-8 backdrop-blur-xl flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-medium text-white flex items-center gap-2.5">
                <div className="w-6 h-6 rounded bg-blue-500/10 flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                </div>
                Active {profile.type === 'COMPANY' ? 'Policies & Quotes' : 'Deals'}
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
                    <div className="text-xs text-white/40 mt-1 tabular-nums">{deal.premium}</div>
                  </div>
                  <div className="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-[10px] font-medium text-white/60 tracking-wide shrink-0">
                    {deal.stage}
                  </div>
                </div>
              ))}
            </div>
            
            <button className="w-full mt-5 py-3 border border-dashed border-white/10 rounded-xl text-xs font-medium text-white/40 hover:text-white/80 hover:border-white/20 hover:bg-white/[0.02] transition-all flex items-center justify-center gap-2">
              <LinkIcon className="w-3.5 h-3.5" /> Assign to Deal
            </button>
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
    { label: 'Total Premium', value: '$18.4M' },
    { label: 'Active Deals', value: '42' },
    { label: 'Win Rate', value: '68%' },
    { label: 'Avg Size', value: '$84K', highlight: true }
  ],
  details: {
    title: 'Book of Business',
    items: [
      { label: 'Top Carrier', value: 'Travelers' },
      { label: 'Primary Line', value: 'Workers Comp' },
      { label: 'Niche', value: 'Construction, Cannabis' },
      { label: 'YTD Growth', value: '+14.2%', highlight: true }
    ]
  },
  deals: [
    { name: 'Apex Construction Group', stage: 'Quoting', premium: '$184,200' },
    { name: 'Verde Dispensaries', stage: 'Binding', premium: '$42,500' },
    { name: 'Nautilus Logistics', stage: 'Underwriting', premium: '$310,000' }
  ],
  activity: [
    { type: 'note', desc: 'Added note to Verde Dispensaries quote options', time: '7/26/2026 2:41 PM' },
    { type: 'doc', desc: 'Uploaded Loss Runs for Apex Construction Group', time: '7/25/2026 11:15 AM' },
    { type: 'status', desc: 'Moved Nautilus Logistics to Underwriting', time: '7/24/2026 4:30 PM' }
  ]
};

const companyProfile = {
  type: 'COMPANY',
  name: 'Apex Construction',
  title: 'Client Account',
  org: 'Managed by Jordan Cole',
  avatar: 'AC',
  avatarType: 'company',
  location: 'Denver, CO',
  status: 'Active',
  contact: {
    email: 'compliance@apexbuilds.com',
    phone: '+1 (720) 555-9122',
    joined: 'Jan 05, 2025',
    lastActive: '1 hr ago'
  },
  credentials: [
    { label: 'FEIN', value: '84-XXXXXXX' },
    { label: 'Industry', value: 'Commercial Const.' },
  ],
  stats: [
    { label: 'Active Policies', value: '6' },
    { label: 'Total Premium', value: '$412K' },
    { label: 'Employees', value: '145' },
    { label: 'EXMOD', value: '0.84', highlight: true }
  ],
  details: {
    title: 'Company Profile',
    items: [
      { label: 'Class Codes', value: '5403, 5606, 5213' },
      { label: 'Annual Payroll', value: '$8.2M' },
      { label: 'Safety Program', value: 'Certified' },
      { label: 'Next Renewal', value: 'Oct 01, 2026' }
    ]
  },
  deals: [
    { name: 'WC Renewal 2026', stage: 'Quoting', premium: '$184,200' },
    { name: 'Auto Fleet Addition', stage: 'Bound', premium: '$28,000' }
  ],
  activity: [
    { type: 'doc', desc: 'Signed Workers Comp Application', time: '7/25/2026 9:00 AM' },
    { type: 'note', desc: 'Requested MVRs for 4 new fleet drivers', time: '7/22/2026 3:12 PM' },
    { type: 'status', desc: 'Auto Fleet policy bound successfully', time: '7/15/2026 10:45 AM' }
  ]
};
