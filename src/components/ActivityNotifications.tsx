import React from 'react';
import { AppNotification, Bid } from '../types';
import { Bell, Check, X, Phone, Mail, Award, Eye } from 'lucide-react';

interface ActivityNotificationsProps {
  notifications: AppNotification[];
  bids: Bid[];
  currentUser: any;
  onAcceptBid: (bidId: string) => void;
  onRejectBid: (bidId: string) => void;
  onClearNotifications: () => void;
  onMarkNotificationRead: (notifId: string) => void;
  onAcceptContactShare: (otherUserId: string, notifId: string) => void;
}

export default function ActivityNotifications({
  notifications,
  bids,
  currentUser,
  onAcceptBid,
  onRejectBid,
  onClearNotifications,
  onMarkNotificationRead,
  onAcceptContactShare
}: ActivityNotificationsProps) {
  
  // Filter notifications belonging to the current logged-in user
  const userNotifications = notifications
    .filter(n => n.userId === currentUser.id)
    .sort((a, b) => b.timestamp - a.timestamp);

  const pendingBidsForMeObj = bids.filter(b => b.status === 'Pending' && b.bidderId !== currentUser.id);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Bell className="text-amber-500" size={18} /> Activity & Alerts Center
          {userNotifications.filter(n => n.status === 'unread').length > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {userNotifications.filter(n => n.status === 'unread').length} New
            </span>
          )}
        </h3>
        {userNotifications.length > 0 && (
          <button
            id="clear-all-notifs"
            onClick={onClearNotifications}
            className="text-xs text-slate-500 hover:text-slate-800 font-bold hover:underline transition-all"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto">
        {userNotifications.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Bell size={32} className="mx-auto text-slate-300 mb-2 stroke-[1.5]" />
            <p className="text-sm">No activity notifications yet.</p>
            <p className="text-[11px] text-slate-400 mt-1">Classified bids or coordinate logs appear here.</p>
          </div>
        ) : (
          userNotifications.map(n => {
            const isUnread = n.status === 'unread';
            // Find related bid
            const relatedBid = bids.find(b => b.id === n.relatedId);

            return (
              <div 
                key={n.id} 
                className={`p-4 transition-colors flex gap-3 items-start ${isUnread ? 'bg-amber-50/40 border-l-4 border-l-amber-500' : 'bg-white'}`}
              >
                <div className="mt-0.5">
                  {n.type === 'bid_received' && (
                    <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0">
                      💰
                    </span>
                  )}
                  {n.type === 'bid_accepted' && (
                    <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <Award size={14} />
                    </span>
                  )}
                  {n.type === 'chat_requested' && (
                    <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center shrink-0">
                      🤝
                    </span>
                  )}
                  {n.type === 'chat_agreed' && (
                    <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      📞
                    </span>
                  )}
                  {n.type === 'ad_posted' && (
                    <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                      📢
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm ${isUnread ? 'font-bold text-slate-800' : 'font-medium text-slate-700'}`}>
                      {n.title}
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {n.message}
                  </p>

                  {/* Context Actions for received bids */}
                  {n.type === 'bid_received' && relatedBid && relatedBid.status === 'Pending' && (
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        id={`accept-bid-${relatedBid.id}`}
                        onClick={() => {
                          onAcceptBid(relatedBid.id);
                          onMarkNotificationRead(n.id);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm transition-all"
                      >
                        <Check size={12} /> Accept Bid
                      </button>
                      <button
                        id={`reject-bid-${relatedBid.id}`}
                        onClick={() => {
                          onRejectBid(relatedBid.id);
                          onMarkNotificationRead(n.id);
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all"
                      >
                        <X size={12} /> Decline
                      </button>
                    </div>
                  )}

                  {/* Context Actions for Contact sharing requests */}
                  {n.type === 'chat_requested' && n.status === 'unread' && (
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        id={`accept-share-${n.id}`}
                        onClick={() => {
                          if (n.relatedId) {
                            onAcceptContactShare(n.relatedId, n.id);
                          }
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm transition-all"
                      >
                        <Check size={12} /> Share Contacts
                      </button>
                      <button
                        id={`ignore-share-${n.id}`}
                        onClick={() => onMarkNotificationRead(n.id)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all"
                      >
                        <X size={12} /> Dismiss
                      </button>
                    </div>
                  )}

                  {/* Bid acceptance notice or Contact reveals */}
                  {n.type === 'bid_accepted' && relatedBid && (
                    <div className="mt-2 text-[11px] bg-slate-50 border border-slate-200 text-slate-600 p-2 rounded-lg">
                      Accepted Price Offer: <span className="font-bold text-slate-800">${relatedBid.amount.toLocaleString()}</span>
                    </div>
                  )}

                  {isUnread && (
                    <button
                      id={`mark-read-${n.id}`}
                      onClick={() => onMarkNotificationRead(n.id)}
                      className="mt-2 text-[10px] text-emerald-600 font-bold hover:underline block"
                    >
                      Mark as Read
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
