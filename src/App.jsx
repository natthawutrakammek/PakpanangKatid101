import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, deleteDoc, updateDoc, increment } from 'firebase/firestore';
import { 
  Plus, Minus, Trash2, Share2, Users, 
  Activity, Check, Edit2, ListOrdered, UserPlus, 
  X, Play, CheckCircle2, Circle, Trophy, Wallet 
} from 'lucide-react';

// ==========================================
// ⚠️ 1. นำรหัส Firebase Config ของคุณมาใส่ตรงนี้
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyBOBE61_ouVvTlGeXsVR9mRrNP06STQgjg",
  authDomain: "my-badminton-app-1fd9d.firebaseapp.com",
  projectId: "my-badminton-app-1fd9d",
  storageBucket: "my-badminton-app-1fd9d.firebasestorage.app",
  messagingSenderId: "1064755512908",
  appId: "1:1064755512908:web:3ca6ee70006c3fda68d6e9",
  measurementId: "G-73B72PN5L8"
};

// --- 2. ตั้งชื่อ ID สนาม ---
const COURT_ID = 'badminton-pn-court-v1';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState([]);
  const [games, setGames] = useState([]);
  const [activeTab, setActiveTab] = useState('summary');
  const [isRecordingGame, setIsRecordingGame] = useState(false);
  const [selectedPlayersForGame, setSelectedPlayersForGame] = useState([]);
  const [isCopied, setIsCopied] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');

  // 1. เข้าสู่ระบบแบบไม่ระบุตัวตน
  useEffect(() => {
    signInAnonymously(auth).catch(err => console.error("Auth Error:", err));
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setLoading(false);
    });
  }, []);

  // 2. ดึงข้อมูลออนไลน์ Real-time
  useEffect(() => {
    if (!user) return;

    const unsubP = onSnapshot(collection(db, 'artifacts', COURT_ID, 'public', 'data', 'players'), (s) => {
      const data = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setPlayers(data.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)));
      setLoading(false);
    });

    const unsubG = onSnapshot(collection(db, 'artifacts', COURT_ID, 'public', 'data', 'games'), (s) => {
      const data = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setGames(data.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)));
    });

    return () => { unsubP(); unsubG(); };
  }, [user]);

  // --- จัดการข้อมูล ---
  const handleAddPlayer = async (e) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    await setDoc(doc(collection(db, 'artifacts', COURT_ID, 'public', 'data', 'players')), {
      name: newPlayerName.trim(), count: 0, price: 25, isPaid: false, createdAt: Date.now()
    });
    setNewPlayerName('');
  };

  const handleUpdateCount = async (id, current, delta) => {
    await updateDoc(doc(db, 'artifacts', COURT_ID, 'public', 'data', 'players', id), {
      count: Math.max(0, current + delta), isPaid: false
    });
  };

  const handleSaveGame = async () => {
    if (selectedPlayersForGame.length === 0) return;
    const gRef = doc(collection(db, 'artifacts', COURT_ID, 'public', 'data', 'games'));
    await setDoc(gRef, {
      playerNames: selectedPlayersForGame.map(p => p.name),
      playerIds: selectedPlayersForGame.map(p => p.id),
      createdAt: Date.now()
    });
    for (const p of selectedPlayersForGame) {
      await updateDoc(doc(db, 'artifacts', COURT_ID, 'public', 'data', 'players', p.id), {
        count: increment(1), isPaid: false
      });
    }
    setIsRecordingGame(false); setSelectedPlayersForGame([]);
  };

  const totals = useMemo(() => {
    const amount = players.reduce((s, p) => s + (p.count * (p.price || 25)), 0);
    const paid = players.reduce((s, p) => p.isPaid ? s + (p.count * (p.price || 25)) : s, 0);
    return { amount, paid, pending: amount - paid, count: players.reduce((s, p) => s + p.count, 0) };
  }, [players]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 font-bold text-emerald-600 animate-pulse text-xl">กำลังโหลดระบบสนาม...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-44">
      {/* Header */}
      <header className="bg-emerald-600 text-white p-5 shadow-xl sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2"><Trophy /><h1 className="text-xl font-bold">BADMINTON PN</h1></div>
          <button onClick={() => { navigator.clipboard.writeText(window.location.href); setIsCopied(true); setTimeout(()=>setIsCopied(false), 2000); }} className="bg-white/10 px-4 py-2 rounded-xl text-xs font-bold border border-white/20 active:scale-95 transition-all">
            {isCopied ? 'คัดลอกแล้ว!' : 'แชร์ลิงก์ให้เพื่อน'}
          </button>
        </div>
        <nav className="max-w-4xl mx-auto mt-6 flex bg-emerald-700/40 rounded-2xl p-1">
          <button onClick={() => setActiveTab('games')} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'games' ? 'bg-white text-emerald-700 shadow-lg' : 'text-emerald-50'}`}>ประวัติรายเกม</button>
          <button onClick={() => setActiveTab('summary')} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'summary' ? 'bg-white text-emerald-700 shadow-lg' : 'text-emerald-50'}`}>สรุปยอดเงิน</button>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {activeTab === 'games' ? (
          <div className="space-y-4">
            <button onClick={() => setIsRecordingGame(true)} className="w-full bg-emerald-600 text-white p-6 rounded-3xl font-bold text-xl shadow-xl hover:bg-emerald-700 transition-all">+ บันทึกเกมใหม่</button>
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] uppercase font-black border-b tracking-widest text-slate-400"><tr><th className="p-4 w-16 text-center">#</th><th className="p-4">สมาชิกที่ลงเล่น</th><th className="p-4 w-16"></th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {games.slice().reverse().map((g, i) => (
                    <tr key={g.id} className="hover:bg-slate-50">
                      <td className="p-4 text-center font-bold text-slate-400">#{games.length - i}</td>
                      <td className="p-4 flex flex-wrap gap-1.5">{g.playerNames.map((n, j) => <span key={j} className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-lg border border-emerald-100">{n}</span>)}</td>
                      <td className="p-4 text-center">
                        <button onClick={async () => { await deleteDoc(doc(db, 'artifacts', COURT_ID, 'public', 'data', 'games', g.id)); for(const id of g.playerIds) { await updateDoc(doc(db, 'artifacts', COURT_ID, 'public', 'data', 'players', id), { count: increment(-1) }); } }} className="text-slate-200 hover:text-red-500"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                  {games.length === 0 && <tr><td colSpan="3" className="p-12 text-center text-slate-300 italic">ยังไม่มีประวัติการตี</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <form onSubmit={handleAddPlayer} className="bg-white p-5 rounded-3xl shadow-xl border border-emerald-50 flex gap-4">
              <input value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} placeholder="พิมพ์ชื่อสมาชิกใหม่..." className="flex-1 bg-slate-50 px-5 py-3 rounded-2xl outline-none font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500" />
              <button type="submit" className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-emerald-200 active:scale-95 transition-all">เพิ่ม</button>
            </form>
            <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 divide-y divide-slate-100 overflow-hidden">
              {players.map(p => (
                <div key={p.id} className={`p-6 flex flex-col sm:flex-row gap-4 sm:items-center justify-between ${p.isPaid ? 'bg-emerald-50/20' : 'hover:bg-slate-50/50 transition-colors'}`}>
                  <div className="flex-1">
                    <p className={`text-lg font-black ${p.isPaid ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{p.name}</p>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">ราคา: <input type="number" value={p.price || 25} onChange={async (e) => await updateDoc(doc(db, 'artifacts', COURT_ID, 'public', 'data', 'players', p.id), { price: Number(e.target.value) })} className="w-10 border-b border-slate-200 bg-transparent text-center outline-none text-emerald-600" /> บ.</div>
                  </div>
                  <div className="flex items-center gap-6 justify-between bg-white/50 sm:bg-transparent p-3 sm:p-0 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <button onClick={async () => await updateDoc(doc(db, 'artifacts', COURT_ID, 'public', 'data', 'players', p.id), { count: Math.max(0, p.count - 1), isPaid: false })} className="w-11 h-11 rounded-2xl border-2 border-slate-200 flex items-center justify-center text-slate-400 active:scale-90">-</button>
                      <span className="text-3xl font-black w-8 text-center text-slate-800 tabular-nums">{p.count}</span>
                      <button onClick={async () => await updateDoc(doc(db, 'artifacts', COURT_ID, 'public', 'data', 'players', p.id), { count: p.count + 1, isPaid: false })} className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 border-2 border-emerald-100 flex items-center justify-center active:scale-90 shadow-sm">+</button>
                    </div>
                    <div className="text-right min-w-[80px]">
                      <p className={`text-2xl font-black ${p.isPaid ? 'text-emerald-700' : 'text-slate-800'}`}>{(p.count * (p.price || 25)).toLocaleString()} <span className="text-xs font-bold opacity-40">บ.</span></p>
                      <button onClick={async () => await updateDoc(doc(db, 'artifacts', COURT_ID, 'public', 'data', 'players', p.id), { isPaid: !p.isPaid })} className={`text-[10px] px-4 py-1.5 rounded-full font-black uppercase tracking-widest mt-1.5 transition-all ${p.isPaid ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}>{p.isPaid ? 'จ่ายแล้ว' : 'รอจ่าย'}</button>
                    </div>
                  </div>
                </div>
              ))}
              {players.length === 0 && <div className="p-20 text-center text-slate-300 italic">ไม่มีข้อมูลสมาชิก</div>}
            </div>
          </div>
        )}
      </main>

      {isRecordingGame && (
        <div className="fixed inset-0 bg-slate-900/70 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
            <div className="p-8 border-b flex justify-between items-center">
              <h2 className="font-bold text-2xl tracking-tight">ใครลงเล่นบ้าง? ({selectedPlayersForGame.length})</h2>
              <button onClick={() => setIsRecordingGame(false)} className="p-2 bg-slate-100 rounded-full"><X size={20}/></button>
            </div>
            <div className="p-6 overflow-y-auto grid grid-cols-2 gap-4">
              {players.map(p => {
                const sel = selectedPlayersForGame.some(x => x.id === p.id);
                return <button key={p.id} onClick={() => setSelectedPlayersForGame(prev => sel ? prev.filter(x => x.id !== p.id) : [...prev, p])} className={`p-5 rounded-3xl border-2 text-left font-bold transition-all ${sel ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-xl' : 'border-slate-100 text-slate-400'}`}>{p.name}</button>
              })}
            </div>
            <div className="p-8 border-t bg-white"><button onClick={handleSaveGame} disabled={!selectedPlayersForGame.length} className="w-full bg-emerald-600 text-white py-5 rounded-[24px] font-bold text-xl shadow-xl disabled:bg-slate-200">ยืนยันบันทึกเกม</button></div>
          </div>
        </div>
      )}

      <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t p-6 shadow-[0_-10px_30px_rgba(0,0,0,0.1)] z-40">
        <div className="h-1.5 w-full bg-slate-100 mb-4 rounded-full overflow-hidden flex"><div className="h-full bg-emerald-500 transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${stats.total > 0 ? (stats.paid / stats.total) * 100 : 0}%` }}></div></div>
        <div className="max-w-4xl mx-auto flex justify-between items-end">
          <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ยอดรวมวันนี้ ({stats.count} ลูก)</p><p className="text-2xl font-black text-slate-800">{stats.total.toLocaleString()} บ.</p></div>
          <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl text-right shadow-lg ring-4 ring-slate-100">
            <span className="text-[9px] text-slate-400 uppercase font-black block leading-none mb-1">ยอดค้างโอนรวม</span>
            <span className="text-2xl font-black">{stats.pending.toLocaleString()}</span> บ.
          </div>
        </div>
      </footer>
    </div>
  );
}