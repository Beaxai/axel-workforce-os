import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Search } from "lucide-react";
import { api } from "@/lib/api";
import { ContactCard } from "@/components/ui/ContactCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface TeamMember {
  name: string;
  title?: string;
  email?: string;
  phoneDirect?: string;
  phoneMobile?: string;
  department?: string;
  avatarUrl?: string | null;
}

export default function TeamPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  const { data: team = [], isLoading } = useQuery({
    queryKey: ["team-directory"],
    queryFn: async () => {
      const data = await api.get<TeamMember[]>("/users/team");
      return data;
    },
  });

  const departments = useMemo(() => {
    const deps = new Set<string>();
    team.forEach((member) => {
      if (member.department) deps.add(member.department);
    });
    return Array.from(deps).sort();
  }, [team]);

  const filteredTeam = useMemo(() => {
    return team.filter((member) => {
      const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (member.email && member.email.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesDept = departmentFilter === "all" || member.department === departmentFilter;
      return matchesSearch && matchesDept;
    });
  }, [team, searchQuery, departmentFilter]);

  return (
    <div className="flex flex-col h-full bg-[var(--app-bg)] overflow-hidden">
      <div className="flex items-center justify-between px-8 py-6 flex-shrink-0 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Internal Team</h1>
            <p className="text-sm text-muted-foreground">Staff directory and contact information.</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background/50 border-border/50"
            />
          </div>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-48 bg-background/50 border-border/50">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : filteredTeam.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-accent-foreground/50" />
            </div>
            <h3 className="text-lg font-medium">No team members found</h3>
            <p className="text-muted-foreground mt-1">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTeam.map((member) => (
              <ContactCard
                key={member.email ?? member.name}
                variant="staff"
                name={member.name}
                title={member.title}
                role={member.department}
                email={member.email}
                phoneDirect={member.phoneDirect}
                phoneMobile={member.phoneMobile}
                avatarUrl={member.avatarUrl}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}