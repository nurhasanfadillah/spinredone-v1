
import React, { useEffect } from 'react';
import { useAppStore } from '../store';
import { ArrowLeft, CheckCircle, Edit3, Trash2, LogIn, FileText, ShoppingBag, Wallet, Settings } from 'lucide-react';
import { formatDate } from '../utils';

export const ActivityLogView: React.FC = () => {
  const { activityLogs, fetchActivityLogs, navigate, isAuthenticated } = useAppStore();

  useEffect(() => {
    if (isAuthenticated) {
        fetchActivityLogs();
    }
  }, [isAuthenticated]);

  const getIcon = (type: string, entity: string) => {
    if (type === 'AUTH') return <LogIn size={16} className="text-purple-400" />;
    if (type === 'DELETE') return <Trash2 size={16} className="text-red-400" />;
    if (entity === 'SPK') return <FileText size={16} className={type === 'CREATE' ? 'text-emerald-400' : 'text-blue-400'} />;
    if (entity === 'PRODUCT' || entity === 'CATEGORY') return <ShoppingBag size={16} className={type === 'CREATE' ? 'text-emerald-400' : 'text-blue-400'} />;
    if (entity === 'FINANCE') return <Wallet size={16} className={type === 'CREATE' ? 'text-emerald-400' : 'text-blue-400'} />;
    
    return type === 'CREATE' ? <CheckCircle size={16} className="text-emerald-400" /> : <Edit3 size={16} className="text-blue-400" />;
  };

  const getBgColor = (type: string) => {
    if (type === 'AUTH') return 'bg-purple-500/10 border-purple-500/20';
    if (type === 'DELETE') return 'bg-red-500/10 border-red-500/20';
    if (type === 'CREATE') return 'bg-emerald-500/10 border-emerald-500/20';
    return 'bg-blue-500/10 border-blue-500/20';
  };

  const groupLogsByDate = () => {
    const groups: Record<string, typeof activityLogs> = {};
    activityLogs.forEach(log => {
        const date = new Date(log.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        if (!groups[date]) groups[date] = [];
        groups[date].push(log);
    });
    return groups;
  };

  const groupedLogs = groupLogsByDate();

  return (
    <div className="pb-24 pt-safe animate-slide-in-right">
       {/* Header */}
       <div className="flex items-center gap-2 py-3 px-1 sticky top-0 bg-dark-bg/90 backdrop-blur-md z-20">
            <button onClick={() => navigate('DASHBOARD')} className="p-2 -ml-2 text-slate-300 hover:text-white rounded-full hover:bg-white/5">
                <ArrowLeft size={24} />
            </button>
            <h1 className="text-xl font-bold text-white">Log Aktivitas</h1>
       </div>

       <div className="px-1 mt-2 space-y-6">
           {!isAuthenticated ? (
               <div className="text-center py-20 opacity-50">
                   <Settings size={48} className="mx-auto mb-4 text-slate-600" />
                   <p>Silakan login untuk melihat aktivitas sistem.</p>
               </div>
           ) : activityLogs.length === 0 ? (
               <div className="text-center py-20 opacity-50">
                   <FileText size={48} className="mx-auto mb-4 text-slate-600" />
                   <p>Belum ada aktivitas tercatat.</p>
               </div>
           ) : (
               Object.keys(groupedLogs).map(date => (
                   <div key={date}>
                       <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 sticky top-14 bg-dark-bg py-2 z-10">{date}</h3>
                       <div className="space-y-0 relative border-l border-white/10 ml-3 pl-6 pb-2">
                           {groupedLogs[date].map((log, idx) => (
                               <div key={log.id} className="mb-6 relative last:mb-0">
                                   {/* Timeline Dot */}
                                   <div className={`absolute -left-[31px] top-1 h-2.5 w-2.5 rounded-full border-2 border-dark-bg ${
                                       log.action_type === 'DELETE' ? 'bg-red-500' : 
                                       log.action_type === 'CREATE' ? 'bg-emerald-500' : 
                                       log.action_type === 'AUTH' ? 'bg-purple-500' : 'bg-blue-500'
                                   }`}></div>

                                   {/* Card */}
                                   <div className={`rounded-xl p-3 border ${getBgColor(log.action_type)}`}>
                                       <div className="flex justify-between items-start mb-1">
                                           <div className="flex items-center gap-2">
                                               {getIcon(log.action_type, log.entity)}
                                               <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                   log.action_type === 'DELETE' ? 'bg-red-500/20 text-red-400' : 
                                                   log.action_type === 'CREATE' ? 'bg-emerald-500/20 text-emerald-400' : 
                                                   log.action_type === 'AUTH' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                                               }`}>
                                                   {log.action_type} {log.entity}
                                               </span>
                                           </div>
                                           <span className="text-[10px] text-slate-400">
                                               {new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                           </span>
                                       </div>
                                       <p className="text-sm text-white font-medium leading-relaxed">{log.description}</p>
                                       <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                                           Oleh: <span className="text-slate-300 font-bold">{log.username || 'System'}</span>
                                       </p>
                                   </div>
                               </div>
                           ))}
                       </div>
                   </div>
               ))
           )}
       </div>
    </div>
  );
};
