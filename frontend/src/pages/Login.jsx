import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logActivity } from '../utils/logger';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Lock, Users } from 'lucide-react';
import { TEAM_DEFINITIONS } from '../data/interviewTeams';

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const userObj = await login({ username, password });
      const userStr = String(userObj?.username || username).toLowerCase().trim();
      await logActivity(userStr, 'Logged in successfully');

      if (userObj?.role === 'admin') {
        navigate('/admin');
      } else if (userObj?.team) {
        navigate(`/team/${userObj.team}`);
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err?.message || 'Invalid credentials.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100 via-slate-50 to-white -z-10"></div>
      
      <Card className="w-full max-w-sm relative z-10 shadow-xl border-t-4 border-t-blue-600">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">SAE Portal Access</CardTitle>
          <CardDescription>Sign in with your team username or admin credentials.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && <p className="text-sm font-medium text-red-500 text-center bg-red-50 p-2 rounded">{error}</p>}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Username</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  className="pl-9"
                  type="text" 
                  placeholder="e.g. admin, kronos, phoenix" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  required 
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  className="pl-9"
                  type="password" 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-11 text-base font-semibold mt-2">
              Authenticate
            </Button>
          </form>
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
            <div className="font-semibold text-slate-700 mb-2">Available team logins</div>
            <div className="flex flex-wrap gap-1.5">
              {TEAM_DEFINITIONS.map((team) => (
                <span key={team.routeId} className="rounded-full border border-slate-200 bg-white px-2 py-1 font-medium text-slate-600">
                  {team.username}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
