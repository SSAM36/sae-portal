import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Card, CardTitle, CardDescription, CardHeader } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { TerminalSquare, Clock } from 'lucide-react';

const LogsDashboard = () => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetchLogs();

    const channel = supabase
      .channel('activity-logs-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, (payload) => {
        setLogs((prev) => [payload.new, ...prev].slice(0, 100));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching logs:', error);
    } else {
      setLogs(data || []);
    }
  };

  const getTeamBadge = (team) => {
    if (team === 'admin') return <Badge variant="danger" className="text-[10px] uppercase">Admin</Badge>;
    return <Badge variant="info" className="text-[10px] uppercase">{team}</Badge>;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
      <div className="flex flex-col gap-2 relative z-10">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
          <TerminalSquare className="w-8 h-8 text-blue-600" /> System Logs
        </h1>
        <p className="text-slate-500 max-w-2xl text-lg">Central hub showing activity across all admin and team coordinators.</p>
      </div>

      <Card className="shadow-sm border-t-4 border-t-slate-800">
        <div className="bg-white px-6 py-4 border-b border-slate-200">
          <CardTitle className="text-xl">Latest Events</CardTitle>
          <CardDescription className="mt-1">Tracking the latest 100 system events across the portal.</CardDescription>
        </div>

        <Table className="border-0">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Timestamp</TableHead>
              <TableHead className="w-[150px]">Credential / Role</TableHead>
              <TableHead>Event Log</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length > 0 ? (
              logs.map((log) => (
                <TableRow key={log.id} className="group hover:bg-slate-50/80">
                  <TableCell className="text-slate-500 font-mono text-xs flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    {new Date(log.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {getTeamBadge(log.username)}
                  </TableCell>
                  <TableCell className="text-sm font-medium text-slate-700">
                    {log.action}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-32 text-center text-slate-500">
                  No logs available yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default LogsDashboard;