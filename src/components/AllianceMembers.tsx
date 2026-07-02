import React from 'react';
import { User, Bid } from '../types';
import { ShieldAlert, Check, Phone, Mail, Award, MapPin, Search, Lock, UserCheck, MessageSquarePlus, Star } from 'lucide-react';

interface AllianceMembersProps {
  members: User[];
  bids: Bid[];
  currentUser: any;
  onSendContactRequest: (targetUserId: string) => void;
  onRateUser?: (targetUserId: string, newRating: number) => void;
}

export default function AllianceMembers({
  members,
  bids,
  currentUser,
  onSendContactRequest,
  onRateUser
}: AllianceMembersProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('All');

  // Helper function to check if contacts are revealed between currentUser and a member
  const areContactsRevealed = (member: User) => {
    if (member.id === currentUser?.id) return true;

    // Check if they have mutual connection share
    const currentUserAgreed = currentUser?.agreedContacts?.includes(member.id);
    const memberAgreed = member.agreedContacts?.includes(currentUser?.id);
    if (currentUserAgreed || memberAgreed) return true;

    // Check if there is an accepted bid between them
    const hasAcceptedBid = bids.some(b => 
      b.status === 'Accepted' && (
        (b.bidderId === currentUser?.id && bids.some(x => x.id === b.id && b.bidderId === currentUser?.id)) || // we bid on their ad
        (b.bidderId === member.id) // they bid on our ad (and will be matched in App state)
      )
    );
    if (hasAcceptedBid) return true;

    return false;
  };

  const filteredMembers = members.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (m.location && m.location.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesRole = roleFilter === 'All' ? true : m.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">SADC Alliance Directory</h2>
          <p className="text-xs text-slate-500 mt-1">
            Registered Farmers, Transport Hauliers, and Grain Dealers across the SADC block.
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {['All', 'Farmer', 'Transporter', 'Dealer'].map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                roleFilter === r
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {r === 'All' ? 'All Roles' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
        <input
          id="member-search-bar"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search members by name or geographic corridor..."
          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Member Cards Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {filteredMembers.length === 0 ? (
          <div className="col-span-full text-center py-10 text-slate-400">
            No matching members found in the current corridor.
          </div>
        ) : (
          filteredMembers.map(m => {
            const revealed = areContactsRevealed(m);
            const isSelf = m.id === currentUser?.id;

            return (
              <div 
                key={m.id} 
                id={`member-card-${m.id}`}
                className="p-5 border border-slate-200 rounded-xl bg-slate-50 shadow-sm flex flex-col justify-between hover:shadow-md transition-all gap-4"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar wrapper */}
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0 border border-slate-150 text-2xl overflow-hidden">
                    {m.avatarImage ? (
                      <img src={m.avatarImage} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      m.avatar || '👤'
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800 truncate">{m.name}</h3>
                      {isSelf && (
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                          You
                        </span>
                      )}
                    </div>
                    
                    <span className={`inline-block text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full mt-1 ${
                      m.role === 'Farmer' ? 'bg-emerald-100 text-emerald-800' :
                      m.role === 'Transporter' ? 'bg-blue-100 text-blue-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {m.role}
                    </span>

                    <div className="flex items-center gap-1 mt-2 mb-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star}
                          size={12} 
                          className={star <= (m.rating || 0) ? "text-amber-400 fill-amber-400" : "text-slate-300"} 
                        />
                      ))}
                      <span className="text-[10px] text-slate-400 ml-1">({m.ratingsCount || 0})</span>
                    </div>

                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                      <MapPin size={12} className="text-slate-400 shrink-0" />
                      {m.location || 'SADC Corridor'}
                    </p>
                  </div>
                </div>

                {/* Sub Role details with secure hiding */}
                <div className="border-t border-slate-150 pt-3 flex flex-col gap-2 text-xs">
                  {m.role === 'Farmer' && (
                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-slate-400 font-medium">Specials:</span>
                      <span className="col-span-2 font-semibold text-slate-700 truncate">
                        {m.cropSpecializations || 'General Agriculture'}
                      </span>
                    </div>
                  )}
                  {m.role === 'Dealer' && (
                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-slate-400 font-medium font-semibold">Buying:</span>
                      <span className="col-span-2 font-semibold text-slate-700 truncate">
                        {m.cropLookingFor || 'Any Grain Produce'}
                      </span>
                    </div>
                  )}

                  {/* SENSITIVE DETAILS CONTAINER */}
                  <div className="bg-white border border-slate-200 rounded-lg p-3 mt-1 flex flex-col gap-1.5">
                    {revealed ? (
                      <>
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail size={12} className="text-emerald-600" />
                          <span className="font-medium select-all truncate">{m.email || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <Phone size={12} className="text-emerald-600" />
                          <span className="font-medium select-all">{m.phone || 'N/A'}</span>
                        </div>
                        {m.farmAddress && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Lock size={12} className="text-emerald-600 shrink-0" />
                            <span className="font-medium truncate">{m.farmAddress}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col gap-1.5 opacity-85">
                        <div className="flex items-center gap-2 text-slate-400">
                          <Mail size={12} />
                          <span className="font-mono tracking-wider">••••••••@sadc-agri.org</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400">
                          <Phone size={12} />
                          <span className="font-mono tracking-wider">+••••••••••••</span>
                        </div>
                        <div className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200/50 p-1.5 rounded-md flex items-center gap-1">
                          <Lock size={10} className="shrink-0" /> Contacts shielded for privacy
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Secure Contact Linking actions */}
                {!isSelf && (
                  <div className="pt-2 border-t border-slate-150/50 flex justify-between items-center">
                    {revealed ? (
                      <div className="flex items-center gap-3 w-full justify-between">
                        <div className="flex gap-1 items-center bg-white border border-slate-200 px-2 py-1 rounded-lg">
                          <span className="text-[10px] text-slate-500 font-bold mr-1">Rate:</span>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => onRateUser?.(m.id, star)}
                              className="hover:scale-110 transition-transform"
                            >
                              <Star size={12} className="text-slate-300 hover:text-amber-400 hover:fill-amber-400 transition-colors" />
                            </button>
                          ))}
                        </div>
                        <div className="text-emerald-600 bg-emerald-50 font-bold text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1 border border-emerald-250">
                          <UserCheck size={12} /> Live Link Active
                        </div>
                      </div>
                    ) : (
                      <div className="w-full flex justify-end">
                        <button
                          id={`request-contact-${m.id}`}
                          onClick={() => onSendContactRequest(m.id)}
                          className="px-3.5 py-1.5 border border-slate-350 hover:border-emerald-500 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-sm"
                        >
                          <MessageSquarePlus size={13} /> Request Contact Link
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
