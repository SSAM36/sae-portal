import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { logActivity } from '../utils/logger';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Users, UploadCloud, UserPlus, Search, CheckCircle2, Clock, HelpCircle, Activity, CheckSquare } from 'lucide-react';
import { TEAM_LABELS, buildInterviewStatus, resolveTeamList } from '../data/interviewTeams';

const emptyApplicant = {
  name: '',
  sap_id: '',
  phone_number: '',
  branch: '',
};

const getCellValue = (row, matcher) => {
  const key = Object.keys(row).find((header) => matcher(header.toLowerCase()));
  return key ? row[key] : '';
};

const getPreferenceValues = (row) => {
  const headers = Object.keys(row);
  const preferenceKeys = headers.filter((header) => {
    const lowered = header.toLowerCase();
    return (
      (lowered.includes('pref') || lowered.includes('choice') || lowered.includes('option') || lowered.includes('team')) &&
      !lowered.includes('name') &&
      !lowered.includes('sap') &&
      !lowered.includes('phone')
    );
  });

  if (preferenceKeys.length > 0) {
    return resolveTeamList(preferenceKeys.map((key) => row[key]));
  }

  return resolveTeamList([
    row.preferences,
    row.preference,
    row['team preferences'],
    row.teams,
    row.appliedTeams,
  ]);
};

const getBranchValue = (row) => {
  const value = getCellValue(row, (header) =>
    header.includes('branch') || header.includes('dept') || header.includes('department')
  );

  return String(value || '').trim();
};

const formatSupabaseError = (error) => {
  if (!error) return 'Unknown database error';
  const parts = [];
  if (error.message) parts.push(error.message);
  if (error.details) parts.push(error.details);
  if (error.hint) parts.push(error.hint);
  if (error.code) parts.push(`Code ${error.code}`);
  return parts.join(' | ');
};

const readDuplicateOrigin = (applicant) => applicant?.interview_status?._duplicateSap || null;

const makeDuplicateSapId = (sapId, seed) => `${sapId}-DUP-${seed}`;

const normalizeApplicant = (row) => {
  const teams = Array.isArray(row?.teams)
    ? row.teams
    : resolveTeamList([row?.teams, row?.preferences, row?.appliedTeams]);

  const interviewStatus =
    row?.interview_status && typeof row.interview_status === 'object'
      ? row.interview_status
      : buildInterviewStatus(teams);

  const arrived = typeof row?.arrived === 'boolean' ? row.arrived : false;

  return {
    ...row,
    name: row?.name || row?.full_name || '',
    sap_id: String(row?.sap_id || ''),
    phone_number: row?.phone_number || row?.phone || '',
    branch: row?.branch || row?.department || row?.dept || 'Other',
    teams,
    arrived,
    current_team: row?.current_team || null,
    current_status: row?.current_status || (arrived ? 'Arrived' : 'Not Arrived'),
    interview_status: interviewStatus,
  };
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const [applicants, setApplicants] = useState([]);
  const [newApplicant, setNewApplicant] = useState(emptyApplicant);
  const [selectedPreferences, setSelectedPreferences] = useState([]);
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('All');
  const [sortMode, setSortMode] = useState('name-asc');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    fetchApplicants();

    const channel = supabase
      .channel('applicants-admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applicants' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const normalized = normalizeApplicant(payload.new);
          setApplicants((prev) => [normalized, ...prev]);
        }

        if (payload.eventType === 'UPDATE') {
          const normalized = normalizeApplicant(payload.new);
          setApplicants((prev) => prev.map((app) => (app.id === normalized.id ? normalized : app)));
        }

        if (payload.eventType === 'DELETE') {
          setApplicants((prev) => prev.filter((app) => app.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchApplicants = async () => {
    const { data, error } = await supabase
      .from('applicants')
      .select('*');

    if (error) {
      setFeedback(`Could not load roster: ${formatSupabaseError(error)}`);
      return;
    }

    setApplicants((data || []).map(normalizeApplicant).reverse());
  };

  const togglePreference = (team) => {
    setFeedback('');
    setSelectedPreferences((prev) =>
      prev.includes(team) ? prev.filter((value) => value !== team) : [...prev, team]
    );
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewApplicant((prev) => ({ ...prev, [name]: value }));
  };

  const prepareCandidate = (record, duplicateOrigin, suffixSeed) => {
    const teams = record.teams || [];
    const interviewStatus = {
      ...buildInterviewStatus(teams),
      ...(duplicateOrigin ? { _duplicateSap: duplicateOrigin } : {}),
    };

    return {
      name: record.name,
      sap_id: duplicateOrigin ? makeDuplicateSapId(record.sap_id, suffixSeed) : record.sap_id,
      phone_number: record.phone_number,
      branch: record.branch || 'Other',
      teams,
      arrived: false,
      current_status: duplicateOrigin ? 'Not Arrived (Duplicate SAP)' : 'Not Arrived',
      current_team: null,
      interview_status: interviewStatus,
    };
  };

  const handleAddApplicant = async (e) => {
    e.preventDefault();

    if (selectedPreferences.length < 4) {
      setFeedback('Select at least 4 team preferences for a walk-in.');
      return;
    }

    const baseCandidate = {
      ...newApplicant,
      teams: selectedPreferences,
      arrived: true,
      current_status: 'Arrived',
      current_team: null,
      interview_status: buildInterviewStatus(selectedPreferences),
    };

    const { data: existingRows, error: existingError } = await supabase
      .from('applicants')
      .select('sap_id')
      .eq('sap_id', newApplicant.sap_id);

    if (existingError) {
      setFeedback(`Unable to verify SAP ID: ${formatSupabaseError(existingError)}`);
      return;
    }

    const hasDuplicate = (existingRows || []).length > 0;
    const candidateToInsert = hasDuplicate
      ? {
          ...baseCandidate,
          sap_id: makeDuplicateSapId(newApplicant.sap_id, Date.now().toString(36)),
          current_status: 'Arrived (Duplicate SAP)',
          interview_status: {
            ...baseCandidate.interview_status,
            _duplicateSap: newApplicant.sap_id,
          },
        }
      : baseCandidate;

    const { error } = await supabase.from('applicants').insert([candidateToInsert]);

    if (error) {
      setFeedback(`Unable to add walk-in: ${formatSupabaseError(error)}`);
      return;
    }

    logActivity(
      user.username,
      hasDuplicate
        ? `Added walk-in with duplicate SAP flag: ${candidateToInsert.name} (${candidateToInsert.sap_id})`
        : `Added new walk-in applicant: ${candidateToInsert.name} (${candidateToInsert.sap_id})`
    );
    setNewApplicant(emptyApplicant);
    setSelectedPreferences([]);
    setFeedback(hasDuplicate ? 'Walk-in added and flagged as duplicate SAP.' : 'Walk-in applicant added.');
  };

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    setImportFile(file || null);
    setFeedback('');
  };

  const handleImportRoster = (e) => {
    e.preventDefault();
    if (!importFile) return;

    const reader = new FileReader();

    reader.onload = async (event) => {
      const rawData = event.target?.result;
      if (!rawData) return;

      setIsImporting(true);
      setFeedback('');

      try {
        const workbook = XLSX.read(rawData, {
          type: typeof rawData === 'string' ? 'string' : 'array',
        });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        const parsed = rows.map((row) => ({
          name: String(getCellValue(row, (header) => header.includes('name')) || '').trim(),
          sap_id: String(getCellValue(row, (header) => header.includes('sap')) || '').trim(),
          phone_number: String(getCellValue(row, (header) => header.includes('phone')) || '').trim(),
          branch: getBranchValue(row) || 'Other',
          teams: getPreferenceValues(row),
        }));

        const cleaned = parsed.filter((record) => record.name && record.sap_id && record.phone_number && record.teams.length >= 4);

        if (cleaned.length === 0) {
          setFeedback('No valid rows found. Ensure name, SAP ID, phone number, and at least 4 preferences are present.');
          return;
        }

        const sourceSapIds = Array.from(new Set(cleaned.map((record) => record.sap_id)));
        const { data: existingRows, error: existingError } = await supabase
          .from('applicants')
          .select('sap_id')
          .in('sap_id', sourceSapIds);

        if (existingError) {
          setFeedback(`Could not validate existing SAP IDs: ${formatSupabaseError(existingError)}`);
          return;
        }

        const usedSapIds = new Set((existingRows || []).map((row) => row.sap_id));
        const seenInBatch = new Map();
        let duplicateCount = 0;

        const payload = cleaned.map((record) => {
          const seenCount = seenInBatch.get(record.sap_id) || 0;
          seenInBatch.set(record.sap_id, seenCount + 1);
          const isDuplicate = usedSapIds.has(record.sap_id) || seenCount > 0;

          if (!isDuplicate) {
            usedSapIds.add(record.sap_id);
            return prepareCandidate(record, null, null);
          }

          duplicateCount += 1;
          let suffixCounter = seenCount + 1;
          let candidateSapId = makeDuplicateSapId(record.sap_id, suffixCounter);

          while (usedSapIds.has(candidateSapId)) {
            suffixCounter += 1;
            candidateSapId = makeDuplicateSapId(record.sap_id, suffixCounter);
          }

          usedSapIds.add(candidateSapId);

          const duplicateCandidate = prepareCandidate(record, record.sap_id, suffixCounter);
          duplicateCandidate.sap_id = candidateSapId;
          return duplicateCandidate;
        });

        const { error } = await supabase.from('applicants').insert(payload);

        if (error) {
          setFeedback(`Import failed: ${formatSupabaseError(error)}`);
          return;
        }

        logActivity(user.username, `Imported ${payload.length} applicants (${duplicateCount} duplicate SAP flagged)`);
        setFeedback(
          duplicateCount > 0
            ? `Imported ${payload.length} rows. Flagged ${duplicateCount} duplicate SAP ID row${duplicateCount === 1 ? '' : 's'}.`
            : `Imported ${payload.length} applicants successfully.`
        );
      } finally {
        setIsImporting(false);
      }
    };

    if (/\.csv$/i.test(importFile.name)) {
      reader.readAsText(importFile);
    } else {
      reader.readAsArrayBuffer(importFile);
    }
  };

  const handleArrivedToggle = async (id, arrived) => {
    const { data, error } = await supabase
      .from('applicants')
      .update({
        arrived: !arrived,
        current_status: !arrived ? 'Arrived' : 'Not Arrived',
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      setFeedback(`Could not update arrival: ${formatSupabaseError(error)}`);
      return;
    }

    const normalized = normalizeApplicant(data);
    setApplicants((prev) => prev.map((applicant) => (applicant.id === id ? normalized : applicant)));
    logActivity(user.username, `Marked applicant ${data.name} as ${!arrived ? 'Checked In' : 'Not Arrived'}`);
  };

  const getStatusBadge = (status) => {
    if (!status) return <Badge variant="muted">Not Started</Badge>;

    const normalized = String(status).toLowerCase();
    if (normalized.includes('completed')) return <Badge variant="success" className="animate-in fade-in zoom-in duration-300"><CheckCircle2 className="w-3 h-3 mr-1" /> Completed</Badge>;
    if (normalized.includes('interview') || normalized.includes('progress')) return <Badge variant="warning" className="animate-pulse"><Activity className="w-3 h-3 mr-1" /> {status}</Badge>;
    if (normalized.includes('hold')) return <Badge variant="danger"><Clock className="w-3 h-3 mr-1" /> On Hold</Badge>;
    if (normalized.includes('arrived')) return <Badge variant="info"><UserPlus className="w-3 h-3 mr-1" /> Arrived</Badge>;
    if (normalized.includes('not arrived')) return <Badge variant="muted"><HelpCircle className="w-3 h-3 mr-1" /> Not Arrived</Badge>;
    return <Badge variant="muted">{status}</Badge>;
  };

  const filteredApplicants = useMemo(() => {
    const query = search.toLowerCase();
    const byQuery = applicants.filter((applicant) => {
      const preferenceList = applicant.teams || [];
      const branch = String(applicant.branch || 'Other');
      return (
        String(applicant.name || '').toLowerCase().includes(query) ||
        String(applicant.sap_id || '').toLowerCase().includes(query) ||
        branch.toLowerCase().includes(query) ||
        preferenceList.join(' ').toLowerCase().includes(query)
      );
    });

    const byBranch = branchFilter === 'All'
      ? byQuery
      : byQuery.filter((applicant) => String(applicant.branch || 'Other') === branchFilter);

    const sorted = [...byBranch].sort((a, b) => {
      if (sortMode === 'dept-asc') return String(a.branch || 'Other').localeCompare(String(b.branch || 'Other'));
      if (sortMode === 'dept-desc') return String(b.branch || 'Other').localeCompare(String(a.branch || 'Other'));
      if (sortMode === 'name-desc') return String(b.name || '').localeCompare(String(a.name || ''));
      return String(a.name || '').localeCompare(String(b.name || ''));
    });

    return sorted;
  }, [applicants, search, branchFilter, sortMode]);

  const branchCounts = useMemo(() => {
    const counts = applicants.reduce((acc, applicant) => {
      const key = String(applicant.branch || 'Other');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return counts;
  }, [applicants]);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2 relative z-10">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
          <Users className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-blue-600" /> Registration Desk
        </h1>
        <p className="text-slate-500 max-w-2xl text-sm sm:text-base lg:text-lg">Database-backed roster with real-time sync across all dashboards.</p>
      </div>

      {feedback ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          {feedback}
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6 relative z-10">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center"><UploadCloud className="w-5 h-5 mr-2 text-indigo-500" /> Spreadsheet Import</CardTitle>
            <CardDescription>Duplicates do not fail import; duplicate SAP IDs are flagged automatically.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleImportRoster} className="space-y-4">
              <Input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors file:text-blue-600 file:font-semibold h-12 pt-2.5" />
              <Button type="submit" disabled={!importFile || isImporting} className="h-12 px-6">
                {isImporting ? 'Processing...' : 'Import Roster'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center"><UserPlus className="w-5 h-5 mr-2 text-emerald-500" /> Walk-in Registration</CardTitle>
            <CardDescription>Add a candidate on the spot and store instantly in the database.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddApplicant} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input placeholder="Full Name" name="name" value={newApplicant.name} onChange={handleInputChange} required className="sm:col-span-1" />
              <Input placeholder="SAP ID" name="sap_id" value={newApplicant.sap_id} onChange={handleInputChange} required className="sm:col-span-1" />
              <Input placeholder="Department (e.g. EXTC)" name="branch" value={newApplicant.branch} onChange={handleInputChange} required className="sm:col-span-1" />
              <Input placeholder="Phone Number" name="phone_number" value={newApplicant.phone_number} onChange={handleInputChange} required className="col-span-2" />

              <div className="col-span-2 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Team Preferences</p>
                    <p className="text-xs text-slate-500">Pick at least 4 teams.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{selectedPreferences.length}/11 selected</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {TEAM_LABELS.map((team) => {
                    const selected = selectedPreferences.includes(team);
                    return (
                      <Button
                        key={team}
                        type="button"
                        variant={selected ? 'default' : 'outline'}
                        className={`justify-between h-auto py-3 px-3 ${selected ? '' : 'text-slate-700'}`}
                        onClick={() => togglePreference(team)}
                      >
                        <span className="text-left leading-tight">{team}</span>
                        {selected ? <CheckSquare className="w-4 h-4 ml-2" /> : <span className="ml-2 text-[10px] uppercase tracking-wider">Add</span>}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <Button type="submit" className="col-span-2 w-full mt-1 bg-emerald-600 hover:bg-emerald-700">Add Walk-in</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm overflow-hidden border-t-4 border-t-blue-600">
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl">Active Roster</CardTitle>
            <CardDescription className="mt-1">All {applicants.length} registered candidates</CardDescription>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search by name, SAP ID, or team"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 w-full"
            />
          </div>
        </div>

        <div className="px-4 md:px-6 py-3 border-b border-slate-200 bg-slate-50/70 flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={branchFilter === 'All' ? 'default' : 'outline'}
              onClick={() => setBranchFilter('All')}
            >
              All ({applicants.length})
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

        <div className="w-full overflow-x-auto">
        <Table className="border-0 min-w-[980px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[220px]">Candidate Details</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Preferences</TableHead>
              <TableHead>Check-In</TableHead>
              <TableHead>Global State</TableHead>
              <TableHead className="text-right">Active Team</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredApplicants.length > 0 ? filteredApplicants.map((applicant) => {
              const preferenceList = applicant.teams || [];
              const duplicateOrigin = readDuplicateOrigin(applicant);

              return (
                <TableRow key={applicant.id} className="group">
                  <TableCell>
                    <div className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">{applicant.name}</div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">{applicant.sap_id}</div>
                    {duplicateOrigin ? (
                      <div className="mt-1">
                        <Badge variant="warning" className="text-[10px] uppercase">Duplicate SAP: {duplicateOrigin}</Badge>
                      </div>
                    ) : null}
                    <div className="text-xs text-slate-400 mt-0.5">{applicant.phone_number}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="info" className="text-[10px] uppercase">
                      {applicant.branch || 'Other'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {preferenceList.length > 0 ? preferenceList.map((team) => (
                        <span key={team} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border bg-slate-50 text-slate-600 border-slate-200">
                          {team}
                        </span>
                      )) : <span className="text-sm text-slate-400">No preferences stored</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant={applicant.arrived ? 'success' : 'outline'}
                      size="sm"
                      className={`w-28 text-xs transition-all ${applicant.arrived ? 'shadow-emerald-200 shadow-sm' : ''}`}
                      onClick={() => handleArrivedToggle(applicant.id, applicant.arrived)}
                    >
                      {applicant.arrived ? <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> : null}
                      {applicant.arrived ? 'Checked In' : 'Mark Arrived'}
                    </Button>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(applicant.current_status)}
                  </TableCell>
                  <TableCell className="text-right">
                    {applicant.current_team ? (
                      <span className="inline-flex drop-shadow-sm items-center px-2.5 py-1 rounded bg-blue-600 text-white text-xs font-bold shadow-sm">
                        {applicant.current_team}
                      </span>
                    ) : <span className="text-slate-400 text-sm">—</span>}
                  </TableCell>
                </TableRow>
              );
            }) : (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                  No applicants found matching "{search}"
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

export default AdminDashboard;