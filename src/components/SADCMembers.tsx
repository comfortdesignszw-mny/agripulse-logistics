import React, { useState, useEffect } from "react";
import { db, useLiveQuery, dataAccess } from "../db";
import { User } from "../types";
import {
  Search,
  Shield,
  Phone,
  Mail,
  MapPin,
  BadgeCheck,
  UserCheck,
  AlertTriangle,
  RefreshCw,
  Layers,
  Sparkles,
} from "lucide-react";
import StarRating from "./StarRating";

interface SADCMembersProps {
  currentUser: User;
}

export default function SADCMembers({ currentUser }: SADCMembersProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<
    "all" | "Farmer" | "Transporter" | "Dealer"
  >("all");
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [ratingFeedback, setRatingFeedback] = useState<string | null>(null);

  // Load all members from DB
  const members = useLiveQuery(() => db.users.toArray()) || [];

  // Reset rating feedback when selecting a different member
  useEffect(() => {
    setRatingFeedback(null);
  }, [selectedMember]);

  const handleRateMember = async (stars: number) => {
    if (!selectedMember || !selectedMember.id) return;
    const currentVal = selectedMember.ratingValue ?? 5.0;
    const currentCount = selectedMember.ratingCount ?? 2;
    const newVal = (currentVal * currentCount + stars) / (currentCount + 1);
    const newCount = currentCount + 1;
    const roundedVal = Number(newVal.toFixed(1));

    await dataAccess.profiles.update(selectedMember.id, {
      ratingValue: roundedVal,
      ratingCount: newCount,
    });

    // Update selectedMember instance so rating updates immediately in UI
    setSelectedMember((prev) =>
      prev ? { ...prev, ratingValue: roundedVal, ratingCount: newCount } : null,
    );
    setRatingFeedback(
      `Rated ${stars} Star${stars > 1 ? "s" : ""}! Trust score updated.`,
    );
    setTimeout(() => setRatingFeedback(null), 4000);
  };

  // Filter members based on lookup
  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.email && m.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.farmAddress &&
        m.farmAddress.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.location &&
        m.location.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = roleFilter === "all" || m.userRole === roleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 text-left font-sans">
      {/* Directory Title Banner */}
      <div className="bg-gradient-to-r from-indigo-750 to-slate-900 text-white rounded-3xl p-6 shadow-sm border border-slate-700/30 relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 bg-indigo-505/20 px-3 py-1 rounded-full text-xs font-bold border border-indigo-500/20 text-indigo-300">
            <UserCheck size={13} />
            <span>SADC Secure Interconnectivity</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            SADC Verified Directory
          </h1>
          <p className="text-xs text-indigo-100 max-w-md">
            Look up regional trade partners, examine driver KYC status, and
            request directly. Security protocol enforces read-only access on
            external accounts.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Search and members list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search
                className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Search members by name, city, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium outline-none text-slate-800"
              />
            </div>

            {/* Role Filter Filters */}
            <div className="flex gap-1 overflow-x-auto pb-1">
              {(["all", "Farmer", "Transporter", "Dealer"] as const).map(
                (role) => (
                  <button
                    key={role}
                    onClick={() => setRoleFilter(role)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider whitespace-nowrap transition-all border ${roleFilter === role ? "bg-indigo-600 text-white border-transparent" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}`}
                  >
                    {role === "all" ? "All Roles" : role + "s"}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Members Feed list */}
          <div className="space-y-3">
            {filteredMembers.map((member) => {
              const isSelf = member.id === currentUser.id;

              return (
                <div
                  key={member.id}
                  onClick={() => setSelectedMember(member)}
                  className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer text-left shadow-3xs flex justify-between items-center ${selectedMember?.id === member.id ? "border-indigo-600 ring-1 ring-indigo-600" : "border-slate-200 hover:border-slate-300"}`}
                >
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-lg overflow-hidden flex-shrink-0">
                      {member.profileImage ? (
                        <img
                          src={member.profileImage}
                          alt={member.name}
                          className="w-full h-full object-cover"
                        />
                      ) : member.userRole === "Farmer" ? (
                        "🌾"
                      ) : member.userRole === "Transporter" ? (
                        "🚚"
                      ) : (
                        "🏬"
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm">
                          {member.name}
                        </h4>
                        {isSelf && (
                          <span className="bg-slate-100 text-slate-700 text-[8px] px-1.5 font-bold uppercase rounded">
                            My Acc
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 font-semibold">
                        {member.userRole} •{" "}
                        {member.location ||
                          member.farmAddress ||
                          "Regional Base"}
                      </p>

                      {/* Trust rating visualization */}
                      <div className="mt-1">
                        <StarRating
                          rating={member.ratingValue ?? 5.0}
                          count={member.ratingCount ?? 2}
                          size={11}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span
                      className={`text-[8px] font-black px-2 py-0.5 rounded border uppercase ${member.verificationStatus === "Verified" ? "bg-indigo-50 text-indigo-700 border-indigo-100" : "bg-slate-10$ text-slate-500"}`}
                    >
                      {member.verificationStatus}
                    </span>
                    <span className="text-[9px] text-indigo-600 font-extrabold flex items-center gap-0.5">
                      Inspect Profile →
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredMembers.length === 0 && (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
                No verified agricultural SADC members matched your search
                criteria.
              </div>
            )}
          </div>
        </div>

        {/* Right column: Selected Member's Prominent Profile (Read Only Protection) */}
        <div className="space-y-4">
          {selectedMember ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs text-left relative overflow-hidden flex flex-col gap-4">
              {/* Security Level Indicator Banner */}
              <div className="bg-slate-900 text-slate-100 text-[9px] px-3 py-1 rounded-lg flex items-center gap-1 font-bold">
                <Shield size={11} className="text-indigo-400" />
                <span>Secured SADC Profile (Read-Only)</span>
              </div>

              {/* Profile Avatar and Details Prominently Rendered */}
              <div className="flex flex-col items-center text-center p-4 bg-slate-50 rounded-2xl border border-slate-150">
                <div className="w-20 h-20 rounded-full bg-white border-2 border-indigo-600 shadow-sm overflow-hidden flex items-center justify-center text-3xl mb-3">
                  {selectedMember.profileImage ? (
                    <img
                      src={selectedMember.profileImage}
                      alt={selectedMember.name}
                      className="w-full h-full object-cover"
                    />
                  ) : selectedMember.userRole === "Farmer" ? (
                    "🌾"
                  ) : selectedMember.userRole === "Transporter" ? (
                    "🚚"
                  ) : (
                    "🏬"
                  )}
                </div>

                <div className="space-y-1 w-full flex flex-col items-center">
                  <div className="flex items-center justify-center gap-1">
                    <h3 className="font-black text-slate-850 text-base leading-none">
                      {selectedMember.name}
                    </h3>
                    {selectedMember.verificationStatus === "Verified" && (
                      <BadgeCheck size={16} className="text-indigo-600" />
                    )}
                  </div>
                  <span className="inline-block bg-indigo-50 text-indigo-700 font-black text-[9px] uppercase px-2.5 py-0.5 rounded border border-indigo-100 tracking-wider">
                    {selectedMember.userRole}
                  </span>

                  {/* trust score indicator */}
                  <div className="mt-2 flex flex-col items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-3xs w-auto">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">
                      SADC Trust Score
                    </span>
                    <StarRating
                      rating={selectedMember.ratingValue ?? 5.0}
                      count={selectedMember.ratingCount ?? 2}
                      size={15}
                    />
                  </div>
                </div>
              </div>

              {/* Interactive trust rate utility if not self */}
              {selectedMember.id !== currentUser.id && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 p-4 rounded-2xl">
                  <h5 className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">
                    Rate this Partner's Trust Service
                  </h5>
                  <p className="text-[10px] text-slate-550 leading-normal mb-2.5">
                    Have you collaborated with {selectedMember.name}? Submit a
                    5-star validation score to secure network accountability.
                  </p>

                  {ratingFeedback ? (
                    <div className="bg-emerald-600 text-white font-extrabold text-[10px] p-2 rounded-xl text-center shadow-sm animate-fade-in">
                      ✓ {ratingFeedback}
                    </div>
                  ) : (
                    <div className="flex justify-center bg-white/85 p-2 rounded-xl border border-amber-200/50">
                      <StarRating
                        interactive
                        rating={0}
                        onRate={handleRateMember}
                        size={24}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Prominent Profile Specs */}
              <div className="space-y-2.5">
                <h4 className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 pb-1">
                  Business Credentials
                </h4>

                {selectedMember.userRole === "Farmer" && (
                  <>
                    <div className="text-xs">
                      <span className="text-slate-400 font-medium block">
                        Crops Produced:
                      </span>
                      <strong className="text-slate-800 font-bold">
                        {selectedMember.cropSpecializations ||
                          "Maize, Groundnuts"}
                      </strong>
                    </div>
                    <div className="text-xs">
                      <span className="text-slate-400 font-medium block">
                        Farm Address:
                      </span>
                      <strong className="text-slate-800 font-bold leading-tight">
                        {selectedMember.farmAddress || "SADC Agrarian Grid"}
                      </strong>
                    </div>
                  </>
                )}

                {selectedMember.userRole === "Transporter" && (
                  <>
                    <div className="text-xs">
                      <span className="text-slate-400 font-medium block">
                        Carrier Logistics Base:
                      </span>
                      <strong className="text-indigo-900 font-bold">
                        {selectedMember.location || "Beitbridge Base Hub"}
                      </strong>
                    </div>
                    <div className="text-xs">
                      <span className="text-slate-400 font-medium block">
                        Haulage Fleet Capacity:
                      </span>
                      <strong className="text-slate-800 font-bold">
                        10-22 Tonne Flatbed Sacks
                      </strong>
                    </div>
                  </>
                )}

                {selectedMember.userRole === "Dealer" && (
                  <>
                    <div className="text-xs">
                      <span className="text-slate-400 font-medium block">
                        Target Crops Procuring:
                      </span>
                      <strong className="text-amber-800 font-semibold">
                        {selectedMember.cropLookingFor || "Maize, Wheat"}
                      </strong>
                    </div>
                    <div className="text-xs">
                      <span className="text-slate-400 font-medium block">
                        Depot Trading Floor:
                      </span>
                      <strong className="text-slate-800 font-bold">
                        {selectedMember.location || "Mbare Commercial Markets"}
                      </strong>
                    </div>
                  </>
                )}

                {/* Secure Contact Interconnection logs */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <h4 className="text-[10px] uppercase font-bold text-slate-400">
                    Interconnect Contact Links
                  </h4>

                  <div className="space-y-1.5">
                    <a
                      href={`tel:${selectedMember.phoneNumber}`}
                      className="w-full bg-slate-50 border border-slate-200 hover:bg-slate-100 font-bold text-xs p-2.5 rounded-xl flex items-center justify-between text-slate-700"
                    >
                      <span className="flex items-center gap-1.5">
                        <Phone size={13} className="text-slate-400" />{" "}
                        {selectedMember.phoneNumber}
                      </span>
                      <span className="text-[10px] text-slate-400">DIAL</span>
                    </a>

                    {selectedMember.email && (
                      <a
                        href={`mailto:${selectedMember.email}`}
                        className="w-full bg-slate-50 border border-slate-200 hover:bg-slate-100 font-bold text-xs p-2.5 rounded-xl flex items-center justify-between text-slate-700"
                      >
                        <span className="flex items-center gap-1.5">
                          <Mail size={13} className="text-slate-400" />{" "}
                          {selectedMember.email}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          EMAIL
                        </span>
                      </a>
                    )}
                  </div>
                </div>

                {/* User security constraints notice */}
                <div className="mt-4 p-3 rounded-xl border border-rose-100 bg-rose-50/50 flex gap-2 text-[10px] text-rose-800 leading-normal">
                  <AlertTriangle
                    size={15}
                    className="text-rose-600 flex-shrink-0 mt-0.5"
                  />
                  <span>
                    <strong>Security Clearance Restrict:</strong> To prevent
                    fraud, third parties can inspect credentials only. Editing
                    is blocked without local signature keys matching account #
                    {selectedMember.id}.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-450 flex flex-col items-center justify-center min-h-[300px] space-y-2">
              <UserCheck size={28} className="text-slate-300" />
              <span>
                Tap on any member profile on the left registry list to view
                their verification parameters, fleet base bases, specialties,
                and contact details prominently.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
