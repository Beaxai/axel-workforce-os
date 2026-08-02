import React, { useState } from 'react';
import { 
  Mail, Phone, Calendar, Clock, MapPin, Briefcase, 
  Shield, User, ChevronRight, Activity as ActivityIcon, 
  MessageSquare, UserPlus, FolderOpen, FileText,
  Edit2
} from 'lucide-react';

type ProfileRole = 'BROKER' | 'UNDERWRITER' | 'COMPANY' | 'ADMIN' | 'CLIENT' | 'AGENT';

interface ProfileData {
  role: ProfileRole;
  identity: {
    name: string;
    initials: string;
    title: string;
    organization: string;
    location: string;
    status: 'Active' | 'Invited' | 'Suspended';
    isCompany: boolean;
  };
  contact: {
    email: string;
    phone: string;
    joined: string;
    lastActive: string;
  };
  stats: Array<{ label: string; value: string; trend?: string }>;
  roleSpecifics: Array<{ label: string; value: React.ReactNode }>;
  activity: Array<{ id: string; action: string; target: string; date: string }>;
  deals: Array<{ id: string; name: string; stage: string; amount: string }>;
}

const brokerData: ProfileData = {
  role: 'BROKER',
  identity: {
    name: 'Jordan Cole',
    initials: 'JC',
    title: 'Senior Broker',
    organization: 'Meridian Risk Partners',
    location: 'Chicago, IL',
    status: 'Active',
    isCompany: false
  },
  contact: {
    email: 'jordan.cole@meridianrisk.com',
    phone: '+1 (312) 555-0198',
    joined: 'Oct 14, 2023',
    lastActive: 'Just now'
  },
  stats: [
    { label: 'Active Book', value: '$12.4M', trend: '+14%' },
    { label: 'Deals YTD', value: '142' },
    { label: 'Win Rate', value: '68%', trend: '+2%' },
    { label: 'Avg Cycle', value: '4.2d' }
  ],
  roleSpecifics: [
    { label: 'License #', value: 'IL-9842100' },
    { label: 'States', value: 'IL, IN, WI, MI' },
    { label: 'Agency', value: 'Meridian Risk P.' },
    { label: 'Specialty', value: 'Construction, RE' }
  ],
  activity: [
    { id: '1', action: 'Left a note on', target: 'Apex Construction Group', date: '7/26/2026 2:41 PM' },
    { id: '2', action: 'Uploaded document', target: 'Apex_WC_Policy_2026.pdf', date: '7/26/2026 10:15 AM' },
    { id: '3', action: 'Moved deal to Quoted:', target: 'Oasis Cannabis Dispensary', date: '7/25/2026 4:30 PM' },
    { id: '4', action: 'Requested info from', target: 'Sarah Jenkins (Underwriter)', date: '7/25/2026 11:20 AM' },
  ],
  deals: [
    { id: '1', name: 'Apex Construction Group', stage: 'Quoted', amount: '$184,200' },
    { id: '2', name: 'Oasis Cannabis Dispensary', stage: 'Underwriting', amount: '$62,500' },
    { id: '3', name: 'Metro Logistics Inc', stage: 'Bound', amount: '$312,000' },
  ]
};

const underwriterData: ProfileData = {
  role: 'UNDERWRITER',
  identity: {
    name: 'Sarah Jenkins',
    initials: 'SJ',
    title: 'Sr. Underwriter',
    organization: 'Liberty Mutual',
    location: 'Boston, MA',
    status: 'Active',
    isCompany: false
  },
  contact: {
    email: 'sarah.jenkins@libertymutual.com',
    phone: '+1 (617) 555-8821',
    joined: 'Jan 02, 2021',
    lastActive: '2h ago'
  },
  stats: [
    { label: 'Written YTD', value: '$24.8M' },
    { label: 'Open Subs', value: '28' },
    { label: 'Turnaround', value: '2.1d' },
    { label: 'Quote Ratio', value: '82%' }
  ],
  roleSpecifics: [],
  activity: [],
  deals: []
};

const companyData: ProfileData = {
  role: 'COMPANY',
  identity: {
    name: 'Apex Construction Group',
    initials: 'APX',
    title: 'Client Account',
    organization: 'Managed by Meridian',
    location: 'Peoria, IL',
    status: 'Active',
    isCompany: true
  },
  contact: {
    email: 'billing@apexconstruction.com',
    phone: '+1 (309) 555-4491',
    joined: 'Mar 15, 2024',
    lastActive: 'Yesterday'
  },
  stats: [
    { label: 'Employees', value: '420' },
    { label: 'Total Premium', value: '$1.2M' },
    { label: 'EXMOD', value: '1.12' },
    { label: 'Active Policies', value: '4' }
  ],
  roleSpecifics: [],
  activity: [],
  deals: []
};

const getStageColor = (stage: string) => {
  switch (stage) {
    case 'Quoted': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    case 'Underwriting': return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
    case 'Bound': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    default: return 'bg-white/10 text-white/70 border border-white/20';
  }
};

const HeaderHero = ({ profile }: { profile: ProfileData }) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 md:p-8 mb-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
    {/* Subtle glow effect behind identity */}
    <div className="absolute top-0 left-0 w-64 h-64 bg-[#E91E8C]/5 rounded-full blur-[80px] pointer-events-none" />

    {/* Left: Identity */}
    <div className="flex items-center gap-6 mb-6 md:mb-0 relative z-10">
      <div className={`h-24 w-24 shrink-0 flex items-center justify-center text-3xl font-light tracking-wider bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shadow-inner ${profile.identity.isCompany ? 'rounded-2xl' : 'rounded-full'}`}>
         {profile.identity.initials}
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <h1 className="text-3xl font-semibold tracking-tight text-white/95">{profile.identity.name}</h1>
          <span className="px-2.5 py-0.5 rounded-full bg-[#E91E8C]/10 border border-[#E91E8C]/30 text-[#E91E8C] text-xs font-medium tracking-wide uppercase shadow-[0_0_10px_rgba(233,30,140,0.15)]">
            {profile.role}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${profile.identity.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/10 text-white/60'}`}>
            {profile.identity.status}
          </span>
        </div>
        <div className="text-white/55 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium">
          <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4 opacity-70" /> {profile.identity.title} @ {profile.identity.organization}</span>
          <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 opacity-70" /> {profile.identity.location}</span>
        </div>
      </div>
    </div>
    
    {/* Right: Stats */}
    <div className="flex items-center gap-8 md:gap-12 relative z-10">
      {profile.stats.map((stat, i) => (
        <div key={i} className="flex flex-col md:items-end text-left md:text-right">
          <span className="text-white/40 text-[11px] font-medium uppercase tracking-[0.1em] mb-1.5">{stat.label}</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl md:text-4xl font-mono tracking-tight font-medium text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]">
              {stat.value}
            </span>
            {stat.trend && (
              <span className="text-emerald-400 text-xs font-mono font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded">{stat.trend}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const PreviewHeader = ({ profile }: { profile: ProfileData }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white/[0.015] border border-white/[0.04] rounded-xl p-4 hover:bg-white/[0.03] transition-all cursor-pointer mb-3 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 group">
    <div className="flex items-center gap-4 mb-4 sm:mb-0">
       <div className={`h-12 w-12 shrink-0 flex items-center justify-center text-lg font-light tracking-wider bg-white/5 border border-white/10 group-hover:bg-white/10 transition-colors ${profile.identity.isCompany ? 'rounded-lg' : 'rounded-full'}`}>
         {profile.identity.initials}
      </div>
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="text-base font-medium text-white/90">{profile.identity.name}</h3>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium tracking-wider bg-white/10 text-white/60 uppercase">
            {profile.role}
          </span>
        </div>
        <div className="text-white/40 text-xs font-medium">
          {profile.identity.title} @ {profile.identity.organization}
        </div>
      </div>
    </div>
    
    <div className="flex items-center gap-6 sm:gap-10">
      {profile.stats.slice(0, 4).map((stat, i) => (
        <div key={i} className="flex flex-col items-start sm:items-end">
          <span className="text-white/30 text-[9px] uppercase tracking-wider mb-0.5">{stat.label}</span>
          <span className="text-lg font-mono font-medium text-white/70 group-hover:text-white/90 transition-colors">{stat.value}</span>
        </div>
      ))}
    </div>
  </div>
);

export function CommandHeader() {
  const [activeTab, setActiveTab] = useState('Overview');
  const tabs = ['Overview', 'Deals', 'Activity', 'Documents'];

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white p-4 md:p-8 lg:p-12 font-sans selection:bg-[#E91E8C]/30 selection:text-white">
      <div className="max-w-[1400px] mx-auto">
        
        {/* Breadcrumb / Context */}
        <div className="mb-8 flex items-center gap-2 text-sm font-medium">
          <span className="text-white/40 hover:text-white/70 cursor-pointer transition-colors">Network</span>
          <ChevronRight className="w-4 h-4 text-white/20" />
          <span className="text-white/90">User Profile</span>
        </div>

        {/* Primary Profile Header */}
        <HeaderHero profile={brokerData} />
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-8 border-b border-white/[0.08] mb-8 px-2 overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === tab ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#E91E8C] shadow-[0_-2px_10px_rgba(233,30,140,0.5)] rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* Overview Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column (Meta & Actions) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Quick Actions */}
            <div className="flex flex-col gap-3 mb-2">
              <button className="w-full flex items-center justify-center gap-2 bg-[#E91E8C] hover:bg-[#E91E8C]/90 text-white py-3 rounded-xl text-sm font-medium transition-all shadow-[0_0_20px_rgba(233,30,140,0.2)] hover:shadow-[0_0_25px_rgba(233,30,140,0.3)] hover:-translate-y-0.5 duration-200">
                <MessageSquare className="w-4 h-4" /> Message User
              </button>
              <div className="grid grid-cols-3 gap-3">
                <button className="flex flex-col items-center justify-center gap-1.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-white/80 hover:text-white py-3 rounded-xl text-xs font-medium transition-all">
                  <UserPlus className="w-4 h-4 opacity-70" /> Assign
                </button>
                <button className="flex flex-col items-center justify-center gap-1.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-white/80 hover:text-white py-3 rounded-xl text-xs font-medium transition-all">
                  <FolderOpen className="w-4 h-4 opacity-70" /> Deals
                </button>
                <button className="flex flex-col items-center justify-center gap-1.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-white/80 hover:text-white py-3 rounded-xl text-xs font-medium transition-all">
                  <Edit2 className="w-4 h-4 opacity-70" /> Edit
                </button>
              </div>
            </div>

            {/* Contact Details */}
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-6 backdrop-blur-sm">
              <h3 className="text-white/80 text-sm font-semibold mb-5 flex items-center gap-2">
                <User className="w-4 h-4 text-white/40" /> Contact Details
              </h3>
              <div className="flex flex-col gap-4.5 text-sm">
                <div className="flex flex-col gap-1">
                  <span className="text-white/40 flex items-center gap-2 text-xs uppercase tracking-wider"><Mail className="w-3.5 h-3.5" /> Email</span>
                  <span className="text-white/90 font-mono ml-5.5">{brokerData.contact.email}</span>
                </div>
                <div className="w-full h-px bg-white/[0.04]" />
                <div className="flex flex-col gap-1">
                  <span className="text-white/40 flex items-center gap-2 text-xs uppercase tracking-wider"><Phone className="w-3.5 h-3.5" /> Phone</span>
                  <span className="text-white/90 font-mono ml-5.5">{brokerData.contact.phone}</span>
                </div>
                <div className="w-full h-px bg-white/[0.04]" />
                <div className="flex justify-between items-center">
                  <span className="text-white/40 flex items-center gap-2 text-xs uppercase tracking-wider"><Calendar className="w-3.5 h-3.5" /> Joined</span>
                  <span className="text-white/80 font-medium">{brokerData.contact.joined}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-white/40 flex items-center gap-2 text-xs uppercase tracking-wider"><Clock className="w-3.5 h-3.5" /> Last Active</span>
                  <span className="text-white/80 font-medium">{brokerData.contact.lastActive}</span>
                </div>
              </div>
            </div>

            {/* Role Specifics */}
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-6 backdrop-blur-sm">
              <h3 className="text-white/80 text-sm font-semibold mb-5 flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#E91E8C]/70" /> Role Specifics
              </h3>
              <div className="flex flex-col gap-4 text-sm">
                {brokerData.roleSpecifics.map((spec, i) => (
                  <div key={i} className="flex justify-between items-start">
                    <span className="text-white/40">{spec.label}</span>
                    <span className="text-white/90 text-right font-medium">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column (Activity & Deals) */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            
            {/* Associated Deals */}
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-6 backdrop-blur-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-white/80 text-sm font-semibold flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-white/40" /> Active Deals
                </h3>
                <button className="text-[#E91E8C] text-xs font-semibold hover:text-[#E91E8C]/80 transition-colors flex items-center gap-1 uppercase tracking-wide">
                  View All <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              
              <div className="flex flex-col gap-3">
                {brokerData.deals.map((deal, i) => (
                  <div key={i} className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] hover:border-white/10 transition-all cursor-pointer">
                    <div className="flex items-center gap-4 mb-3 sm:mb-0">
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-[#E91E8C]/10 group-hover:text-[#E91E8C] transition-colors text-white/50">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white/95 mb-1 group-hover:text-white transition-colors">{deal.name}</div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase ${getStageColor(deal.stage)}`}>
                            {deal.stage}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-left sm:text-right ml-14 sm:ml-0">
                      <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Premium</div>
                      <div className="text-base font-mono font-medium text-white/90">{deal.amount}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Stream */}
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-6 backdrop-blur-sm">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-white/80 text-sm font-semibold flex items-center gap-2">
                  <ActivityIcon className="w-4 h-4 text-white/40" /> Recent Activity
                </h3>
              </div>
              
              <div className="relative pl-6 border-l border-white/[0.08] ml-3 flex flex-col gap-8">
                {brokerData.activity.map((act, i) => (
                  <div key={i} className="relative group">
                    <div className="absolute -left-[29px] top-1.5 w-2.5 h-2.5 rounded-full bg-white/10 border-2 border-[#0a0a0c] group-hover:bg-[#E91E8C] group-hover:shadow-[0_0_10px_rgba(233,30,140,0.6)] transition-all duration-300" />
                    <div className="text-sm mb-1.5">
                      <span className="text-white/60">{act.action} </span>
                      <span className="text-white/95 font-medium cursor-pointer hover:text-[#E91E8C] transition-colors">{act.target}</span>
                    </div>
                    <div className="text-xs text-white/30 font-mono flex items-center gap-2">
                      <Clock className="w-3 h-3" /> {act.date}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Proof of Adaptability: Other Roles */}
        <div className="mt-20 border-t border-white/[0.06] pt-10">
          <h3 className="text-white/30 text-xs font-semibold tracking-[0.15em] uppercase mb-6 flex items-center gap-3">
            <span className="w-8 h-px bg-white/10" />
            Command Header Adaptability Proof
            <span className="flex-1 h-px bg-white/10" />
          </h3>
          <div className="flex flex-col gap-2">
            <PreviewHeader profile={underwriterData} />
            <PreviewHeader profile={companyData} />
          </div>
        </div>

      </div>
    </div>
  );
}
