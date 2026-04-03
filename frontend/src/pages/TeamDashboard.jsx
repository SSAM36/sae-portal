import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { logActivity } from '../utils/logger';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { PlayCircle, PauseCircle, CheckCircle2, AlertCircle, MonitorSmartphone, Target, SearchIcon } from 'lucide-react';
import { getTeamByRouteId, resolveTeamList } from '../data/interviewTeams';

const TeamDashboard = () => {
  const { teamName } = useParams();
  const { user } = useAuth();
  const [applicants, setApplicants] = useState([]);
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('All');
  const [sortMode, setSortMode] = useState('name-asc');
  const [feedback, setFeedback] = useState('');
  const teamConfig = getTeamByRouteId(teamName);
  const teamLabel = teamConfig?.displayName || String(teamName || '').toUpperCase();

  useEffect(() => {
    if (!teamLabel) return;

    fetchApplicants(teamLabel);

    const channel = supabase
      .channel(`applicants-team-${teamName}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applicants' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          setApplicants((prev) => prev.filter((applicant) => applicant.id !== payload.old.id));
          return;
        }

        const changed = payload.new;
        const teamList = resolveTeamList([changed.teams]);
        const belongsToTeam = teamList.includes(teamLabel) || (changed.interview_status && changed.interview_status.hasOwnProperty(teamLabel));

        setApplicants((prev) => {
          if (!belongsToTeam) {
            return prev.filter((applicant) => applicant.id !== changed.id);
          }

          const exists = prev.some((applicant) => applicant.id === changed.id);
          if (!exists) return [...prev, changed];
          return prev.map((applicant) => (applicant.id === changed.id ? changed : applicant));
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamName, teamLabel]);

  const fetchApplicants = async (team) => {
    const { data, error } = await supabase
      .from('applicants')
      .select('*')
      .filter('teams', 'cs', `{${team}}`);

    if (error) {
      setFeedback('Unable to load team queue from database.');
      return;
    }

    setApplicants(data || []);
  };

  const handleInterviewAction = async (applicantId, newStatus) => {
    const applicant = applicants.find((candidate) => candidate.id === applicantId);
    if (!applicant) return;

    if (newStatus === 'In Progress' && applicant.current_team && applicant.current_team !== teamLabel) {
      setFeedback(`Candidate is currently with ${applicant.current_team}.`);
      return;
    }

    const newInterviewStatus = { ...(applicant.interview_status || {}), [teamLabel]: newStatus };
    const newCurrentTeam = newStatus === 'Completed' ? null : teamLabel;
    const newCurrentStatus = newStatus === 'In Progress'
      ? `Interviewing with ${teamLabel}`
      : newStatus === 'On Hold'
        ? `On Hold with ${teamLabel}`
        : newStatus;

    const { data, error } = await supabase
      .from('applicants')
      .update({
        interview_status: newInterviewStatus,
        current_team: newCurrentTeam,
        current_status: newCurrentStatus,
      })
      .eq('id', applicantId)
      .select()
      .single();

    if (error) {
      setFeedback('Unable to update interview state.');
      return;
    }

    setFeedback('');
    setApplicants((prev) => prev.map((candidate) => (candidate.id === applicantId ? data : candidate)));
    logActivity(user.username, `Set ${applicant.name}'s ${teamLabel} status to: ${newStatus}`);
  };

  const getStatusBadge = (status) => {
    if (!status) return <Badge variant="muted">Waiting</Badge>;
    const normalized = String(status).toLowerCase();

    if (normalized.includes('completed')) return <Badge variant="success" className="bg-emerald-100/80"><CheckCircle2 className="w-3 h-3 mr-1" /> Done</Badge>;
    if (normalized.includes('in progress')) return <Badge variant="warning" className="bg-blue-100/80 text-blue-800 border-blue-200"><PlayCircle className="w-3 h-3 mr-1" /> Live</Badge>;
    if (normalized.includes('hold')) return <Badge variant="danger" className="bg-amber-100/80 text-amber-800 border-amber-200"><PauseCircle className="w-3 h-3 mr-1" /> Paused</Badge>;
    if (normalized.includes('interviewing')) return <Badge variant="warning" className="bg-purple-100 text-purple-800 border-purple-200"><Target className="w-3 h-3 mr-1" /> Busy</Badge>;

    return <Badge variant="muted">{status}</Badge>;
  };

  const arrivedCandidates = applicants.filter((applicant) => applicant.arrived);
  const branchCounts = arrivedCandidates.reduce((acc, applicant) => {
    const key = String(applicant.branch || 'Other');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const filteredCandidates = [...arrivedCandidates]
    .filter((candidate) => {
      const query = search.toLowerCase();
      const branch = String(candidate.branch || 'Other');
      const matchesQuery =
        candidate.name.toLowerCase().includes(query) ||
        candidate.sap_id.toLowerCase().includes(query) ||
        branch.toLowerCase().includes(query);

      const matchesBranch = branchFilter === 'All' || branch === branchFilter;
      return matchesQuery && matchesBranch;
    })
    .sort((a, b) => {
      if (sortMode === 'dept-asc') return String(a.branch || 'Other').localeCompare(String(b.branch || 'Other'));
      if (sortMode === 'dept-desc') return String(b.branch || 'Other').localeCompare(String(a.branch || 'Other'));
      if (sortMode === 'name-desc') return String(b.name || '').localeCompare(String(a.name || ''));
      return String(a.name || '').localeCompare(String(b.name || ''));
    });

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 relative z-10">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <MonitorSmartphone className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-indigo-600" />
            {teamLabel} Operations
          </h1>
          <p className="text-slate-500 mt-2 text-sm sm:text-base lg:text-lg">Live queue updates from the database with no refresh needed.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full sm:w-auto">
          <div className="bg-white rounded-lg border border-slate-200 px-4 py-2 shadow-sm flex flex-col items-center">
            <span className="text-2xl font-bold text-slate-900">{arrivedCandidates.length}</span>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Queue</span>
          </div>
          <div className="bg-emerald-50 rounded-lg border border-emerald-200 px-4 py-2 shadow-sm flex flex-col items-center">
            <span className="text-2xl font-bold text-emerald-700">
              {arrivedCandidates.filter((candidate) => candidate.interview_status?.[teamLabel] === 'Completed').length}
            </span>
            <span className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Done</span>
          </div>
        </div>
      </div>

      {feedback ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 shadow-sm">
          {feedback}
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={branchFilter === 'All' ? 'default' : 'outline'}
            onClick={() => setBranchFilter('All')}
          >
            All ({arrivedCandidates.length})
          </Button>
          {Object.entries(branchCounts)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([branch, count]) => (
              <Button
                key={branch}
                type="button"
                size="sm"
                variant={branchFilter === branch ? 'default' : 'outline'}
                onClick={() => setBranchFilter(branch)}
              >
                {branch} ({count})
              </Button>
            ))}
        </div>

        <div className="w-full sm:w-60">
          <select
            className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value)}
          >
            <option value="name-asc">Sort: Name A-Z</option>
            <option value="name-desc">Sort: Name Z-A</option>
            <option value="dept-asc">Sort: Dept A-Z</option>
            <option value="dept-desc">Sort: Dept Z-A</option>
          </select>
        </div>
      </div>

      <Card className="shadow-sm border-t-4 border-t-indigo-600">
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl">Candidate Queue</CardTitle>
            <CardDescription className="mt-1">Only checked-in candidates are shown.</CardDescription>
          </div>
          <div className="relative w-full sm:w-80">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search by Name or SAP ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 bg-slate-50 border-slate-200 focus-visible:ring-indigo-500"
            />
          </div>
        </div>

        <div className="w-full overflow-x-auto">
        <Table className="border-0 min-w-[980px]">
          <TableHeader>
            <TableRow className="bg-slate-50/80">
              <TableHead className="w-[280px]">Candidate Details</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Global State</TableHead>
              <TableHead>Team Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCandidates.length > 0 ? filteredCandidates.map((applicant) => (
              <TableRow key={applicant.id} className="group">
                <TableCell>
                  <div className="font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">{applicant.name}</div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">{applicant.sap_id}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(applicant.teams || []).slice(0, 4).map((team) => (
                      <span key={team} className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        {team}
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="info" className="text-[10px] uppercase">
                    {applicant.branch || 'Other'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {getStatusBadge(applicant.current_status)}
                </TableCell>
                <TableCell>
                  {getStatusBadge(applicant.interview_status?.[teamLabel])}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col sm:flex-row justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleInterviewAction(applicant.id, 'In Progress')}
                      disabled={
                        (applicant.current_team !== null && applicant.current_team !== teamLabel) ||
                        (applicant.interview_status && applicant.interview_status[teamLabel] === 'Completed')
                      }
                      className="border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                      <PlayCircle className="w-4 h-4 mr-1.5" /> Start
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleInterviewAction(applicant.id, 'On Hold')}
                      disabled={applicant.interview_status?.[teamLabel] === 'Completed'}
                      className="border-amber-200 text-amber-700 hover:bg-amber-50"
                    >
                      <PauseCircle className="w-4 h-4 mr-1.5" /> Hold
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleInterviewAction(applicant.id, 'Completed')}
                      disabled={applicant.interview_status?.[teamLabel] === 'Completed'}
                      className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1.5" /> Pass
                    </Button>
                  </div>
                  {applicant.current_team && applicant.current_team !== teamLabel && (
                    <div className="mt-2 text-xs font-medium text-red-500 flex items-center justify-end gap-1">
                      <AlertCircle className="w-3 h-3" /> With {applicant.current_team}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={5} className="h-40 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Target className="w-8 h-8 text-slate-300" />
                    <span>No active candidates available for your team.</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </Card>
    </div>
  );
};

export default TeamDashboard;