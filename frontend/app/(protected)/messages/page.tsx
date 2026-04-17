'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MessageSquare,
  Plus,
  Send,
  Users,
  ChevronLeft,
  Search,
  Hash,
  Lock,
  Globe,
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
  type: 'EVERYONE' | 'ADMINS_ONLY' | 'FILIERE' | 'DEPARTMENT' | 'CYCLE' | 'CUSTOM';
  _count: { members: number; messages: number };
};

type User = { id: number; fullName: string; email: string; role: string };

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

type Thread =
  | { kind: 'group'; group: Group }
  | { kind: 'direct'; peer: ConversationPeer };

// ─── Helpers ────────────────────────────────────────────────────────────────

const GROUP_TYPE_ICONS: Record<Group['type'], React.ReactNode> = {
  EVERYONE: <Globe size={13} />,
  ADMINS_ONLY: <Lock size={13} />,
  FILIERE: <Hash size={13} />,
  DEPARTMENT: <Hash size={13} />,
  CYCLE: <Hash size={13} />,
  CUSTOM: <Users size={13} />,
};

const GROUP_TYPE_LABELS: Record<Group['type'], string> = {
  EVERYONE: 'Tout le monde',
  ADMINS_ONLY: 'Admins',
  FILIERE: 'Filière',
  DEPARTMENT: 'Département',
  CYCLE: 'Cycle',
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
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'staff';
  const [target, setTarget] = useState<'group' | 'direct'>('group');
  const [groupId, setGroupId] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (target !== 'direct') return;
    api
      .get<{ data: User[] }>('/users', { params: { limit: 200 } })
      .then((r) => setUsers(r.data.data ?? []))
      .catch(() => {});
  }, [target]);

  const filteredUsers = users.filter(
    (u) =>
      u.id !== currentUser.id &&
      (isAdmin || u.role === 'admin' || u.role === 'staff') &&
      (u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase())),
  );

  const send = async () => {
    if (!content.trim()) return;
    setSending(true);
    try {
      const body: Record<string, unknown> = { content: content.trim() };
      if (target === 'group') body.groupId = Number(groupId);
      else body.recipientId = Number(recipientId);
      await api.post('/messaging/send', body);
      toast.success('Message envoyé.');
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
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              ✕
            </button>
          </div>

          <div className="px-5 py-4 space-y-4">
            {/* Target toggle */}
            <div className="flex rounded-xl border border-slate-200 p-0.5 bg-slate-50">
              {(['group', 'direct'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={cn(
                    'flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all',
                    target === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500',
                  )}
                  onClick={() => setTarget(t)}
                >
                  {t === 'group' ? 'Groupe' : 'Direct (1:1)'}
                </button>
              ))}
            </div>

            {/* Destination */}
            {target === 'group' ? (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Groupe</label>
                <select className="input" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                  <option value="">— Sélectionner un groupe —</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({GROUP_TYPE_LABELS[g.type]})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Destinataire</label>
                <div className="relative mb-1">
                  <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className="input pl-8 text-sm"
                    placeholder="Rechercher…"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
                <select className="input" size={5} value={recipientId} onChange={(e) => setRecipientId(e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {filteredUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Message */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Message</label>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Votre message…"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void send();
                }}
              />
              <p className="text-[10px] text-slate-400">Ctrl+Entrée pour envoyer</p>
            </div>
          </div>

          <div className="flex gap-2 px-5 py-3 border-t border-slate-100">
            <button type="button" className="btn-outline flex-1" onClick={onClose}>
              Annuler
            </button>
            <button
              type="button"
              className="btn-primary flex-1 flex items-center justify-center gap-1.5"
              disabled={sending || !content.trim() || (target === 'group' ? !groupId : !recipientId)}
              onClick={() => void send()}
            >
              {sending ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <Send size={13} />
              )}
              Envoyer
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg, isMine }: { msg: Message; isMine: boolean }) {
  return (
    <div className={cn('flex gap-2 max-w-[80%]', isMine ? 'ml-auto flex-row-reverse' : '')}>
      <div className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white',
        isMine ? 'bg-emerald-600' : 'bg-slate-400',
      )}>
        {msg.sender.fullName.charAt(0).toUpperCase()}
      </div>
      <div>
        {!isMine && (
          <p className="mb-0.5 text-[10px] font-semibold text-slate-500">{msg.sender.fullName}</p>
        )}
        <div className={cn(
          'rounded-2xl px-3.5 py-2.5 text-sm leading-snug',
          isMine ? 'bg-emerald-600 text-white rounded-tr-sm' : 'bg-slate-100 text-slate-800 rounded-tl-sm',
        )}>
          {msg.content}
          {msg.fileUrl && (
            <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="mt-1 block text-xs underline opacity-80">
              Pièce jointe
            </a>
          )}
        </div>
        <p className={cn('mt-1 text-[10px] text-slate-400', isMine && 'text-right')}>
          {formatTime(msg.createdAt)}
        </p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'staff';

  const [groups, setGroups] = useState<Group[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load groups
  const loadGroups = useCallback(async () => {
    try {
      const res = await api.get<Group[]>('/messaging/groups');
      setGroups(res.data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { void loadGroups(); }, [loadGroups]);

  // Load messages when thread changes
  useEffect(() => {
    if (!activeThread) { setMessages([]); return; }
    const load = async () => {
      setMsgLoading(true);
      setMessages([]);
      try {
        let res;
        if (activeThread.kind === 'group') {
          res = await api.get<Message[]>(`/messaging/groups/${activeThread.group.id}/messages`);
        } else {
          res = await api.get<Message[]>(`/messaging/conversation/${activeThread.peer.id}`);
        }
        setMessages((res.data as Message[]).reverse());
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Impossible de charger les messages.'));
      } finally {
        setMsgLoading(false);
      }
    };
    void load();
  }, [activeThread]);

  // Scroll to bottom when messages load
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendReply = async () => {
    if (!replyText.trim() || !activeThread || !user) return;
    setSending(true);
    try {
      const body: Record<string, unknown> = { content: replyText.trim() };
      if (activeThread.kind === 'group') body.groupId = activeThread.group.id;
      else body.recipientId = activeThread.peer.id;

      const res = await api.post<Message>('/messaging/send', body);
      setMessages((prev) => [...prev, { ...res.data, sender: { id: user.id, fullName: user.fullName ?? user.email, role: user.role } }]);
      setReplyText('');
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Échec de l'envoi"));
    } finally {
      setSending(false);
    }
  };

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()),
  );

  const threadTitle =
    activeThread?.kind === 'group'
      ? activeThread.group.name
      : activeThread?.peer.fullName ?? '';

  const canSendInThread = (() => {
    if (!activeThread || !user) return false;
    if (isAdmin) return true;
    if (activeThread.kind === 'direct') return true; // checked server-side
    return true; // group send permission checked server-side
  })();

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Communication"
        title="Messagerie"
        description="Échangez des messages avec les groupes ou en direct avec d'autres utilisateurs."
      />

      <div className="flex h-[calc(100vh-220px)] min-h-[500px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* ── Left panel: thread list ── */}
        <aside className={cn(
          'flex w-full flex-col border-r border-slate-100 md:w-72 md:shrink-0',
          activeThread ? 'hidden md:flex' : 'flex',
        )}>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-semibold text-slate-800">Canaux & Conversations</span>
            <button
              type="button"
              onClick={() => setComposeOpen(true)}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              title="Nouveau message"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Search */}
          <div className="px-3 py-2 border-b border-slate-50">
            <div className="relative">
              <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-8 py-1.5 text-xs"
                placeholder="Rechercher un groupe…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Groups list */}
          <div className="flex-1 overflow-y-auto">
            {filteredGroups.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">Aucun groupe</p>
            ) : (
              <div className="py-1">
                <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Groupes
                </p>
                {filteredGroups.map((g) => {
                  const active = activeThread?.kind === 'group' && activeThread.group.id === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50',
                        active && 'bg-emerald-50',
                      )}
                      onClick={() => setActiveThread({ kind: 'group', group: g })}
                    >
                      <div className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white',
                        g.type === 'EVERYONE' ? 'bg-blue-500' :
                        g.type === 'ADMINS_ONLY' ? 'bg-red-500' :
                        'bg-emerald-600',
                      )}>
                        {GROUP_TYPE_ICONS[g.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('truncate text-[13px] font-medium', active ? 'text-emerald-700' : 'text-slate-800')}>
                          {g.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {g._count.members} membre{g._count.members !== 1 ? 's' : ''} · {g._count.messages} message{g._count.messages !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* ── Right panel: conversation ── */}
        <main className={cn(
          'flex flex-1 flex-col',
          !activeThread ? 'hidden md:flex' : 'flex',
        )}>
          {!activeThread ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-slate-400">
              <MessageSquare size={40} strokeWidth={1.2} />
              <p className="text-sm">Sélectionnez un groupe ou composez un message</p>
              <button
                type="button"
                className="btn-primary text-xs"
                onClick={() => setComposeOpen(true)}
              >
                <Plus size={13} />
                Nouveau message
              </button>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                <button
                  type="button"
                  className="flex md:hidden h-7 w-7 items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500"
                  onClick={() => setActiveThread(null)}
                >
                  <ChevronLeft size={16} />
                </button>
                {activeThread.kind === 'group' && (
                  <div className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white',
                    activeThread.group.type === 'EVERYONE' ? 'bg-blue-500' :
                    activeThread.group.type === 'ADMINS_ONLY' ? 'bg-red-500' :
                    'bg-emerald-600',
                  )}>
                    {GROUP_TYPE_ICONS[activeThread.group.type]}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-slate-800">{threadTitle}</p>
                  {activeThread.kind === 'group' && (
                    <p className="text-[11px] text-slate-400">
                      {GROUP_TYPE_LABELS[activeThread.group.type]} · {activeThread.group._count.members} membres
                    </p>
                  )}
                  {activeThread.kind === 'direct' && (
                    <p className="text-[11px] text-slate-400 capitalize">{activeThread.peer.role}</p>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {msgLoading ? (
                  <div className="flex items-center justify-center py-12 text-xs text-slate-400">
                    Chargement…
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                    <MessageSquare size={28} strokeWidth={1.2} />
                    <p className="text-xs">Aucun message pour le moment</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      isMine={msg.senderId === user?.id}
                    />
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              {/* Reply box */}
              {canSendInThread && (
                <div className="border-t border-slate-100 px-4 py-3">
                  <div className="flex items-end gap-2">
                    <textarea
                      className="input flex-1 resize-none text-sm"
                      rows={2}
                      placeholder="Votre message… (Ctrl+Entrée pour envoyer)"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void sendReply();
                      }}
                    />
                    <button
                      type="button"
                      className="btn-primary self-end py-2.5 px-3"
                      disabled={sending || !replyText.trim()}
                      onClick={() => void sendReply()}
                    >
                      {sending ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      ) : (
                        <Send size={15} />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {!canSendInThread && (
                <div className="border-t border-slate-100 px-4 py-3">
                  <p className="text-center text-xs text-slate-400">
                    Vous pouvez uniquement lire ce canal.
                  </p>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Compose modal */}
      {composeOpen && user && (
        <ComposeModal
          currentUser={user}
          groups={groups}
          onClose={() => setComposeOpen(false)}
          onSent={() => void loadGroups()}
        />
      )}
    </div>
  );
}
