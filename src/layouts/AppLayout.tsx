import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquareText,
  UploadCloud,
  Sparkles,
  GitPullRequest,
  FileText,
  Settings,
  Menu,
  X,
  Search,
  Bell,
  ChevronLeft,
  ChevronRight,
  Database,
  ChevronDown,
  Layers,
  Plus,
  AlertCircle,
} from 'lucide-react';
import { useDataset } from '../context/DatasetContext';
import { apiClient } from '../api/client';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/feedback', label: 'Feedback', icon: MessageSquareText },
  { to: '/import', label: 'Import', icon: UploadCloud },
  { to: '/insights', label: 'Insights', icon: Sparkles },
  { to: '/decisions', label: 'Decisions', icon: GitPullRequest },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showDatasetMenu, setShowDatasetMenu] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [alerts, setAlerts] = useState<Array<{ title: string; description: string; severity: string }>>([]);

  const { datasets, activeDataset, activeDatasetId, setActiveDatasetId, isDemo } = useDataset();
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch real notifications for the active dataset
  useEffect(() => {
    if (!activeDatasetId) {
      setAlerts([]);
      return;
    }
    apiClient
      .get<{ alerts: Array<{ title: string; description: string; severity: string }> }>('/notifications', {
        params: { datasetId: activeDatasetId },
      })
      .then((res) => {
        setAlerts(res.data.alerts || []);
      })
      .catch(() => {
        setAlerts([]);
      });
  }, [activeDatasetId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      navigate(`/feedback?search=${encodeURIComponent(globalSearch.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg lg:hidden"
            aria-label="Toggle Navigation Drawer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Brand Logo & Name */}
          <NavLink to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-600/20 group-hover:bg-indigo-700 transition-colors">
              <span className="font-bold text-lg tracking-tight">P</span>
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                ProductPulse
              </span>
              <span className="hidden md:inline-block ml-2 text-xs text-slate-400 font-medium">
                Feedback Intelligence
              </span>
            </div>
          </NavLink>

          {/* Active Dataset Dropdown Switcher */}
          <div className="relative ml-2 sm:ml-4">
            <button
              onClick={() => setShowDatasetMenu(!showDatasetMenu)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 transition-colors shadow-xs"
              title="Switch Active Dataset"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <div className="flex items-center gap-1.5 max-w-[140px] sm:max-w-[200px] truncate text-left">
                <span className="truncate">{activeDataset ? activeDataset.name : 'No Dataset'}</span>
                {isDemo && (
                  <span className="px-1.5 py-0.2 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-md uppercase tracking-wider shrink-0">
                    Demo
                  </span>
                )}
                {activeDataset && !isDemo && (
                  <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-700 text-[10px] font-semibold rounded-md shrink-0">
                    {activeDataset.row_count} rows
                  </span>
                )}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {showDatasetMenu && (
              <div className="absolute left-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 text-xs">
                <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-100 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                  <span>Uploaded Datasets</span>
                  <span>{datasets.length} Total</span>
                </div>

                <div className="max-h-56 overflow-y-auto divide-y divide-slate-50 my-1">
                  {datasets.length === 0 ? (
                    <div className="p-3 text-center text-slate-400">
                      No datasets available yet.
                    </div>
                  ) : (
                    datasets.map((d) => {
                      const isSelected = d.id === activeDatasetId;
                      const isDemoDataset = d.id === 'ds_demo_saas_flow' || d.name.includes('[Demo]');
                      return (
                        <button
                          key={d.id}
                          onClick={() => {
                            setActiveDatasetId(d.id);
                            setShowDatasetMenu(false);
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-indigo-50/80 text-indigo-900 font-semibold'
                              : 'text-slate-700 hover:bg-slate-100/70'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <p className="truncate font-medium">{d.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                              {d.filename} • {d.row_count} feedback records
                            </p>
                          </div>
                          {isDemoDataset ? (
                            <span className="text-[9px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded">
                              Demo
                            </span>
                          ) : (
                            isSelected && (
                              <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0"></span>
                            )
                          )}
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="pt-1.5 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setShowDatasetMenu(false);
                      navigate('/import');
                    }}
                    className="w-full py-1.5 px-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Upload New CSV Dataset</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-md mx-4 hidden sm:block">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search feedback in current dataset..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-100/80 border border-transparent rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </form>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Sample CSV Download shortcut */}
          <a
            href="/api/sample-csv"
            download="sample-feedback.csv"
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            title="Download Sample Feedback CSV"
          >
            <Database className="w-3.5 h-3.5 text-indigo-600" />
            <span>Sample CSV</span>
          </a>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4" />
              {alerts.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-3 text-sm">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="font-semibold text-slate-900 text-xs uppercase tracking-wider">
                    Dataset Alerts
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {alerts.length > 0 ? `${alerts.length} high priority` : 'All clear'}
                  </span>
                </div>
                <div className="divide-y divide-slate-100 mt-1 max-h-60 overflow-y-auto">
                  {alerts.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-500">
                      No critical issues reported in this dataset.
                    </div>
                  ) : (
                    alerts.map((alert, idx) => (
                      <div key={idx} className="py-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-slate-800">{alert.title}</p>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              alert.severity === 'Critical'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {alert.severity}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">{alert.description}</p>
                      </div>
                    ))
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowNotifications(false);
                    navigate('/decisions');
                  }}
                  className="w-full mt-2 py-1.5 text-center text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  Review Decision Queue
                </button>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-semibold text-xs tracking-tight">
              SP
            </div>
            <div className="hidden xl:block text-left">
              <p className="text-xs font-semibold text-slate-900 leading-tight">Product Lead</p>
              <p className="text-[11px] text-slate-400 leading-tight truncate max-w-[110px]">
                {activeDataset ? activeDataset.name : 'Workspace'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body Container with Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Mobile Navigation Drawer Backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar (Desktop & Mobile Drawer) */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 lg:static bg-white border-r border-slate-200/80 flex flex-col transition-all duration-200 ${
            mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
          } ${collapsed ? 'lg:w-18' : 'lg:w-60'}`}
        >
          {/* Mobile Header in Drawer */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 lg:hidden">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                P
              </div>
              <span>ProductPulse</span>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-50/80 text-indigo-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              );
            })}
          </div>

          {/* AI Engine Status Indicator */}
          <div className="p-3 border-t border-slate-100">
            {!collapsed ? (
              <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">AI Engine</span>
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Gemini 3.8 Flash NLP Clustering Active
                </p>
              </div>
            ) : (
              <div
                className="flex items-center justify-center p-2 text-emerald-600"
                title="AI Engine Connected"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              </div>
            )}

            {/* Desktop Collapse / Expand Button */}
            <div className="hidden lg:flex items-center justify-end mt-2 pt-2">
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
