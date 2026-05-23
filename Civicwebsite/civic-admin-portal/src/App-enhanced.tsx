import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { useNotification } from './hooks/useNotification';
import { useLoading } from './hooks/useLoading';
import { IssueDetailModal } from './IssueDetailModal';
import {
  LayoutDashboard, Map, ClipboardList, BarChart3,
  LogOut, RefreshCw, Loader2, X, CheckCircle2,
  AlertCircle, AlertTriangle, Info, Ticket,
  MessageSquare, MapPin, Eye, Pencil, Lock,
  Send, Phone, Download, ChevronDown, ChevronUp,
  Shield
} from 'lucide-react';

// ── Notification Toast ────────────────────────────────────────
function NotificationContainer({ notifications, removeNotification }) {
  const iconMap = {
    success: <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />,
    error:   <AlertCircle  size={16} className="text-rose-400 shrink-0" />,
    warning: <AlertTriangle size={16} className="text-amber-400 shrink-0" />,
    info:    <Info          size={16} className="text-sky-400 shrink-0" />,
  };
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80">
      {notifications.map((n) => (
        <div
          key={n.id}
          className="animate-slide-in glass rounded-xl px-4 py-3 flex items-start gap-3
                     shadow-2xl border border-white/10"
        >
          {iconMap[n.type] ?? iconMap.info}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white leading-tight">{n.title}</p>
            {n.message && <p className="text-xs text-slate-400 mt-0.5 leading-snug">{n.message}</p>}
          </div>
          <button
            onClick={() => removeNotification(n.id)}
            className="text-slate-500 hover:text-white transition-colors shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Loading Button ────────────────────────────────────────────
function LoadingButton({ isLoading, children, onClick, className, disabled = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${className} ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                  inline-flex items-center gap-2 transition-all`}
    >
      {isLoading ? <Loader2 size={14} className="animate-spin" /> : children}
    </button>
  );
}

// ── Floating Dock (replaces ALL navbars) ──────────────────────
const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { path: '/map',       label: 'Map',       Icon: Map             },
  { path: '/issues',    label: 'Issues',    Icon: ClipboardList   },
  { path: '/analytics', label: 'Analytics', Icon: BarChart3       },
];

function FloatingDock({ currentPath }) {
  return (
    <nav
      className="fixed bottom-6 left-1/2 z-50 opacity-0 animate-dock-in
                 glass rounded-2xl px-3 py-2 flex items-center gap-1
                 shadow-2xl shadow-black/40
                 border border-white/10"
      style={{ transform: 'translateX(-50%)' }}
    >
      {/* Brand mark */}
      <div className="flex items-center gap-2 px-3 mr-2 border-r border-white/10">
        <Shield size={16} className="text-sky-400" />
        <span className="text-xs font-bold text-white tracking-wide hidden sm:block">CIVIC</span>
      </div>

      {NAV_ITEMS.map(({ path, label, Icon }) => {
        const active = currentPath === path;
        return (
          <a
            key={path}
            href={path}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium
                        transition-all duration-200
                        ${ active
                          ? 'bg-sky-500/20 text-sky-300 shadow-inner shadow-sky-500/10'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
          >
            <Icon size={15} />
            <span className="hidden sm:block">{label}</span>
          </a>
        );
      })}

      {/* Logout */}
      <div className="ml-2 pl-2 border-l border-white/10">
        <a
          href="/login"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium
                     text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
        >
          <LogOut size={15} />
          <span className="hidden sm:block">Logout</span>
        </a>
      </div>
    </nav>
  );
}

function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm opacity-0 animate-fade-up">
        {/* Brand */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/30
                          flex items-center justify-center">
            <Shield size={20} className="text-sky-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium tracking-widest uppercase">Civic</p>
            <p className="text-white font-bold text-lg leading-none">Admin Portal</p>
          </div>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8 shadow-2xl shadow-black/40 border border-white/10">
          <h2 className="text-white font-semibold text-lg mb-1">Welcome back</h2>
          <p className="text-slate-400 text-sm mb-6">Sign in to your admin account</p>

          <form onSubmit={(e) => { e.preventDefault(); window.location.href = '/dashboard'; }}
                className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
              <input
                type="email"
                placeholder="admin@ranchi.gov.in"
                required
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white
                           bg-white/5 border border-white/10
                           placeholder-slate-600
                           focus:outline-none focus:border-sky-500/50 focus:bg-white/8
                           transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                required
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white
                           bg-white/5 border border-white/10
                           placeholder-slate-600
                           focus:outline-none focus:border-sky-500/50
                           transition-all"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl text-sm font-semibold
                         bg-sky-500 hover:bg-sky-400 text-white
                         shadow-lg shadow-sky-500/25
                         transition-all duration-200 mt-2"
            >
              Sign In
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Ranchi Municipal Corporation · Secure Admin Access
        </p>
      </div>
    </div>
  );
}

function Dashboard() {
  const { notifications, removeNotification, success } = useNotification();
  const { executeAsync } = useLoading();
  const [refreshing, setRefreshing] = useState(false);

  // LIVE DATA: Get real issues from Convex
  const { issues: liveIssues, isLoading } = useLiveIssues();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-sky-400 animate-spin" />
          <p className="text-slate-400 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    await executeAsync(async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      success('Data Refreshed', 'Dashboard updated with latest information');
    });
    setRefreshing(false);
  };

  const stats = [
    { label: 'Total Issues',  value: liveIssues.length,                                        sub: 'Live from database',  color: 'text-sky-400',     delay: 'animate-fade-up-d1' },
    { label: 'Pending',       value: liveIssues.filter(i => i.status === 'pending').length,     sub: 'Needs attention',     color: 'text-rose-400',    delay: 'animate-fade-up-d2' },
    { label: 'In Progress',   value: liveIssues.filter(i => i.status === 'in-progress').length, sub: 'Being resolved',      color: 'text-amber-400',   delay: 'animate-fade-up-d3' },
    { label: 'Resolved',      value: liveIssues.filter(i => i.status === 'resolved').length,    sub: 'Completed',           color: 'text-emerald-400', delay: 'animate-fade-up-d4' },
  ];

  return (
    <div className="min-h-screen pb-28">
      <NotificationContainer notifications={notifications} removeNotification={removeNotification} />
      <FloatingDock currentPath="/dashboard" />

      <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-10 lg:pt-14">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 opacity-0 animate-fade-up">
          <div>
            <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">Dashboard</h1>
            <p className="text-slate-500 text-sm mt-1">Real-time overview of civic issues</p>
          </div>
          <LoadingButton
            isLoading={refreshing}
            onClick={handleRefresh}
            className="px-4 py-2 rounded-xl text-sm font-medium
                       glass border border-white/10 text-slate-300
                       hover:text-white hover:border-white/20 transition-all"
          >
            <RefreshCw size={14} />
            Refresh
          </LoadingButton>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map(({ label, value, sub, color, delay }) => (
            <div key={label}
              className={`glass rounded-2xl p-5 border border-white/10
                          shadow-2xl shadow-black/30 opacity-0 ${delay}`}
            >
              <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-2">{label}</p>
              <p className={`text-4xl lg:text-5xl font-extrabold ${color} leading-none mb-2`}>{value}</p>
              <p className="text-xs text-slate-600">{sub}</p>
            </div>
          ))}
        </div>

        {/* Recent issues table */}
        <div className="glass rounded-2xl border border-white/10 shadow-2xl shadow-black/30
                        opacity-0 animate-fade-up-d5">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">
              Recent Issues
              <span className="ml-2 px-2 py-0.5 rounded-full bg-white/10 text-slate-400 text-xs font-normal">
                {liveIssues.length}
              </span>
            </h3>
          </div>

          <div className="divide-y divide-white/5">
            {liveIssues.length === 0 ? (
              <div className="py-12 text-center">
                <ClipboardList size={32} className="text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No issues reported yet</p>
                <p className="text-slate-600 text-xs mt-1">Issues from mobile app will appear here</p>
              </div>
            ) : (
              liveIssues.slice(0, 5).map((issue) => (
                <div key={issue._id}
                  className="px-6 py-4 flex items-center justify-between gap-4
                             hover:bg-white/[0.03] transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{issue.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {issue.category}
                      <span className="mx-1.5 text-slate-700">·</span>
                      {new Date(issue._creationTime).toLocaleString()}
                    </p>
                    {issue.source && (
                      <p className="text-xs text-slate-600 mt-0.5">Source: {issue.source}</p>
                    )}
                  </div>
                  <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide
                    ${ issue.status === 'pending'     ? 'bg-rose-500/15 text-rose-400'
                     : issue.status === 'in-progress' ? 'bg-amber-500/15 text-amber-400'
                     : 'bg-emerald-500/15 text-emerald-400' }`}
                  >
                    {issue.status.replace('-', ' ').toUpperCase()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// LIVE DATA: Connect to Convex database
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL || 'https://quick-anaconda-973.convex.cloud');

// Live data hook with loading state
function useLiveIssues() {
  const issues = useQuery(api.issues.getAllIssues);
  return {
    issues: issues || [],
    isLoading: issues === undefined
  };
}

function MapPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // LIVE DATA: Get real issues from Convex
  const { issues: liveIssues, isLoading } = useLiveIssues();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-sky-400 animate-spin" />
          <p className="text-slate-400 text-sm">Loading map...</p>
        </div>
      </div>
    );
  }

  const filteredIssues = liveIssues.filter(issue => {
    const matchesStatus   = statusFilter   === 'all' || issue.status   === statusFilter;
    const matchesCategory = categoryFilter === 'all' || issue.category === categoryFilter;
    return matchesStatus && matchesCategory;
  });

  return (
    <div className="min-h-screen pb-28">
      <FloatingDock currentPath="/map" />

      <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-10 lg:pt-14">

        {/* Header */}
        <div className="mb-8 opacity-0 animate-fade-up">
          <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">Map View</h1>
          <p className="text-slate-500 text-sm mt-1">Geographical visualization of civic issues</p>
        </div>

        {/* Filters */}
        <div className="glass rounded-2xl border border-white/10 p-5 mb-6
                        shadow-2xl shadow-black/30 opacity-0 animate-fade-up-d1">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm text-white
                         bg-white/5 border border-white/10
                         focus:outline-none focus:border-sky-500/50 transition-all"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm text-white
                         bg-white/5 border border-white/10
                         focus:outline-none focus:border-sky-500/50 transition-all"
            >
              <option value="all">All Categories</option>
              <option value="Road Maintenance">Road Maintenance</option>
              <option value="Electrical">Electrical</option>
              <option value="Water Supply">Water Supply</option>
              <option value="Sanitation">Sanitation</option>
              <option value="Traffic">Traffic</option>
            </select>
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-4">
            {[
              { label: 'Pending',     color: 'bg-rose-500'    },
              { label: 'In Progress', color: 'bg-amber-500'   },
              { label: 'Resolved',    color: 'bg-emerald-500' },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                <span className="text-xs text-slate-400">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Map */}
        <div className="glass rounded-2xl border border-white/10 mb-6
                        shadow-2xl shadow-black/30 overflow-hidden
                        opacity-0 animate-fade-up-d2">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Map size={15} className="text-sky-400" />
              Showing {filteredIssues.length} issues in Ranchi, Jharkhand
            </h3>
            {filteredIssues.length > 0 && (
              <button
                onClick={() => {
                  const coords = filteredIssues.map(i => `${i.latitude},${i.longitude}`).join('|');
                  window.open(`https://maps.google.com/?q=${coords}`, '_blank');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium
                           bg-sky-500/15 text-sky-400 hover:bg-sky-500/25 transition-all"
              >
                <MapPin size={12} />
                Open in Google Maps
              </button>
            )}
          </div>

          <div className="h-72 sm:h-96 lg:h-[480px] relative">
            {filteredIssues.length > 0 ? (
              <>
                <iframe
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${filteredIssues[0].longitude-0.01},${filteredIssues[0].latitude-0.01},${filteredIssues[0].longitude+0.01},${filteredIssues[0].latitude+0.01}&layer=mapnik&marker=${filteredIssues[0].latitude},${filteredIssues[0].longitude}`}
                  width="100%" height="100%"
                  style={{ border: 0 }}
                  allowFullScreen loading="lazy"
                />
                {/* Overlay badge */}
                <div className="absolute top-3 left-3 glass rounded-xl px-3 py-2
                                border border-white/10 shadow-lg">
                  <p className="text-xs font-semibold text-white">{filteredIssues.length} Issues Found</p>
                  <div className="text-xs text-slate-400 mt-1 space-y-0.5">
                    {filteredIssues.slice(0, 3).map(issue => (
                      <div key={issue._id} className="truncate max-w-[180px]">· {issue.title}</div>
                    ))}
                    {filteredIssues.length > 3 && (
                      <div className="text-slate-500">+{filteredIssues.length - 3} more</div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-3">
                <Map size={40} className="text-slate-700" />
                <p className="text-slate-500 text-sm font-medium">No Issues to Display</p>
                <p className="text-slate-600 text-xs">Create an issue from the mobile app to see it here</p>
              </div>
            )}
          </div>
        </div>

        {/* Mini stat row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 opacity-0 animate-fade-up-d3">
          {[
            { label: 'Total',       value: filteredIssues.length,                                        color: 'text-sky-400'     },
            { label: 'Pending',     value: filteredIssues.filter(i => i.status === 'pending').length,     color: 'text-rose-400'    },
            { label: 'In Progress', value: filteredIssues.filter(i => i.status === 'in-progress').length, color: 'text-amber-400'   },
            { label: 'Resolved',    value: filteredIssues.filter(i => i.status === 'resolved').length,    color: 'text-emerald-400' },
          ].map(({ label, value, color }) => (
            <div key={label}
              className="glass rounded-2xl p-4 border border-white/10
                         shadow-xl shadow-black/20 text-center"
            >
              <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
              <p className="text-xs text-slate-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

function IssuesPage() {
  const { notifications, removeNotification, success } = useNotification();
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [newComment, setNewComment] = useState('');
  const [expandedComments, setExpandedComments] = useState({});
  
  // LIVE DATA: Get real issues from Convex
  const { issues: liveIssues, isLoading } = useLiveIssues();
  const updateIssueStatus = useMutation(api.issues.updateIssueStatus);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-sky-400 animate-spin" />
          <p className="text-slate-400 text-sm">Loading issues...</p>
        </div>
      </div>
    );
  }
  
  const handleUpdateClick = (issue) => {
    setSelectedIssue(issue);
    setNewStatus(issue.status);
    setShowModal(true);
  };
  
  const handleDetailClick = (issue) => {
    setSelectedIssue(issue);
    setShowDetailModal(true);
  };
  
  const handleAssignTask = (issue) => {
    // REAL DEPARTMENT PHONE NUMBERS - Replace with your actual numbers
    const departmentContacts = {
      'Road Maintenance': '+91-7249187996',
      'Electrical': '+91-9881812186', 
      'Water Supply': '+91-7588953799',
      'Sanitation': '+91-8830209016',
      'Traffic': '+91-7558591267',
      'Traffic Signal': '+91-7558591267',
      'Street Light': '+91-8788394028',
      'Pothole': '+91-9764207088',
      'Garbage/Waste': '+91-9529212771',
      'Water Issue': '+91-7249187996',
      'Drainage': '+91-9881812186'
    };
    
    const phoneNumber = departmentContacts[issue.category] || '+91-9876543215';
    const message = `CIVIC TASK ASSIGNMENT: You have been assigned a ${issue.category} task at location ${issue.latitude?.toFixed(4)}, ${issue.longitude?.toFixed(4)}. Issue: ${issue.title}. Please complete within 3 days maximum. Priority: ${issue.priority || 'Medium'}. Contact admin for details.`;
    
    // Open SMS app with pre-filled message
    const smsUrl = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
    window.open(smsUrl, '_blank');
    
    success('Task Assigned', `SMS sent to ${issue.category} department (${phoneNumber})`);
  };
  
  const handleCloseIssue = async (issue) => {
    try {
      const convexUrl = 'https://quick-anaconda-973.convex.cloud';
      const response = await fetch(`${convexUrl}/api/mutation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: 'issues:closeIssue',
          args: { issueId: issue._id }
        })
      });
      
      if (response.ok) {
        success('Issue Closed', `Ticket ${issue.ticketId || issue._id.slice(-6)} has been closed and removed from active queue`);
        setShowDetailModal(false);
        // Refresh page to show updated list
        setTimeout(() => window.location.reload(), 1000);
      } else {
        throw new Error('Close failed');
      }
    } catch (error) {
      console.error('Failed to close issue:', error);
      success('Close Failed', 'Could not close issue');
    }
  };
  
  const handleStatusUpdate = async () => {
    try {
      // Direct Convex call to update status with admin note
      const convexUrl = 'https://quick-anaconda-973.convex.cloud';
      const response = await fetch(`${convexUrl}/api/mutation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: 'issues:updateIssueStatus',
          args: { 
            issueId: selectedIssue._id, 
            status: newStatus,
            adminNote: adminNote || undefined,
            adminName: 'Admin Portal'
          }
        })
      });
      
      if (response.ok) {
        const noteText = adminNote ? ` with note: "${adminNote}"` : '';
        success('Status Updated', `Ticket ${selectedIssue.ticketId || selectedIssue._id.slice(-6)} updated to ${newStatus.replace('-', ' ')}${noteText}`);
        // Refresh page to show updated status
        setTimeout(() => window.location.reload(), 1000);
      } else {
        throw new Error('Update failed');
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      success('Update Failed', 'Could not update issue status');
    }
    setShowModal(false);
    setSelectedIssue(null);
    setAdminNote('');
  };
  
  const getStatusBadge = (status) => {
    const badges = {
      'pending': 'px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium',
      'in-progress': 'px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium',
      'resolved': 'px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium'
    };
    return badges[status] || badges['pending'];
  };
  
  const toggleComments = (issueId) => {
    setExpandedComments(prev => ({
      ...prev,
      [issueId]: !prev[issueId]
    }));
  };
  
  const submitAdminComment = async (issueId) => {
    if (!newComment.trim()) return;
    
    try {
      const convexUrl = 'https://quick-anaconda-973.convex.cloud';
      const response = await fetch(`${convexUrl}/api/mutation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: 'issues:addComment',
          args: {
            issueId,
            comment: {
              text: newComment,
              timestamp: Date.now(),
              isAdmin: true,
              author: 'Admin'
            }
          }
        })
      });
      
      if (response.ok) {
        success('Comment Added', 'Admin comment sent to user');
        setNewComment('');
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
      success('Comment Failed', 'Could not add comment');
    }
  };
  
  const filteredIssues = liveIssues.filter(issue => {
    if (!issue || !issue.title) return false;
    const matchesSearch = searchTerm === '' || 
                         issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (issue.category && issue.category.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || issue.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  
  return (
    <div className="min-h-screen pb-28">
      <NotificationContainer notifications={notifications} removeNotification={removeNotification} />
      <FloatingDock currentPath="/issues" />

      <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-10 lg:pt-14">

        {/* Header */}
        <div className="mb-8 opacity-0 animate-fade-up">
          <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">Ticket Management</h1>
          <p className="text-slate-500 text-sm mt-1">Manage and track civic tickets</p>
        </div>

        {/* Search + Filter bar */}
        <div className="glass rounded-2xl border border-white/10 p-4 mb-6
                        shadow-2xl shadow-black/30 opacity-0 animate-fade-up-d1">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search tickets by ID, title, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2.5 rounded-xl text-sm text-white
                         bg-white/5 border border-white/10 placeholder-slate-600
                         focus:outline-none focus:border-sky-500/50 transition-all"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl text-sm text-white
                         bg-white/5 border border-white/10
                         focus:outline-none focus:border-sky-500/50 transition-all"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
            <button
              onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
              className="px-3 py-2.5 rounded-xl text-xs font-medium
                         text-slate-400 hover:text-white border border-white/10
                         hover:border-white/20 transition-all"
            >
              Clear
            </button>
          </div>
          <p className="text-xs text-slate-600 mt-3">
            Showing {filteredIssues.length} of {liveIssues.length} issues
          </p>
        </div>
        
        {/* Issues list */}
        <div className="glass rounded-2xl border border-white/10 shadow-2xl shadow-black/30
                        opacity-0 animate-fade-up-d2">
          <div className="px-6 py-4 border-b border-white/10">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <ClipboardList size={15} className="text-sky-400" />
              All Tickets
            </h3>
          </div>

          <div className="divide-y divide-white/5">
            {filteredIssues.length === 0 ? (
              <div className="py-12 text-center">
                <ClipboardList size={32} className="text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No issues found</p>
                <p className="text-slate-600 text-xs mt-1">Create an issue from the mobile app</p>
              </div>
            ) : (
              filteredIssues.map((issue) => (
                <div key={issue._id}
                  className="px-6 py-5 hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">

                    {/* Left — ticket info */}
                    <div className="flex-1 min-w-0">
                      {/* Ticket ID badge */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5
                                         rounded-full text-xs font-mono
                                         bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          <Ticket size={10} />
                          {issue.ticketId || `TKT-${issue._id.slice(-6)}`}
                        </span>
                      </div>

                      <h3 className="text-sm font-semibold text-white">{issue.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {issue.category}
                        <span className="mx-1.5 text-slate-700">·</span>
                        {new Date(issue._creationTime).toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed">{issue.description}</p>
                      <p className="text-xs text-slate-600 mt-1">
                        <MapPin size={10} className="inline mr-1" />
                        {issue.latitude?.toFixed(4) || 'N/A'}, {issue.longitude?.toFixed(4) || 'N/A'}
                      </p>
                      {issue.source && (
                        <p className="text-xs text-slate-600 mt-0.5">Source: {issue.source}</p>
                      )}

                      {/* Comments toggle */}
                      <div className="mt-3">
                        <button
                          onClick={() => toggleComments(issue._id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg
                                     text-xs font-medium
                                     bg-white/5 text-slate-400 hover:text-white
                                     border border-white/10 hover:border-white/20 transition-all"
                        >
                          <MessageSquare size={11} />
                          Comments ({issue.comments?.length || 0})
                          {expandedComments[issue._id]
                            ? <ChevronUp size={11} />
                            : <ChevronDown size={11} />}
                        </button>

                        {expandedComments[issue._id] && (
                          <div className="mt-3 rounded-xl border border-white/10
                                          bg-white/[0.03] p-3 space-y-2">
                            {(issue.comments || []).map((comment, idx) => (
                              <div key={idx} className="rounded-lg bg-white/5 p-2.5">
                                <div className="flex justify-between items-center mb-1">
                                  <span className={`text-xs font-medium
                                    ${comment.isAdmin ? 'text-sky-400' : 'text-emerald-400'}`}>
                                    {comment.isAdmin ? 'Admin' : 'User'}
                                  </span>
                                  <span className="text-xs text-slate-600">
                                    {new Date(comment.timestamp).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-300">{comment.text}</p>
                              </div>
                            ))}
                            {/* Add comment */}
                            <div className="flex gap-2 pt-1">
                              <input
                                type="text"
                                placeholder="Add admin comment..."
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && submitAdminComment(issue._id)}
                                className="flex-1 px-2.5 py-1.5 rounded-lg text-xs text-white
                                           bg-white/5 border border-white/10
                                           placeholder-slate-600
                                           focus:outline-none focus:border-sky-500/50 transition-all"
                              />
                              <button
                                onClick={() => submitAdminComment(issue._id)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium
                                           bg-sky-500/20 text-sky-400
                                           hover:bg-sky-500/30 transition-all
                                           inline-flex items-center gap-1"
                              >
                                <Send size={10} /> Send
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right — status + action buttons */}
                    <div className="flex items-center gap-2 lg:flex-col lg:items-end shrink-0">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide
                        ${ issue.closed               ? 'bg-slate-500/15 text-slate-400'
                         : issue.status === 'pending'     ? 'bg-rose-500/15 text-rose-400'
                         : issue.status === 'in-progress' ? 'bg-amber-500/15 text-amber-400'
                         : 'bg-emerald-500/15 text-emerald-400' }`}
                      >
                        {issue.closed ? 'CLOSED' : issue.status.replace('-', ' ').toUpperCase()}
                      </span>

                      <div className="flex gap-1.5">
                        <button
                          onClick={() => window.open(`https://maps.google.com/?q=${issue.latitude},${issue.longitude}`, '_blank')}
                          className="p-1.5 rounded-lg bg-white/5 text-slate-400
                                     hover:text-sky-400 hover:bg-sky-500/10
                                     border border-white/10 transition-all"
                          title="View on map"
                        >
                          <MapPin size={13} />
                        </button>
                        <button
                          onClick={() => handleDetailClick(issue)}
                          className="p-1.5 rounded-lg bg-white/5 text-slate-400
                                     hover:text-violet-400 hover:bg-violet-500/10
                                     border border-white/10 transition-all"
                          title="View detail"
                        >
                          <Eye size={13} />
                        </button>
                        {issue.status === 'resolved' && !issue.closed ? (
                          <button
                            onClick={() => handleCloseIssue(issue)}
                            className="p-1.5 rounded-lg bg-white/5 text-slate-400
                                       hover:text-rose-400 hover:bg-rose-500/10
                                       border border-white/10 transition-all"
                            title="Close issue"
                          >
                            <Lock size={13} />
                          </button>
                        ) : issue.status !== 'resolved' ? (
                          <button
                            onClick={() => handleUpdateClick(issue)}
                            className="p-1.5 rounded-lg bg-white/5 text-slate-400
                                       hover:text-emerald-400 hover:bg-emerald-500/10
                                       border border-white/10 transition-all"
                            title="Update status"
                          >
                            <Pencil size={13} />
                          </button>
                        ) : null}
                      </div>
                    </div>

                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Status Update Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm
                          flex items-center justify-center z-50 p-4">
            <div className="glass rounded-2xl border border-white/10 shadow-2xl
                            shadow-black/50 w-full max-w-md p-6">
              <h3 className="text-base font-semibold text-white mb-4">Update Issue Status</h3>

              <div className="mb-4">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                                 text-xs font-mono bg-sky-500/10 text-sky-400
                                 border border-sky-500/20 mb-2">
                  <Ticket size={10} />
                  {selectedIssue?.ticketId || `TKT-${selectedIssue?._id.slice(-6)}`}
                </span>
                <p className="text-sm font-medium text-white">{selectedIssue?.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{selectedIssue?.category}</p>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  New Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white
                             bg-white/5 border border-white/10
                             focus:outline-none focus:border-sky-500/50 transition-all"
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Admin Note <span className="text-slate-600">(optional)</span>
                </label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Add a note about this status change..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white
                             bg-white/5 border border-white/10 resize-none
                             placeholder-slate-600
                             focus:outline-none focus:border-sky-500/50 transition-all"
                />
                <p className="text-xs text-slate-600 mt-1">
                  This note will be visible to mobile app users
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowModal(false); setAdminNote(''); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium
                             text-slate-400 border border-white/10
                             hover:text-white hover:border-white/20 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStatusUpdate}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold
                             bg-sky-500 hover:bg-sky-400 text-white
                             shadow-lg shadow-sky-500/25 transition-all"
                >
                  Update Status
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedIssue && (
          <IssueDetailModal
            issue={selectedIssue}
            isDarkMode={true}
            onClose={() => setShowDetailModal(false)}
            onAssignTask={handleAssignTask}
            onCloseIssue={handleCloseIssue}
          />
        )}

      </div>
    </div>
  );
}

function AnalyticsPage() {
  const { notifications, removeNotification, success } = useNotification();
  const [isExporting, setIsExporting] = useState(false);

  // LIVE DATA: Get real issues from Convex
  const { issues: liveIssues, isLoading } = useLiveIssues();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-sky-400 animate-spin" />
          <p className="text-slate-400 text-sm">Loading analytics...</p>
        </div>
      </div>
    );
  }

  // Calculate live department data — logic identical
  const allCategories = [...new Set(liveIssues.map(issue => issue.category).filter(Boolean))];
  const departmentData = allCategories.length > 0 ? allCategories.map(category => {
    const categoryIssues = liveIssues.filter(i => i.category === category);
    const totalIssues = categoryIssues.length;
    const resolved = categoryIssues.filter(i => i.status === 'resolved').length;
    const resolutionRate = totalIssues > 0 ? `${Math.round((resolved / totalIssues) * 100)}%` : '0%';
    let avgTime = 'N/A';
    if (resolved > 0) {
      const resolvedIssues = categoryIssues.filter(i => i.status === 'resolved');
      const avgDays = resolvedIssues.reduce((sum, issue) => {
        const daysSinceCreation = Math.floor((Date.now() - issue._creationTime) / (1000 * 60 * 60 * 24));
        return sum + Math.max(1, daysSinceCreation);
      }, 0) / resolved;
      avgTime = `${Math.round(avgDays)} days`;
    }
    return { department: category, totalIssues, resolved, resolutionRate, avgTime };
  }) : [
    { department: 'Road Maintenance', totalIssues: 0, resolved: 0, resolutionRate: '0%', avgTime: 'N/A' },
    { department: 'Electrical',       totalIssues: 0, resolved: 0, resolutionRate: '0%', avgTime: 'N/A' },
    { department: 'Water Supply',     totalIssues: 0, resolved: 0, resolutionRate: '0%', avgTime: 'N/A' },
    { department: 'Sanitation',       totalIssues: 0, resolved: 0, resolutionRate: '0%', avgTime: 'N/A' },
  ];

  const handleExportCSV = async () => {
    setIsExporting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    const csvContent = [
      ['Department', 'Total Issues', 'Resolved', 'Resolution Rate', 'Average Time'],
      ...departmentData.map(row => [
        row.department, row.totalIssues.toString(),
        row.resolved.toString(), row.resolutionRate, row.avgTime
      ])
    ].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'department-performance.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('Export Complete', 'Department performance data has been downloaded');
    setIsExporting(false);
  };

  const topStats = [
    { label: 'Total Issues',   value: liveIssues.length,                                        color: 'text-sky-400',     delay: 'animate-fade-up-d1' },
    { label: 'Mobile Issues',  value: liveIssues.filter(i => i.source === 'mobile_app').length,  color: 'text-violet-400',  delay: 'animate-fade-up-d2' },
    { label: 'Resolved',       value: liveIssues.filter(i => i.status === 'resolved').length,    color: 'text-emerald-400', delay: 'animate-fade-up-d3' },
    { label: 'Pending',        value: liveIssues.filter(i => i.status === 'pending').length,     color: 'text-rose-400',    delay: 'animate-fade-up-d4' },
  ];

  return (
    <div className="min-h-screen pb-28">
      <NotificationContainer notifications={notifications} removeNotification={removeNotification} />
      <FloatingDock currentPath="/analytics" />

      <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-10 lg:pt-14">

        {/* Header */}
        <div className="mb-8 opacity-0 animate-fade-up">
          <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">Analytics</h1>
          <p className="text-slate-500 text-sm mt-1">Insights and reports on civic issues</p>
        </div>

        {/* Top stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {topStats.map(({ label, value, color, delay }) => (
            <div key={label}
              className={`glass rounded-2xl p-5 border border-white/10
                          shadow-2xl shadow-black/30 opacity-0 ${delay}`}
            >
              <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-2">{label}</p>
              <p className={`text-4xl lg:text-5xl font-extrabold ${color} leading-none mb-2`}>{value}</p>
            </div>
          ))}
        </div>
        
        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 opacity-0 animate-fade-up-d2">

          {/* Issues by Category */}
          <div className="glass rounded-2xl border border-white/10 p-6 shadow-2xl shadow-black/30">
            <h3 className="text-sm font-semibold text-white mb-5">Issues by Category</h3>
            <div className="space-y-3">
              {[
                { label: 'Road Maintenance', pct: 45, color: 'bg-sky-500'     },
                { label: 'Electrical',       pct: 32, color: 'bg-amber-500'   },
                { label: 'Water Supply',     pct: 28, color: 'bg-emerald-500' },
                { label: 'Sanitation',       pct: 25, color: 'bg-rose-500'    },
              ].map(({ label, pct, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-32 shrink-0">{label}</span>
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-white w-6 text-right">{pct}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Status Overview */}
          <div className="glass rounded-2xl border border-white/10 p-6 shadow-2xl shadow-black/30">
            <h3 className="text-sm font-semibold text-white mb-5">Status Overview</h3>
            <div className="space-y-3">
              {[
                { label: 'Pending',     value: '23 (15%)', color: 'bg-rose-500'    },
                { label: 'In Progress', value: '45 (29%)', color: 'bg-amber-500'   },
                { label: 'Resolved',    value: '88 (56%)', color: 'bg-emerald-500' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${color}`} />
                    <span className="text-xs text-slate-400">{label}</span>
                  </div>
                  <span className="text-xs font-semibold text-white">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-500">Overall Progress</span>
                <span className="text-xs font-semibold text-white">85%</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-sky-500
                                rounded-full" style={{ width: '85%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Department Performance Table */}
        <div className="glass rounded-2xl border border-white/10 shadow-2xl shadow-black/30
                        opacity-0 animate-fade-up-d3">
          <div className="px-6 py-4 border-b border-white/10
                          flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Department Performance</h3>
            <LoadingButton
              onClick={handleExportCSV}
              isLoading={isExporting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                         text-xs font-medium bg-sky-500/15 text-sky-400
                         hover:bg-sky-500/25 transition-all border border-sky-500/20"
            >
              <Download size={12} />
              Export CSV
            </LoadingButton>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['Department', 'Issues', 'Resolved', 'Rate', 'Avg Time'].map(h => (
                    <th key={h}
                      className="text-left py-3 px-6 text-xs font-medium
                                 text-slate-500 uppercase tracking-widest"
                    >{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {departmentData.map((dept) => (
                  <tr key={dept.department}
                    className="hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="py-3.5 px-6 text-sm text-slate-300">{dept.department}</td>
                    <td className="py-3.5 px-6 text-sm font-semibold text-white">{dept.totalIssues}</td>
                    <td className="py-3.5 px-6 text-sm font-semibold text-emerald-400">{dept.resolved}</td>
                    <td className="py-3.5 px-6 text-sm font-semibold text-sky-400">{dept.resolutionRate}</td>
                    <td className="py-3.5 px-6 text-sm text-slate-400">{dept.avgTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

function App() {
  return (
    <ConvexProvider client={convex}>
      <ThemeProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/issues" element={<IssuesPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </ConvexProvider>
  );
}

export default App;