import React, { useEffect, useState } from 'react';
import { User, Advert } from './types';
import { initDB } from './db';
import { Truck, Store, Wheat, Plus } from 'lucide-react';

export default function App() {
  const [db, setDb] = useState<any>(null);
  const [adverts, setAdverts] = useState<Advert[]>([]);
  const [currentUser] = useState<User>({
    id: "user-1",
    name: "Demo User",
    role: "Farmer"
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initDB().then(database => {
      setDb(database);
      database.adverts.find().$.subscribe((data: any) => {
        setAdverts(data.map((d: any) => d.toJSON()));
      });
      setLoading(false);
    }).catch((err: any) => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading SADC Hub...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-emerald-600 text-white p-4 shadow-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Truck size={24} /> AgriPulse Logistics
          </h1>
          <div className="text-sm font-medium">SADC Alliance</div>
        </div>
      </header>
      
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 flex flex-col gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Feed Hub</h2>
          
          <div className="mb-6 flex gap-2">
            <button
               onClick={() => {
                 db?.adverts.insert({
                   id: crypto.randomUUID(),
                   authorId: currentUser.id,
                   authorName: currentUser.name,
                   authorRole: currentUser.role,
                   title: "New Produce Request",
                   description: "Looking to transport 20 Tonnes of Maize from Harare to Beitbridge.",
                   type: "TransportOffer",
                   status: "Open",
                   timestamp: Date.now()
                 }).catch(console.error);
               }}
               className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
            >
               <Plus size={16} /> New Advert
            </button>
          </div>

          <div className="grid gap-4">
            {adverts.length === 0 ? (
              <div className="text-center py-10 text-slate-500 rounded-xl bg-slate-50 border border-dashed border-slate-300">
                No active adverts.
              </div>
            ) : (
              adverts.sort((a,b) => b.timestamp - a.timestamp).map(ad => (
                <div key={ad.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50 shadow-sm flex flex-col sm:flex-row gap-4 sm:items-center">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center shrink-0">
                    {ad.type === "TransportOffer" ? <Truck size={20}/> : <Wheat size={20}/>}
                  </div>
                  <div className="flex-1">
                     <h3 className="font-bold text-slate-800 flex items-center gap-2">
                       {ad.title} 
                       <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full uppercase tracking-wider">{ad.status}</span>
                     </h3>
                     <p className="text-sm text-slate-500 mt-1">{ad.description}</p>
                     <div className="text-xs text-slate-400 mt-2 flex items-center gap-2">
                       <Store size={12}/> {ad.authorName} • {new Date(ad.timestamp).toLocaleString()}
                     </div>
                  </div>
                  <button onClick={() => {
                      const newStatus = ad.status === 'Open' ? 'Closed' : 'Open';
                      db.adverts.findOne(ad.id).exec().then((doc: any) => {
                          if(doc) {
                              doc.patch({ status: newStatus });
                          }
                      });
                  }} className="text-sm border border-slate-300 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg text-slate-700 font-medium">
                      Toggle Status
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
