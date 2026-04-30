'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  MessageSquare,
  Pencil,
  Plus,
  Send,
  Trash2,
  Users,
  ChevronLeft,
  Search,
  Hash,
  Lock,
  Globe,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { useAuth } from '@/features/auth/auth-context';
import { api, getApiErrorMessage } from '@/services/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

type Group = {
  id: number;
  name: string;
  type: 'EVERYONE' | 'ADMINS_ONLY' | 'FILIERE' | 'DEPARTMENT' | 'CYCLE' | 'CLASS' | 'CUSTOM';
  _count: { members: number; messages: number };
};

type User = { id: number; fullName: string; email: string; role: string };

type GroupMember = {
  groupId: number;
  userId: number;
  canSend: boolean;
  user: { id: number; fullName: string; email: string; role: string };
};

type Message = {
  id: number;
  content: string;
  fileUrl?: string | null;
  createdAt: string;
  senderId: number;
  recipientId?: number | null;
  groupId?: number | null;
  sender: { id: number; fullName: string; role: string };
};

type ConversationPeer = {
  id: number;
  fullName: string;
  role: string;
  lastMessage?: string;
  lastAt?: string;
};

type InboxThread = {
  peer: ConversationPeer;
  lastMessage: string;
  lastAt: string;
  messageId: number;
};

type InboxPayload = {
  groups: Group[];
  directMessages: Message[];
  received: InboxThread[];
  sent: InboxThread[];
};

type Thread =
  | { kind: 'group'; group: Group }
  | { kind: 'direct'; peer: ConversationPeer };

const PAGE_SIZE_OPTIONS = [5, 10, 15, 25, 50, 100] as const;

// ─── Helpers ────────────────────────────────────────────────────────────────

const GROUP_TYPE_ICONS: Record<Group['type'], React.ReactNode> = {
  EVERYONE: <Globe size={13} />,
  ADMINS_ONLY: <Lock size={13} />,
  FILIERE: <Hash size={13} />,
  DEPARTMENT: <Hash size={13} />,
  CYCLE: <Hash size={13} />,
  CLASS: <Users size={13} />,
  CUSTOM: <Users size={13} />,
};

const GROUP_TYPE_LABELS: Record<Group['type'], string> = {
  EVERYONE: 'Tout le monde',
  ADMINS_ONLY: 'Admins',
  FILIERE: 'Filière',
  DEPARTMENT: 'Département',
  CYCLE: 'Cycle',
  CLASS: 'Classe',
  CUSTOM: 'Personnalisé',
};

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  return isToday
    ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

// ─── Group Management Modal ──────────────────────────────────────────────────

function GroupManageModal({
  group,
  onClose,
  onUpdated,
}: {
  group: Group | null;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const isCreate = !group;
  const [name, setName] = useState(group?.name ?? '');
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    setName(group?.name ?? '');
    if (!group) return;
    setLoadingMembers(true);
    Promise.all([
      api.get<GroupMember[]>(`/messaging/groups/${group.id}/members`),
      api.get<User[]>('/users/for-messaging'),
    ])
      .then(([membersRes, usersRes]) => {
        setMembers(membersRes.data);
        setAllUsers(usersRes.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoadingMembers(false));
  }, [group]);

  const memberIds = new Set(members.map((m) => m.userId));

  const filteredUsers = allUsers.filter(
    (u) =>
      !memberIds.has(u.id) &&
      (u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase())),
  );

  const addMember = async (userId: number) => {
    if (!group) return;
    try {
      await api.post(`/messaging/groups/${group.id}/members/${userId}`);
      const newMember = allUsers.find((u) => u.id === userId);
      if (newMember) {
        setMembers((prev) => [...prev, { groupId: group.id, userId, canSend: false, user: newMember }]);
      }
      setUserSearch('');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Impossible d\'ajouter le membre'));
    }
  };

  const removeMember = async (userId: number) => {
    if (!group) return;
    try {
      await api.delete(`/messaging/groups/${group.id}/members/${userId}`);
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Impossible de retirer le membre'));
    }
  };

  const toggleCanSend = async (userId: number, current: boolean) => {
    if (!group) return;
    try {
      await api.patch(`/messaging/groups/${group.id}/members/${userId}/can-send`, { canSend: !current });
      setMembers((prev) => prev.map((m) => m.userId === userId ? { ...m, canSend: !current } : m));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Impossible de modifier'));
    }
  };

  const save = async () => {
    if (!name.trim()) { toast.error('Nom requis'); return; }
    setSaving(true);
    try {
      if (isCreate) {
        await api.post('/messaging/groups', { name: name.trim(), type: 'CUSTOM' });
        toast.success('Groupe créé');
      } else {
        await api.patch(`/messaging/groups/${group!.id}`, { name: name.trim() });
        toast.success('Groupe mis à jour');
      }
      onUpdated();
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Opération impossible'));
    } finally {
      setSaving(false);
    }
  };

  const deleteGroup = async () => {
    if (!group || group.type !== 'CUSTOM') return;
    if (!window.confirm(`Supprimer "${group.name}" ?`)) return;
    try {
      await api.delete(`/messaging/groups/${group.id}`);
      toast.success('Groupe supprimé');
      onUpdated();
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Suppression impossible'));
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">
              {isCreate ? 'Nouveau groupe personnalisé' : `Modifier : ${group!.name}`}
            </h2>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Nom du groupe</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom..." />
            </div>

            {!isCreate && (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600">Membres ({members.length})</label>
                  {loadingMembers ? (
                    <p className="text-xs text-slate-400">Chargement...</p>
                  ) : members.length === 0 ? (
                    <p className="text-xs text-slate-400">Aucun membre</p>
                  ) : (
                    <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-100 divide-y divide-slate-50">
                      {members.map((m) => (
                        <div key={m.userId} className="flex items-center gap-2 px-3 py-1.5">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[9px] font-bold text-slate-600">
                            {m.user.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12px] font-medium text-slate-800">{m.user.fullName}</p>
                            <p className="text-[10px] text-slate-400 capitalize">{m.user.role}</p>
                          </div>
                          <label className="flex items-center gap-1 text-[10px] text-slate-500 cursor-pointer">
                            <input type="checkbox" checked={m.canSend} onChange={() => void toggleCanSend(m.userId, m.canSend)} />
                            Peut envoyer
                          </label>
                          <button type="button" onClick={() => void removeMember(m.userId)} className="shrink-0 text-slate-400 hover:text-red-500">
                            <X size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Ajouter membre</label>
                  <div className="relative">
                    <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      className="input pl-8 text-sm"
                      placeholder="Rechercher utilisateur..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                    />
                  </div>
                  {userSearch && filteredUsers.length > 0 && (
                    <div className="max-h-32 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                      {filteredUsers.slice(0, 10).map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
                          onClick={() => void addMember(u.id)}
                        >
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[9px] font-bold text-emerald-700">
                            {u.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-medium text-slate-800">{u.fullName}</p>
                            <p className="text-[10px] text-slate-400 capitalize">{u.role}</p>
                          </div>
                          <Plus size={12} className="ml-auto shrink-0 text-emerald-600" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2 px-5 py-3 border-t border-slate-100">
            {!isCreate && group?.type === 'CUSTOM' && (
              <button
                type="button"
                className="btn-outline text-red-600 hover:border-red-300"
                onClick={() => void deleteGroup()}
              >
                <Trash2 size={13} />
              </button>
            )}
            <button type="button" className="btn-outline flex-1" onClick={onClose}>Annuler</button>
            <button
              type="button"
              className="btn-primary flex-1"
              disabled={saving || !name.trim()}
              onClick={() => void save()}
            >
              {saving ? 'Enregistrement...' : isCreate ? 'Créer' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Compose Modal ───────────────────────────────────────────────────────────

function ComposeModal({
  currentUser,
  groups,
  onClose,
  onSent,
}: {
  currentUser: { id: number; role: string };
  groups: Group[];
  onClose: () => void;
  onSent: () => void;
}) {
  const [target, setTarget] = useState<'group' | 'direct'>('group');
  const [groupId, setGroupId] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const [highlightedRecipientId, setHighlightedRecipientId] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (target !== 'direct') return;
    api
      .get<User[]>('/users/for-messaging')
      .then((r) => setUsers(r.data ?? []))
      .catch(() => {});
  }, [target]);

  const filteredUsers = users.filter(
    (u) =>
      u.id !== currentUser.id &&
      (u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase())),
  );

  const selectedRecipients = users.filter((u) => recipientIds.includes(String(u.id)));

  const addRecipient = (userId: string) => {
    if (!userId) return;
    setRecipientIds((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
    setHighlightedRecipientId('');
  };

  const removeRecipient = (userId: string) => {
    setRecipientIds((prev) => prev.filter((id) => id !== userId));
  };

  const send = async () => {
    if (!content.trim()) return;
    setSending(true);
    try {
      if (target === 'group') {
        await api.post('/messaging/send', { content: content.trim(), groupId: Number(groupId) });
      } else {
        const uniqueIds = [...new Set(recipientIds.map(Number).filter(Boolean))];
        await Promise.all(uniqueIds.map((recipientId) => api.post('/messaging/send', { content: content.trim(), recipientId })));
      }
      onSent();
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Échec de l'envoi"));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Nouveau message</h2>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">✕</button>
          </div>

          <div className="px-5 py-4 space-y-4">
            <div className="flex rounded-xl border border-slate-200 p-0.5 bg-slate-50">
              {(['group', 'direct'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={cn('flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all', target === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500')}
                  onClick={() => setTarget(t)}
                >
                  {t === 'group' ? 'Groupe' : 'Direct (1:1)'}
                </button>
              ))}
            </div>

            {target === 'group' ? (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Groupe</label>
                <select className="input" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                  <option value="">— Sélectionner un groupe —</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name} ({GROUP_TYPE_LABELS[g.type]})</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Destinataire</label>
                <div className="relative mb-1">
                  <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className="input pl-8 text-sm" placeholder="Rechercher…" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
                </div>
                {selectedRecipients.length > 0 && (
                  <div className="mb-1 flex flex-wrap gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50/60 p-2">
                    {selectedRecipients.map((u) => (
                      <span key={u.id} className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        {u.fullName}
                        <button type="button" className="rounded-full px-1 leading-none hover:bg-emerald-200" onClick={() => removeRecipient(String(u.id))}>×</button>
                      </span>
                    ))}
                  </div>
                )}
                <select className="input" size={6} value={highlightedRecipientId} onChange={(e) => setHighlightedRecipientId(e.target.value)} onDoubleClick={(e) => addRecipient((e.target as HTMLSelectElement).value)}>
                  <option value="">— Liste utilisateurs —</option>
                  {filteredUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
                  ))}
                </select>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] text-slate-400">Double-clic pour ajouter.</p>
                  <button type="button" className="btn-outline py-1 px-2 text-[11px]" onClick={() => addRecipient(highlightedRecipientId)} disabled={!highlightedRecipientId}>Ajouter</button>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Message</label>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Votre message… (Ctrl+Entrée pour envoyer)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void send(); }}
              />
            </div>
          </div>

          <div className="flex gap-2 px-5 py-3 border-t border-slate-100">
            <button type="button" className="btn-outline flex-1" onClick={onClose}>Annuler</button>
            <button
              type="button"
              className="btn-primary flex-1 flex items-center justify-center gap-1.5"
              disabled={sending || !content.trim() || (target === 'group' ? !groupId : recipientIds.length === 0)}
              onClick={() => void send()}
            >
              {sending ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Send size={13} />}
              Envoyer
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Message card ──────────────────────────────────────────────────────────

function MessageCard({ msg, isMine }: { msg: Message; isMine: boolean }) {
  return (
    <div className={cn('rounded-xl border px-4 py-3 space-y-1.5', isMine ? 'border-emerald-100 bg-emerald-50' : 'border-slate-200 bg-white')}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white', isMine ? 'bg-emerald-600' : 'bg-slate-400')}>
            {msg.sender.fullName.charAt(0).toUpperCase()}
          </div>
          <span className={cn('text-[12px] font-semibold truncate', isMine ? 'text-emerald-800' : 'text-slate-800')}>
            {isMine ? 'Moi' : msg.sender.fullName}
          </span>
          {!isMine && <span className="text-[10px] text-slate-400 capitalize shrink-0">{msg.sender.role}</span>}
        </div>
        <span className="text-[10px] text-slate-400 shrink-0">{formatTime(msg.createdAt)}</span>
      </div>
      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
      {msg.fileUrl && (
        <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="inline-block text-xs text-blue-600 underline">Pièce jointe</a>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'staff';
  const searchParams = useSearchParams();

  const [groups, setGroups] = useState<Group[]>([]);
  const [receivedThreads, setReceivedThreads] = useState<InboxThread[]>([]);
  const [sentThreads, setSentThreads] = useState<InboxThread[]>([]);

  const initialTab = (() => {
    const t = searchParams.get('tab');
    if (t === 'received' || t === 'sent') return t;
    return 'groups' as const;
  })();
  const [activeTab, setActiveTab] = useState<'groups' | 'received' | 'sent'>(initialTab);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [managingGroup, setManagingGroup] = useState<Group | null | 'new'>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState<number>(10);
  const [tabPages, setTabPages] = useState<{ groups: number; received: number; sent: number }>({ groups: 1, received: 1, sent: 1 });
  const preselectHandled = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const compatibleGroups = useMemo(() => {
    if (!user) return [];
    if (isAdmin) return groups;
    return groups.filter((group) => group.type !== 'ADMINS_ONLY');
  }, [groups, isAdmin, user]);

  const loadGroups = useCallback(async () => {
    try {
      const res = await api.get<Group[]>('/messaging/groups');
      setGroups(res.data);
    } catch { /* silent */ }
  }, []);

  const loadInbox = useCallback(async () => {
    try {
      const res = await api.get<InboxPayload>('/messaging/inbox');
      setReceivedThreads(res.data.received ?? []);
      setSentThreads(res.data.sent ?? []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { void loadGroups(); void loadInbox(); }, [loadGroups, loadInbox]);

  useEffect(() => {
    if (preselectHandled.current) return;
    const groupIdParam = searchParams.get('groupId');
    const peerIdParam = searchParams.get('peerId');
    const tabParam = searchParams.get('tab');
    if (!groupIdParam && !peerIdParam) { preselectHandled.current = true; return; }
    if (groupIdParam) {
      const groupId = Number(groupIdParam);
      const group = compatibleGroups.find((g) => g.id === groupId);
      if (!group) return;
      setActiveTab('groups');
      setActiveThread({ kind: 'group', group });
      preselectHandled.current = true;
      return;
    }
    if (peerIdParam) {
      const peerId = Number(peerIdParam);
      if (!Number.isFinite(peerId)) { preselectHandled.current = true; return; }
      const fromReceived = receivedThreads.find((t) => t.peer.id === peerId)?.peer;
      const fromSent = sentThreads.find((t) => t.peer.id === peerId)?.peer;
      const peer = fromReceived ?? fromSent ?? { id: peerId, fullName: `Utilisateur #${peerId}`, role: '' };
      setActiveTab(tabParam === 'sent' ? 'sent' : 'received');
      setActiveThread({ kind: 'direct', peer });
      preselectHandled.current = true;
    }
  }, [compatibleGroups, receivedThreads, searchParams, sentThreads]);

  const loadThreadMessages = useCallback(async (showLoader = false) => {
    if (!activeThread) return;
    if (showLoader) { setMsgLoading(true); setMessages([]); }
    try {
      let res;
      if (activeThread.kind === 'group') {
        res = await api.get<Message[]>(`/messaging/groups/${activeThread.group.id}/messages`);
      } else {
        res = await api.get<Message[]>(`/messaging/conversation/${activeThread.peer.id}`);
      }
      setMessages((res.data as Message[]).reverse());
    } catch (err) {
      if (showLoader) toast.error(getApiErrorMessage(err, 'Impossible de charger les messages.'));
    } finally {
      if (showLoader) setMsgLoading(false);
    }
  }, [activeThread]);

  useEffect(() => {
    if (!activeThread) { setMessages([]); return; }
    void loadThreadMessages(true);
  }, [activeThread]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!activeThread) return;
    const interval = setInterval(() => void loadThreadMessages(false), 10_000);
    return () => clearInterval(interval);
  }, [activeThread, loadThreadMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendReply = async () => {
    if (!replyText.trim() || !activeThread || !user) return;
    setSending(true);
    try {
      const body: Record<string, unknown> = { content: replyText.trim() };
      if (activeThread.kind === 'group') body.groupId = activeThread.group.id;
      else body.recipientId = activeThread.peer.id;
      await api.post<Message>('/messaging/send', body);
      setReplyText('');
      await Promise.all([loadThreadMessages(false), loadInbox()]);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Échec de l'envoi"));
    } finally {
      setSending(false);
    }
  };

  const filteredGroups = compatibleGroups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()));
  const filteredReceived = receivedThreads.filter((item) => item.peer.fullName.toLowerCase().includes(search.toLowerCase()));
  const filteredSent = sentThreads.filter((item) => item.peer.fullName.toLowerCase().includes(search.toLowerCase()));

  const activeCollectionLength =
    activeTab === 'groups' ? filteredGroups.length : activeTab === 'received' ? filteredReceived.length : filteredSent.length;
  const activePageCount = Math.max(1, Math.ceil(activeCollectionLength / pageSize));
  const currentPage = Math.min(tabPages[activeTab], activePageCount);

  useEffect(() => {
    setTabPages((prev) => {
      if (prev[activeTab] === currentPage) return prev;
      return { ...prev, [activeTab]: currentPage };
    });
  }, [activeTab, currentPage]);

  const paginatedGroups = filteredGroups.slice((tabPages.groups - 1) * pageSize, tabPages.groups * pageSize);
  const paginatedReceived = filteredReceived.slice((tabPages.received - 1) * pageSize, tabPages.received * pageSize);
  const paginatedSent = filteredSent.slice((tabPages.sent - 1) * pageSize, tabPages.sent * pageSize);

  const threadTitle = activeThread?.kind === 'group' ? activeThread.group.name : activeThread?.peer.fullName ?? '';

  const canSendInThread = (() => {
    if (!activeThread || !user) return false;
    if (isAdmin) return true;
    if (activeThread.kind === 'direct') return true;
    return true;
  })();

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Communication"
        title="Messagerie"
        description="Échangez des messages avec les groupes ou en direct avec d'autres utilisateurs."
      />

      <div className="flex h-[calc(100vh-220px)] min-h-[500px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Left panel */}
        <aside className={cn('flex w-full flex-col border-r border-slate-100 md:w-72 md:shrink-0', activeThread ? 'hidden md:flex' : 'flex')}>
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-semibold text-slate-800">Messages</span>
            <div className="flex items-center gap-1">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setManagingGroup('new')}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                  title="Nouveau groupe"
                >
                  <Users size={14} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setComposeOpen(true)}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                title="Nouveau message"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          <div className="px-3 py-2 border-b border-slate-50">
            <div className="mb-2 flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
              {(['groups', 'received', 'sent'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={cn('flex-1 rounded-lg py-1 text-[11px] font-semibold transition-all', activeTab === tab ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500')}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === 'groups' ? 'Groupes' : tab === 'received' ? 'Reçus' : 'Envoyés'}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-8 py-1.5 text-xs"
                placeholder={activeTab === 'groups' ? 'Rechercher un groupe…' : 'Rechercher un contact…'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Par page</span>
                <select
                  className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px]"
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setTabPages({ groups: 1, received: 1, sent: 1 }); }}
                >
                  {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
                </select>
              </div>
              <span className="text-slate-400">{activeCollectionLength} éléments</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeTab === 'groups' ? (
              filteredGroups.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">Aucun groupe</p>
              ) : (
                <div className="py-1">
                  <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Groupes</p>
                  {paginatedGroups.map((g) => {
                    const active = activeThread?.kind === 'group' && activeThread.group.id === g.id;
                    return (
                      <div key={g.id} className={cn('group flex w-full items-center gap-3 px-4 py-2.5 transition-colors hover:bg-slate-50', active && 'bg-emerald-50')}>
                        <button type="button" className="flex flex-1 items-center gap-3 min-w-0 text-left" onClick={() => setActiveThread({ kind: 'group', group: g })}>
                          <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white', g.type === 'EVERYONE' ? 'bg-blue-500' : g.type === 'ADMINS_ONLY' ? 'bg-red-500' : g.type === 'CLASS' ? 'bg-amber-500' : 'bg-emerald-600')}>
                            {GROUP_TYPE_ICONS[g.type]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn('truncate text-[13px] font-medium', active ? 'text-emerald-700' : 'text-slate-800')}>{g.name}</p>
                            <p className="text-[10px] text-slate-400">{g._count.members} membre{g._count.members !== 1 ? 's' : ''} · {g._count.messages} msg{g._count.messages !== 1 ? 's' : ''}</p>
                          </div>
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-emerald-600"
                            title="Modifier groupe"
                            onClick={(e) => { e.stopPropagation(); setManagingGroup(g); }}
                          >
                            <Pencil size={13} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            ) : activeTab === 'received' ? (
              filteredReceived.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">Aucun message reçu</p>
              ) : (
                <div className="py-1">
                  <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Expéditeurs</p>
                  {paginatedReceived.map((item) => {
                    const active = activeThread?.kind === 'direct' && activeThread.peer.id === item.peer.id;
                    return (
                      <button key={`received-${item.messageId}-${item.peer.id}`} type="button" className={cn('flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50', active && 'bg-emerald-50')} onClick={() => setActiveThread({ kind: 'direct', peer: item.peer })}>
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-300 text-[11px] font-semibold text-white">{item.peer.fullName.charAt(0).toUpperCase()}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className={cn('truncate text-[13px] font-medium', active ? 'text-emerald-700' : 'text-slate-800')}>{item.peer.fullName}</p>
                            <span className="shrink-0 text-[10px] text-slate-400">{formatTime(item.lastAt)}</span>
                          </div>
                          <p className="truncate text-[11px] text-slate-500">{item.lastMessage}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )
            ) : filteredSent.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">Aucun message envoyé</p>
            ) : (
              <div className="py-1">
                <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Destinataires</p>
                {paginatedSent.map((item) => {
                  const active = activeThread?.kind === 'direct' && activeThread.peer.id === item.peer.id;
                  return (
                    <button key={`sent-${item.messageId}-${item.peer.id}`} type="button" className={cn('flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50', active && 'bg-emerald-50')} onClick={() => setActiveThread({ kind: 'direct', peer: item.peer })}>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-semibold text-white">{item.peer.fullName.charAt(0).toUpperCase()}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn('truncate text-[13px] font-medium', active ? 'text-emerald-700' : 'text-slate-800')}>{item.peer.fullName}</p>
                          <span className="shrink-0 text-[10px] text-slate-400">{formatTime(item.lastAt)}</span>
                        </div>
                        <p className="truncate text-[11px] text-slate-500">{item.lastMessage}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {activeCollectionLength > 0 && (
              <div className="sticky bottom-0 border-t border-slate-100 bg-white px-3 py-2">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <button type="button" className="rounded-md border border-slate-200 px-2 py-1 text-slate-600 disabled:opacity-50" disabled={tabPages[activeTab] <= 1} onClick={() => setTabPages((prev) => ({ ...prev, [activeTab]: Math.max(1, prev[activeTab] - 1) }))}>Précédent</button>
                  <span className="text-slate-500">Page {tabPages[activeTab]} / {activePageCount}</span>
                  <button type="button" className="rounded-md border border-slate-200 px-2 py-1 text-slate-600 disabled:opacity-50" disabled={tabPages[activeTab] >= activePageCount} onClick={() => setTabPages((prev) => ({ ...prev, [activeTab]: Math.min(activePageCount, prev[activeTab] + 1) }))}>Suivant</button>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Right panel */}
        <main className={cn('flex flex-1 flex-col', !activeThread ? 'hidden md:flex' : 'flex')}>
          {!activeThread ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-slate-400">
              <MessageSquare size={40} strokeWidth={1.2} />
              <p className="text-sm">Sélectionnez un groupe ou composez un message</p>
              <button type="button" className="btn-primary text-xs" onClick={() => setComposeOpen(true)}>
                <Plus size={13} />Nouveau message
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                <button type="button" className="flex md:hidden h-7 w-7 items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500" onClick={() => setActiveThread(null)}>
                  <ChevronLeft size={16} />
                </button>
                {activeThread.kind === 'group' && (
                  <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white', activeThread.group.type === 'EVERYONE' ? 'bg-blue-500' : activeThread.group.type === 'ADMINS_ONLY' ? 'bg-red-500' : activeThread.group.type === 'CLASS' ? 'bg-amber-500' : 'bg-emerald-600')}>
                    {GROUP_TYPE_ICONS[activeThread.group.type]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{threadTitle}</p>
                  {activeThread.kind === 'group' && (
                    <p className="text-[11px] text-slate-400">{GROUP_TYPE_LABELS[activeThread.group.type]} · {activeThread.group._count.members} membres</p>
                  )}
                  {activeThread.kind === 'direct' && <p className="text-[11px] text-slate-400 capitalize">{activeThread.peer.role}</p>}
                </div>
                {isAdmin && activeThread.kind === 'group' && (
                  <button
                    type="button"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                    title="Modifier groupe"
                    onClick={() => setManagingGroup(activeThread.group)}
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                {msgLoading ? (
                  <div className="flex items-center justify-center py-12 text-xs text-slate-400">Chargement…</div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                    <MessageSquare size={28} strokeWidth={1.2} />
                    <p className="text-xs">Aucun message pour le moment</p>
                  </div>
                ) : (
                  messages.map((msg) => <MessageCard key={msg.id} msg={msg} isMine={msg.senderId === user?.id} />)
                )}
                <div ref={bottomRef} />
              </div>

              {canSendInThread ? (
                <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    {activeThread.kind === 'group' ? 'Envoyer au groupe' : 'Répondre'}
                  </p>
                  <div className="flex items-end gap-2">
                    <textarea className="input flex-1 resize-none text-sm bg-white" rows={2} placeholder="Votre message… (Ctrl+Entrée)" value={replyText} onChange={(e) => setReplyText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void sendReply(); }} />
                    <button type="button" className="btn-primary self-end py-2.5 px-3" disabled={sending || !replyText.trim()} onClick={() => void sendReply()}>
                      {sending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Send size={15} />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-t border-slate-100 px-4 py-3">
                  <p className="text-center text-xs text-slate-400">Lecture seule — vous ne pouvez pas envoyer dans ce canal.</p>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {composeOpen && user && (
        <ComposeModal
          currentUser={user}
          groups={compatibleGroups}
          onClose={() => setComposeOpen(false)}
          onSent={() => { void loadGroups(); void loadInbox(); }}
        />
      )}

      {managingGroup !== null && (
        <GroupManageModal
          group={managingGroup === 'new' ? null : managingGroup}
          onClose={() => setManagingGroup(null)}
          onUpdated={() => { void loadGroups(); }}
        />
      )}
    </div>
  );
}
