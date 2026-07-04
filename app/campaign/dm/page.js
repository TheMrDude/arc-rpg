'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Chibi avatar: colored circle with number, hue spread across 47 IDs
const CHIBI_PALETTE = [
  '#22d3ee','#f43f5e','#f4c553','#a78bfa','#34d399',
  '#fb923c','#60a5fa','#f472b6','#4ade80','#facc15',
  '#38bdf8','#e879f9','#2dd4bf','#fbbf24','#818cf8',
  '#f87171','#86efac','#93c5fd','#c4b5fd','#fca5a5',
  '#22d3ee','#f43f5e','#f4c553','#a78bfa','#34d399',
  '#fb923c','#60a5fa','#f472b6','#4ade80','#facc15',
  '#38bdf8','#e879f9','#2dd4bf','#fbbf24','#818cf8',
  '#f87171','#86efac','#93c5fd','#c4b5fd','#fca5a5',
  '#22d3ee','#f43f5e','#f4c553','#a78bfa','#34d399',
  '#fb923c','#60a5fa',
];

function ChibiAvatar({ id, size = 48, className = '' }) {
  const color = CHIBI_PALETTE[(id - 1) % CHIBI_PALETTE.length] || '#22d3ee';
  return (
    <div
      className={`flex items-center justify-center rounded-full font-black text-sm select-none ${className}`}
      style={{ width: size, height: size, backgroundColor: color + '33', border: `2px solid ${color}`, color, flexShrink: 0 }}
    >
      {id}
    </div>
  );
}

const STATUS_CONFIG = {
  alive: { label: 'Alive', color: '#4ade80' },
  dead: { label: 'Dead', color: '#6b7280' },
  enemy: { label: 'Enemy', color: '#f43f5e' },
  ally: { label: 'Ally', color: '#22d3ee' },
  unknown: { label: 'Unknown', color: '#94a3b8' },
  neutral: { label: 'Neutral', color: '#f4c553' },
};

function toRoman(num) {
  if (!num || num < 1) return 'I';
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
  let result = '';
  for (let i = 0; i < vals.length; i++) {
    while (num >= vals[i]) { result += syms[i]; num -= vals[i]; }
  }
  return result;
}

const NPC_BLANK = {
  name: '', chibi_character_id: 1, archetype: '', personality: '',
  backstory: '', ai_voice_description: '', status: 'alive',
  relationship_to_party: '', current_location: '', notes: '',
};

export default function DMDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState(null);
  const [party, setParty] = useState([]);
  const [npcs, setNpcs] = useState([]);
  const [sessionLogs, setSessionLogs] = useState([]);
  const [copiedCode, setCopiedCode] = useState(false);
  const [expandedSession, setExpandedSession] = useState(null);

  // Modal state: one key at a time
  const [modal, setModal] = useState(null); // 'npc-detail' | 'add-npc' | 'edit-npc' | 'gen-intro' | 'session-recap' | 'npc-dialogue' | 'plot-hook' | 'settings'
  const [selectedNpc, setSelectedNpc] = useState(null);

  // AI state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [aiCopied, setAiCopied] = useState(false);

  // NPC form
  const [npcForm, setNpcForm] = useState({ ...NPC_BLANK });
  const [npcSaving, setNpcSaving] = useState(false);

  // Session recap form
  const [recapForm, setRecapForm] = useState({ title: '', dm_notes: '' });

  // NPC dialogue form
  const [dialogueForm, setDialogueForm] = useState({ npc_id: '', scenario: '' });

  useEffect(() => {
    document.title = 'Campaign HQ | HabitQuest';
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile?.active_campaign_id) { router.push('/campaign/setup'); return; }
      if (profile.campaign_role !== 'dm') { router.push('/campaign/player'); return; }

      const { data: campaignData } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', profile.active_campaign_id)
        .single();
      setCampaign(campaignData);

      // Party via API
      const { data: { session } } = await supabase.auth.getSession();
      const partyRes = await fetch(`/api/campaign/${profile.active_campaign_id}/party`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (partyRes.ok) {
        const pd = await partyRes.json();
        setParty(pd.party || []);
      }

      // NPCs
      const { data: npcData } = await supabase
        .from('npc_library')
        .select('*')
        .eq('campaign_id', profile.active_campaign_id)
        .order('created_at', { ascending: false });
      setNpcs(npcData || []);

      // Session logs
      const { data: logsData } = await supabase
        .from('session_logs')
        .select('*')
        .eq('campaign_id', profile.active_campaign_id)
        .order('session_number', { ascending: false });
      setSessionLogs(logsData || []);
    } catch (err) {
      console.error('Error loading DM data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function copyInviteCode() {
    if (!campaign) return;
    try {
      await navigator.clipboard.writeText(campaign.invite_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch { }
  }

  async function copyInviteLink() {
    if (!campaign) return;
    try {
      await navigator.clipboard.writeText(`https://habitquest.dev/campaign/join?code=${campaign.invite_code}`);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch { }
  }

  async function copyAiResult() {
    try {
      await navigator.clipboard.writeText(aiResult);
      setAiCopied(true);
      setTimeout(() => setAiCopied(false), 2000);
    } catch { }
  }

  function closeModal() {
    setModal(null);
    setAiResult('');
    setAiLoading(false);
    setAiCopied(false);
  }

  // ---- AI calls ----
  async function generateIntro() {
    setModal('gen-intro');
    setAiLoading(true);
    setAiResult('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/campaign/generate-intro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ campaign_id: campaign.id }),
      });
      const data = await res.json();
      setAiResult(res.ok ? data.narrative : `Error: ${data.error}`);
    } catch { setAiResult('Failed to generate. Please try again.'); }
    finally { setAiLoading(false); }
  }

  async function generatePlotHook() {
    setModal('plot-hook');
    setAiLoading(true);
    setAiResult('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/campaign/generate-plot-hook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ campaign_id: campaign.id }),
      });
      const data = await res.json();
      setAiResult(res.ok ? data.plot_hook : `Error: ${data.error}`);
    } catch { setAiResult('Failed to generate. Please try again.'); }
    finally { setAiLoading(false); }
  }

  async function generateRecap() {
    if (!recapForm.dm_notes.trim()) return;
    setAiLoading(true);
    setAiResult('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/campaign/session-recap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          campaign_id: campaign.id,
          title: recapForm.title,
          dm_notes: recapForm.dm_notes,
          attending_players: party.map(p => p.character_name),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAiResult(data.ai_narrative);
        // Refresh session logs and campaign
        loadData();
      } else {
        setAiResult(`Error: ${data.error}`);
      }
    } catch { setAiResult('Failed to generate. Please try again.'); }
    finally { setAiLoading(false); }
  }

  async function generateDialogue() {
    if (!dialogueForm.npc_id || !dialogueForm.scenario.trim()) return;
    setAiLoading(true);
    setAiResult('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/campaign/npc-dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ npc_id: dialogueForm.npc_id, scenario: dialogueForm.scenario }),
      });
      const data = await res.json();
      setAiResult(res.ok ? data.dialogue : `Error: ${data.error}`);
    } catch { setAiResult('Failed to generate. Please try again.'); }
    finally { setAiLoading(false); }
  }

  // ---- NPC CRUD ----
  async function saveNpc(e) {
    e.preventDefault();
    setNpcSaving(true);
    try {
      if (modal === 'edit-npc' && selectedNpc) {
        const { error } = await supabase
          .from('npc_library')
          .update({ ...npcForm })
          .eq('id', selectedNpc.id);
        if (!error) {
          setNpcs(prev => prev.map(n => n.id === selectedNpc.id ? { ...n, ...npcForm } : n));
        }
      } else {
        const { data: newNpc, error } = await supabase
          .from('npc_library')
          .insert({ ...npcForm, campaign_id: campaign.id })
          .select()
          .single();
        if (!error && newNpc) {
          setNpcs(prev => [newNpc, ...prev]);
        }
      }
      closeModal();
    } catch (err) {
      console.error('Error saving NPC:', err);
    } finally {
      setNpcSaving(false);
    }
  }

  function openAddNpc() {
    setNpcForm({ ...NPC_BLANK });
    setModal('add-npc');
  }

  function openEditNpc(npc) {
    setSelectedNpc(npc);
    setNpcForm({
      name: npc.name || '',
      chibi_character_id: npc.chibi_character_id || 1,
      archetype: npc.archetype || '',
      personality: npc.personality || '',
      backstory: npc.backstory || '',
      ai_voice_description: npc.ai_voice_description || '',
      status: npc.status || 'alive',
      relationship_to_party: npc.relationship_to_party || '',
      current_location: npc.current_location || '',
      notes: npc.notes || '',
    });
    setModal('edit-npc');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-[#22d3ee] text-xl font-bold animate-pulse">Loading Campaign HQ...</div>
      </div>
    );
  }

  const inviteUrl = `https://habitquest.dev/campaign/join?code=${campaign?.invite_code}`;

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">

      {/* TOP BAR */}
      <div className="bg-[#1e293b] border-b border-gray-700/50 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => router.push('/dashboard')} className="text-gray-500 hover:text-gray-300 text-sm">← Dashboard</button>
            <div className="h-4 w-px bg-gray-700" />
            <div>
              <span className="font-black text-white text-sm">{campaign?.name}</span>
              <span className="text-gray-500 text-xs ml-2">{campaign?.world_name}</span>
            </div>
            <div className="h-4 w-px bg-gray-700" />
            <span className="text-[#f4c553] text-xs font-black uppercase">Session {campaign?.current_session || 0}</span>
            <div className="h-4 w-px bg-gray-700" />
            <button
              onClick={() => router.push('/campaign/world')}
              className="text-gray-400 hover:text-[#f4c553] text-xs font-bold transition-colors"
            >
              🗺️ World Map
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-xs font-mono">{campaign?.invite_code}</span>
            <button
              onClick={copyInviteCode}
              className="px-2 py-1 bg-[#22d3ee]/10 hover:bg-[#22d3ee]/20 border border-[#22d3ee]/30 text-[#22d3ee] text-xs font-bold rounded transition-colors"
            >
              {copiedCode ? '✓ Copied' : 'Copy Code'}
            </button>
            <button
              onClick={copyInviteLink}
              className="px-2 py-1 bg-gray-700/40 hover:bg-gray-700 text-gray-400 text-xs font-bold rounded transition-colors"
            >
              Copy Link
            </button>
            <button
              onClick={() => setModal('settings')}
              className="px-2 py-1 text-gray-500 hover:text-gray-300 text-sm rounded transition-colors"
              title="Campaign settings"
            >
              ⚙
            </button>
          </div>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_280px] gap-4 lg:gap-6">

          {/* ===== LEFT: PARTY ROSTER ===== */}
          <div className="bg-[#1e293b] border border-gray-700/50 rounded-xl p-4 h-fit">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-[#22d3ee]">
                Party
              </h2>
              <span className="text-gray-500 text-xs">{party.length}/6</span>
            </div>

            {party.length === 0 ? (
              <p className="text-gray-600 text-xs text-center py-4">No party members yet.</p>
            ) : (
              <div className="space-y-3">
                {party.map(member => {
                  const arch = member.profile?.archetype || 'warrior';
                  const lv = member.profile?.level || 1;
                  const xpPct = ((member.profile?.xp || 0) % 100);
                  return (
                    <div key={member.user_id} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-600 flex-shrink-0">
                        <img
                          src={`/images/archetypes/${arch}.png`}
                          alt={arch}
                          className="w-full h-full object-cover"
                          onError={e => { e.currentTarget.style.background = '#1e293b'; }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-white text-sm font-bold truncate">{member.character_name}</span>
                          {member.active_this_week
                            ? <span className="text-green-400 text-xs flex-shrink-0" title="Active this week">✓</span>
                            : <span className="text-red-400/60 text-xs flex-shrink-0" title="No activity">✗</span>
                          }
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-500 text-xs capitalize">{arch}</span>
                          <span className="text-[#22d3ee] text-xs">Lv.{lv}</span>
                        </div>
                        <div className="mt-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-[#22d3ee]/60" style={{ width: `${xpPct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={copyInviteLink}
              className="mt-4 w-full py-2 border border-dashed border-gray-600 hover:border-[#22d3ee]/50 text-gray-500 hover:text-[#22d3ee] text-xs font-bold rounded-lg transition-colors"
            >
              + Invite Player
            </button>
          </div>

          {/* ===== CENTER ===== */}
          <div className="space-y-4">

            {/* Weekly Activity Feed */}
            <div className="bg-[#1e293b] border border-gray-700/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-black uppercase tracking-widest text-[#f4c553]">
                  Weekly Activity
                </h2>
                <span className="text-gray-600 text-xs">Last 7 days</span>
              </div>

              {party.length === 0 ? (
                <p className="text-gray-600 text-xs py-2">Invite your party to see their activity.</p>
              ) : (
                <div className="space-y-2">
                  {party.map(member => (
                    <div key={member.user_id} className="text-sm">
                      <span className="text-[#f43f5e] font-bold">{member.character_name}</span>
                      {member.recent_quests.length > 0 ? (
                        <span className="text-gray-400">
                          {': '}
                          {member.recent_quests.map((q, i) => (
                            <span key={i}>
                              <em>"{q.transformed_text}"</em>
                              {i < member.recent_quests.length - 1 ? ' · ' : ''}
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span className="text-gray-600">: No activity logged this week</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={generateIntro}
                className="mt-4 px-4 py-2 bg-[#f4c553] hover:bg-[#eab308] text-[#0f172a] font-black text-xs uppercase tracking-wide rounded-lg transition-colors"
              >
                Generate Session Intro →
              </button>
            </div>

            {/* NPC Library */}
            <div className="bg-[#1e293b] border border-gray-700/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-black uppercase tracking-widest text-[#a78bfa]">
                  NPC Library
                </h2>
                <button
                  onClick={openAddNpc}
                  className="px-3 py-1 bg-[#a78bfa]/10 hover:bg-[#a78bfa]/20 border border-[#a78bfa]/30 text-[#a78bfa] text-xs font-bold rounded-lg transition-colors"
                >
                  + Add NPC
                </button>
              </div>

              {npcs.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-600 text-sm mb-1">No NPCs yet.</p>
                  <p className="text-gray-700 text-xs">Add characters your party will encounter.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {npcs.map(npc => {
                    const statusCfg = STATUS_CONFIG[npc.status] || STATUS_CONFIG.unknown;
                    return (
                      <button
                        key={npc.id}
                        onClick={() => { setSelectedNpc(npc); setModal('npc-detail'); }}
                        className="bg-[#0f172a] border border-gray-700/50 hover:border-[#a78bfa]/50 rounded-lg p-3 text-left transition-all"
                      >
                        <ChibiAvatar id={npc.chibi_character_id || 1} size={40} className="mb-2" />
                        <div className="text-white text-xs font-bold truncate">{npc.name}</div>
                        <div className="flex items-center gap-1 mt-1">
                          <span
                            className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: statusCfg.color }}
                          />
                          <span className="text-xs" style={{ color: statusCfg.color }}>{statusCfg.label}</span>
                        </div>
                        {npc.current_location && (
                          <div className="text-gray-600 text-xs mt-0.5 truncate">{npc.current_location}</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ===== RIGHT: AI TOOLS + SESSION LOG ===== */}
          <div className="space-y-4">

            {/* AI Tools */}
            <div className="bg-[#1e293b] border border-gray-700/50 rounded-xl p-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-[#f43f5e] mb-3">
                AI Tools
              </h2>
              <div className="space-y-2">
                <button
                  onClick={generatePlotHook}
                  className="w-full py-2.5 bg-[#f43f5e]/10 hover:bg-[#f43f5e]/20 border border-[#f43f5e]/30 text-[#f43f5e] font-bold text-xs rounded-lg transition-colors text-left px-3"
                >
                  🎯 Generate Plot Hook
                </button>
                <button
                  onClick={() => { setRecapForm({ title: '', dm_notes: '' }); setAiResult(''); setModal('session-recap'); }}
                  className="w-full py-2.5 bg-[#a78bfa]/10 hover:bg-[#a78bfa]/20 border border-[#a78bfa]/30 text-[#a78bfa] font-bold text-xs rounded-lg transition-colors text-left px-3"
                >
                  📜 Write Session Recap
                </button>
                <button
                  onClick={() => { setDialogueForm({ npc_id: npcs[0]?.id || '', scenario: '' }); setAiResult(''); setModal('npc-dialogue'); }}
                  disabled={npcs.length === 0}
                  className="w-full py-2.5 bg-[#22d3ee]/10 hover:bg-[#22d3ee]/20 border border-[#22d3ee]/30 text-[#22d3ee] font-bold text-xs rounded-lg transition-colors text-left px-3 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  💬 NPC Dialogue
                </button>
              </div>
            </div>

            {/* Session Log */}
            <div className="bg-[#1e293b] border border-gray-700/50 rounded-xl p-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-[#22d3ee] mb-3">
                Session Log
              </h2>
              {sessionLogs.length === 0 ? (
                <p className="text-gray-600 text-xs py-2">No sessions recorded yet. Use "Write Session Recap" to add one.</p>
              ) : (
                <div className="space-y-2">
                  {sessionLogs.map(log => (
                    <div key={log.id} className="border border-gray-700/50 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedSession(expandedSession === log.id ? null : log.id)}
                        className="w-full flex items-center justify-between p-3 hover:bg-[#0f172a]/40 transition-colors text-left"
                      >
                        <div>
                          <span className="text-[#22d3ee] font-black text-xs">Session {toRoman(log.session_number)}</span>
                          <p className="text-gray-300 text-xs mt-0.5">{log.title}</p>
                        </div>
                        <span className="text-gray-600 text-xs ml-2">{expandedSession === log.id ? '▲' : '▼'}</span>
                      </button>
                      {expandedSession === log.id && log.ai_narrative && (
                        <div className="px-3 pb-3 text-gray-400 text-xs leading-relaxed border-t border-gray-700/50 pt-2 max-h-48 overflow-y-auto">
                          {log.ai_narrative}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ===== MODALS ===== */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div
            className="bg-[#1e293b] border border-gray-600 rounded-xl w-full max-h-[90vh] overflow-y-auto"
            style={{ maxWidth: modal === 'add-npc' || modal === 'edit-npc' ? 600 : 560 }}
            onClick={e => e.stopPropagation()}
          >

            {/* ---- AI Result modals (gen-intro, plot-hook) ---- */}
            {(modal === 'gen-intro' || modal === 'plot-hook') && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black text-white uppercase tracking-wide text-sm">
                    {modal === 'gen-intro' ? '🎲 Session Opening' : '🎯 Plot Hook'}
                  </h3>
                  <button onClick={closeModal} className="text-gray-500 hover:text-white">✕</button>
                </div>
                {aiLoading ? (
                  <div className="py-10 text-center">
                    <div className="text-[#22d3ee] animate-pulse font-bold">Weaving the narrative...</div>
                  </div>
                ) : aiResult ? (
                  <>
                    <div className="bg-[#0f172a] rounded-lg p-4 text-gray-200 text-sm leading-relaxed whitespace-pre-wrap mb-4">
                      {aiResult}
                    </div>
                    <button
                      onClick={copyAiResult}
                      className="px-4 py-2 bg-[#22d3ee]/10 hover:bg-[#22d3ee]/20 border border-[#22d3ee]/30 text-[#22d3ee] font-bold text-sm rounded-lg transition-colors"
                    >
                      {aiCopied ? '✓ Copied!' : 'Copy to Clipboard'}
                    </button>
                  </>
                ) : (
                  <div className="py-6 text-center text-gray-500 text-sm">No result yet.</div>
                )}
              </div>
            )}

            {/* ---- Session Recap modal ---- */}
            {modal === 'session-recap' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black text-white uppercase tracking-wide text-sm">📜 Write Session Recap</h3>
                  <button onClick={closeModal} className="text-gray-500 hover:text-white">✕</button>
                </div>
                {!aiResult ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Session Title</label>
                      <input
                        type="text"
                        value={recapForm.title}
                        onChange={e => setRecapForm(f => ({ ...f, title: e.target.value }))}
                        placeholder="The Battle of Stone Bridge"
                        className="w-full bg-[#0f172a] border border-gray-600 focus:border-[#a78bfa] rounded-lg px-3 py-2 text-white placeholder-gray-600 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1">DM Notes (bullet points) *</label>
                      <textarea
                        value={recapForm.dm_notes}
                        onChange={e => setRecapForm(f => ({ ...f, dm_notes: e.target.value }))}
                        placeholder="- Party arrived at the city gates&#10;- Aldric challenged the guard captain&#10;- Found the hidden passage..."
                        rows={6}
                        className="w-full bg-[#0f172a] border border-gray-600 focus:border-[#a78bfa] rounded-lg px-3 py-2 text-white placeholder-gray-600 outline-none text-sm resize-none"
                      />
                    </div>
                    <button
                      onClick={generateRecap}
                      disabled={aiLoading || !recapForm.dm_notes.trim()}
                      className="w-full py-2.5 bg-[#a78bfa] hover:bg-[#9333ea] text-white font-black uppercase tracking-wide text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {aiLoading ? 'Writing chronicle...' : 'Generate Chronicle'}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="bg-[#0f172a] rounded-lg p-4 text-gray-200 text-sm leading-relaxed whitespace-pre-wrap mb-4 max-h-72 overflow-y-auto">
                      {aiResult}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={copyAiResult} className="px-4 py-2 bg-[#22d3ee]/10 hover:bg-[#22d3ee]/20 border border-[#22d3ee]/30 text-[#22d3ee] font-bold text-sm rounded-lg transition-colors">
                        {aiCopied ? '✓ Copied!' : 'Copy'}
                      </button>
                      <button onClick={() => { setAiResult(''); setRecapForm({ title: '', dm_notes: '' }); }} className="px-4 py-2 border border-gray-600 text-gray-400 hover:text-white font-bold text-sm rounded-lg transition-colors">
                        New Recap
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ---- NPC Dialogue modal ---- */}
            {modal === 'npc-dialogue' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black text-white uppercase tracking-wide text-sm">💬 NPC Dialogue</h3>
                  <button onClick={closeModal} className="text-gray-500 hover:text-white">✕</button>
                </div>
                {!aiResult ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Select NPC *</label>
                      <select
                        value={dialogueForm.npc_id}
                        onChange={e => setDialogueForm(f => ({ ...f, npc_id: e.target.value }))}
                        className="w-full bg-[#0f172a] border border-gray-600 focus:border-[#22d3ee] rounded-lg px-3 py-2 text-white outline-none text-sm"
                      >
                        <option value="">Select NPC...</option>
                        {npcs.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Scenario *</label>
                      <textarea
                        value={dialogueForm.scenario}
                        onChange={e => setDialogueForm(f => ({ ...f, scenario: e.target.value }))}
                        placeholder="The party confronts the NPC about the stolen artifact..."
                        rows={3}
                        className="w-full bg-[#0f172a] border border-gray-600 focus:border-[#22d3ee] rounded-lg px-3 py-2 text-white placeholder-gray-600 outline-none text-sm resize-none"
                      />
                    </div>
                    <button
                      onClick={generateDialogue}
                      disabled={aiLoading || !dialogueForm.npc_id || !dialogueForm.scenario.trim()}
                      className="w-full py-2.5 bg-[#22d3ee] hover:bg-[#06b6d4] text-[#0f172a] font-black uppercase tracking-wide text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {aiLoading ? 'Voicing...' : 'Generate Dialogue'}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="bg-[#0f172a] rounded-lg p-4 text-gray-200 text-sm leading-relaxed whitespace-pre-wrap mb-4 font-mono">
                      {aiResult}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={copyAiResult} className="px-4 py-2 bg-[#22d3ee]/10 hover:bg-[#22d3ee]/20 border border-[#22d3ee]/30 text-[#22d3ee] font-bold text-sm rounded-lg transition-colors">
                        {aiCopied ? '✓ Copied!' : 'Copy'}
                      </button>
                      <button onClick={() => setAiResult('')} className="px-4 py-2 border border-gray-600 text-gray-400 hover:text-white font-bold text-sm rounded-lg transition-colors">
                        Try Again
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ---- NPC Detail modal ---- */}
            {modal === 'npc-detail' && selectedNpc && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <ChibiAvatar id={selectedNpc.chibi_character_id || 1} size={48} />
                    <div>
                      <h3 className="font-black text-white text-lg">{selectedNpc.name}</h3>
                      {selectedNpc.archetype && <p className="text-gray-400 text-xs capitalize">{selectedNpc.archetype}</p>}
                    </div>
                  </div>
                  <button onClick={closeModal} className="text-gray-500 hover:text-white">✕</button>
                </div>

                <div className="space-y-3 text-sm">
                  {selectedNpc.status && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-xs w-28 flex-shrink-0">Status</span>
                      <span
                        className="font-bold capitalize px-2 py-0.5 rounded text-xs"
                        style={{
                          color: STATUS_CONFIG[selectedNpc.status]?.color,
                          backgroundColor: STATUS_CONFIG[selectedNpc.status]?.color + '22',
                        }}
                      >
                        {STATUS_CONFIG[selectedNpc.status]?.label || selectedNpc.status}
                      </span>
                    </div>
                  )}
                  {selectedNpc.current_location && (
                    <div className="flex gap-2">
                      <span className="text-gray-500 text-xs w-28 flex-shrink-0">Location</span>
                      <span className="text-gray-300">{selectedNpc.current_location}</span>
                    </div>
                  )}
                  {selectedNpc.relationship_to_party && (
                    <div className="flex gap-2">
                      <span className="text-gray-500 text-xs w-28 flex-shrink-0">Relationship</span>
                      <span className="text-gray-300">{selectedNpc.relationship_to_party}</span>
                    </div>
                  )}
                  {selectedNpc.personality && (
                    <div>
                      <p className="text-gray-500 text-xs mb-1 uppercase tracking-widest">Personality</p>
                      <p className="text-gray-300 bg-[#0f172a] rounded-lg p-3">{selectedNpc.personality}</p>
                    </div>
                  )}
                  {selectedNpc.backstory && (
                    <div>
                      <p className="text-gray-500 text-xs mb-1 uppercase tracking-widest">Backstory</p>
                      <p className="text-gray-300 bg-[#0f172a] rounded-lg p-3">{selectedNpc.backstory}</p>
                    </div>
                  )}
                  {selectedNpc.notes && (
                    <div>
                      <p className="text-gray-500 text-xs mb-1 uppercase tracking-widest">Notes</p>
                      <p className="text-gray-300 bg-[#0f172a] rounded-lg p-3">{selectedNpc.notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-5">
                  <button
                    onClick={() => openEditNpc(selectedNpc)}
                    className="px-4 py-2 bg-[#a78bfa]/10 hover:bg-[#a78bfa]/20 border border-[#a78bfa]/30 text-[#a78bfa] font-bold text-sm rounded-lg transition-colors"
                  >
                    Edit NPC
                  </button>
                  <button
                    onClick={() => {
                      setDialogueForm({ npc_id: selectedNpc.id, scenario: '' });
                      setAiResult('');
                      setModal('npc-dialogue');
                    }}
                    className="px-4 py-2 bg-[#22d3ee]/10 hover:bg-[#22d3ee]/20 border border-[#22d3ee]/30 text-[#22d3ee] font-bold text-sm rounded-lg transition-colors"
                  >
                    Generate Dialogue
                  </button>
                </div>
              </div>
            )}

            {/* ---- Add / Edit NPC modal ---- */}
            {(modal === 'add-npc' || modal === 'edit-npc') && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black text-white uppercase tracking-wide text-sm">
                    {modal === 'edit-npc' ? 'Edit NPC' : '+ Add NPC'}
                  </h3>
                  <button onClick={closeModal} className="text-gray-500 hover:text-white">✕</button>
                </div>
                <form onSubmit={saveNpc} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Name *</label>
                      <input
                        type="text"
                        value={npcForm.name}
                        onChange={e => setNpcForm(f => ({ ...f, name: e.target.value }))}
                        required
                        placeholder="Morgath the Wanderer"
                        className="w-full bg-[#0f172a] border border-gray-600 focus:border-[#a78bfa] rounded-lg px-3 py-2 text-white placeholder-gray-600 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Archetype</label>
                      <input
                        type="text"
                        value={npcForm.archetype}
                        onChange={e => setNpcForm(f => ({ ...f, archetype: e.target.value }))}
                        placeholder="Merchant, Guard, Villain..."
                        className="w-full bg-[#0f172a] border border-gray-600 focus:border-[#a78bfa] rounded-lg px-3 py-2 text-white placeholder-gray-600 outline-none text-sm"
                      />
                    </div>
                  </div>

                  {/* Chibi picker */}
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                      Design #{npcForm.chibi_character_id}
                    </label>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto bg-[#0f172a] rounded-lg p-2">
                      {Array.from({ length: 47 }, (_, i) => i + 1).map(id => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setNpcForm(f => ({ ...f, chibi_character_id: id }))}
                          className="transition-all"
                          style={{
                            outline: npcForm.chibi_character_id === id ? `2px solid ${CHIBI_PALETTE[(id - 1) % CHIBI_PALETTE.length]}` : 'none',
                            borderRadius: 6,
                          }}
                        >
                          <ChibiAvatar id={id} size={28} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Status</label>
                      <select
                        value={npcForm.status}
                        onChange={e => setNpcForm(f => ({ ...f, status: e.target.value }))}
                        className="w-full bg-[#0f172a] border border-gray-600 focus:border-[#a78bfa] rounded-lg px-3 py-2 text-white outline-none text-sm"
                      >
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Location</label>
                      <input
                        type="text"
                        value={npcForm.current_location}
                        onChange={e => setNpcForm(f => ({ ...f, current_location: e.target.value }))}
                        placeholder="The Docks"
                        className="w-full bg-[#0f172a] border border-gray-600 focus:border-[#a78bfa] rounded-lg px-3 py-2 text-white placeholder-gray-600 outline-none text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Relationship to Party</label>
                    <input
                      type="text"
                      value={npcForm.relationship_to_party}
                      onChange={e => setNpcForm(f => ({ ...f, relationship_to_party: e.target.value }))}
                      placeholder="Suspicious ally, wants something from them"
                      className="w-full bg-[#0f172a] border border-gray-600 focus:border-[#a78bfa] rounded-lg px-3 py-2 text-white placeholder-gray-600 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Personality</label>
                    <textarea
                      value={npcForm.personality}
                      onChange={e => setNpcForm(f => ({ ...f, personality: e.target.value }))}
                      rows={2}
                      placeholder="Cautious, speaks in riddles, deeply loyal to old oaths"
                      className="w-full bg-[#0f172a] border border-gray-600 focus:border-[#a78bfa] rounded-lg px-3 py-2 text-white placeholder-gray-600 outline-none text-sm resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Backstory</label>
                    <textarea
                      value={npcForm.backstory}
                      onChange={e => setNpcForm(f => ({ ...f, backstory: e.target.value }))}
                      rows={2}
                      placeholder="Former royal guard, exiled after..."
                      className="w-full bg-[#0f172a] border border-gray-600 focus:border-[#a78bfa] rounded-lg px-3 py-2 text-white placeholder-gray-600 outline-none text-sm resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1">AI Voice Description</label>
                    <input
                      type="text"
                      value={npcForm.ai_voice_description}
                      onChange={e => setNpcForm(f => ({ ...f, ai_voice_description: e.target.value }))}
                      placeholder="Gravelly voice, uses old-fashioned speech, often sighs"
                      className="w-full bg-[#0f172a] border border-gray-600 focus:border-[#a78bfa] rounded-lg px-3 py-2 text-white placeholder-gray-600 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Notes</label>
                    <textarea
                      value={npcForm.notes}
                      onChange={e => setNpcForm(f => ({ ...f, notes: e.target.value }))}
                      rows={2}
                      placeholder="Knows location of the artifact. Will betray party if threatened."
                      className="w-full bg-[#0f172a] border border-gray-600 focus:border-[#a78bfa] rounded-lg px-3 py-2 text-white placeholder-gray-600 outline-none text-sm resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={npcSaving || !npcForm.name.trim()}
                    className="w-full py-2.5 bg-[#a78bfa] hover:bg-[#9333ea] text-white font-black uppercase tracking-wide text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {npcSaving ? 'Saving...' : modal === 'edit-npc' ? 'Save Changes' : 'Add NPC'}
                  </button>
                </form>
              </div>
            )}

            {/* ---- Settings modal ---- */}
            {modal === 'settings' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black text-white uppercase tracking-wide text-sm">⚙ Campaign Settings</h3>
                  <button onClick={closeModal} className="text-gray-500 hover:text-white">✕</button>
                </div>
                <div className="space-y-4">
                  <div className="bg-[#0f172a] rounded-lg p-4">
                    <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Campaign</p>
                    <p className="text-white font-black">{campaign?.name}</p>
                    <p className="text-gray-500 text-sm">{campaign?.world_name}</p>
                    {campaign?.description && <p className="text-gray-400 text-sm mt-2">{campaign.description}</p>}
                  </div>
                  <div className="bg-[#0f172a] rounded-lg p-4">
                    <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Invite Link</p>
                    <p className="text-[#22d3ee] font-mono text-sm break-all">{inviteUrl}</p>
                    <button
                      onClick={() => { copyInviteLink(); }}
                      className="mt-2 px-3 py-1.5 bg-[#22d3ee]/10 hover:bg-[#22d3ee]/20 border border-[#22d3ee]/30 text-[#22d3ee] font-bold text-xs rounded-lg transition-colors"
                    >
                      {copiedCode ? '✓ Copied!' : 'Copy Invite Link'}
                    </button>
                  </div>
                  <div className="bg-[#0f172a] rounded-lg p-4">
                    <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Invite Code</p>
                    <p className="text-[#f4c553] font-black font-mono text-2xl tracking-widest">{campaign?.invite_code}</p>
                  </div>
                </div>
                <button onClick={closeModal} className="mt-4 w-full py-2 border border-gray-600 text-gray-400 hover:text-white font-bold text-sm rounded-lg transition-colors">
                  Close
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
