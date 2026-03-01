import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useCollaboration } from '../hooks/useCollaboration';
import { useRoomSocket } from '../hooks/useRoomSocket';
import { ToastContainer, useToasts } from '../components/Toast';
import { Loader2, Menu, X } from 'lucide-react';
import type { Problem as ProblemType, TestResultEvent, FinalVerdictEvent, StatusUpdateEvent } from '../types';

import { TopBar } from '../components/room/TopBar';
import { BottomStatusBar } from '../components/room/BottomStatusBar';
import { ProblemPane } from '../components/room/ProblemPane';
import { EditorWrapper, LANGUAGES } from '../components/room/EditorWrapper';
import { ParticipantsList } from '../components/room/ParticipantsList';
import { OutputPanel } from '../components/room/OutputPanel';
import { motion, AnimatePresence } from 'framer-motion';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { useWebSocket as useSoloSocket } from '../hooks/useWebSocket';

interface WorkspaceProps {
  mode: 'solo' | 'collaboration';
}

export function Workspace({ mode }: WorkspaceProps) {
  const { id, roomId } = useParams<{ id: string; roomId: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [problem, setProblem] = useState<ProblemType | null>(null);
  const [languageId, setLanguageId] = useState(71);
  const [output, setOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [verdict, setVerdict] = useState<string | null>(null);
  
  // Solo state
  const [soloContent, setSoloContent] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  
  // Collab state
  const [roomData, setRoomData] = useState<any>(null);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, { position: any, color: string, username: string }>>({});

  // Mobile layout
  const [showMobileLeft, setShowMobileLeft] = useState(false);
  const [showMobileRight, setShowMobileRight] = useState(false);

  const { toasts, addToast, removeToast } = useToasts();
  const outputScrollRef = useRef<HTMLDivElement>(null);

  // --- COLLABORATION HOOKS ---
  const sendCollabMessageRef = useRef<any>(null);

  const handleCollabEvent = useCallback((lastEvent: any) => {
    if (mode !== 'collaboration') return;
    switch (lastEvent.type) {
      case 'user_joined':
        addToast({ type: 'info', title: 'User Joined', message: `${lastEvent.username} joined` });
        break;
      case 'user_left':
        addToast({ type: 'info', title: 'User Left', message: `${lastEvent.username} left` });
        setRemoteCursors(prev => {
          const next = { ...prev };
          delete next[lastEvent.userId];
          return next;
        });
        break;
      case 'permission_update':
        addToast({
          type: 'info',
          title: 'Permission Updated',
          message: `Edit ${lastEvent.canEdit ? 'enabled' : 'disabled'} for ${lastEvent.targetUserId === user?.id ? 'you' : 'a user'}`,
        });
        break;
      case 'run_result':
        if (lastEvent.status === 'queued') {
          addToast({ type: 'run', title: 'Running', message: `Execution started by ${lastEvent.executedBy === user?.id ? 'you' : 'a participant'}` });
          if (lastEvent.submissionId) sendCollabMessageRef.current?.({ type: 'subscribe_submission', submissionId: lastEvent.submissionId });
          setShowMobileRight(true);
        }
        break;
      case 'submit_result':
        if (lastEvent.verdict === 'judging') {
          addToast({ type: 'info', title: 'Submitted', message: 'Judging code...' });
          if (lastEvent.submissionId) sendCollabMessageRef.current?.({ type: 'subscribe_submission', submissionId: lastEvent.submissionId });
          setShowMobileRight(true);
        } else {
          addToast({
            type: lastEvent.verdict === 'AC' ? 'success' : 'error',
            title: 'Result',
            message: `Verdict: ${lastEvent.verdict} | Time: ${lastEvent.runtime} | Mem: ${lastEvent.memory}`,
          });
        }
        break;
      case 'test_result': {
        const msg = lastEvent as unknown as TestResultEvent;
        setOutput(prev => [...prev, `> Test Case ${msg.testcaseIndex}: ${msg.verdict} ${msg.time ? `(${msg.time}s)` : ''}`]);
        break;
      }
      case 'final_verdict': {
        const msg = lastEvent as unknown as FinalVerdictEvent;
        setVerdict(msg.verdict);
        setIsRunning(false);
        setOutput(prev => [...prev, `\nSystem: ${msg.verdict} (${msg.passedTests}/${msg.totalTests} passes)`]);
        break;
      }
      case 'cursor_update': {
        const msg = lastEvent as any;
        setRemoteCursors(prev => ({
          ...prev,
          [msg.userId]: { position: msg.position, color: msg.color, username: msg.username }
        }));
        break;
      }
      case 'language_change': {
        const msg = lastEvent as any;
        setLanguageId(msg.languageId);
        break;
      }
    }
  }, [mode, addToast, user]);

  const { content: collabContent, isConnected: sharedbConnected, updateContent: setCollabContent } = useCollaboration({
    roomId: mode === 'collaboration' ? roomId || '' : '',
    token: mode === 'collaboration' ? token : null,
  });

  const { isConnected: wsConnected, participants, canEdit: collabCanEdit, sendMessage: sendCollabMessage, setInitialParticipants } = useRoomSocket({
    roomId: mode === 'collaboration' ? roomId || '' : '',
    userId: mode === 'collaboration' ? user?.id || '' : '',
    onMessage: handleCollabEvent
  });

  // --- SOLO HOOKS ---
  const sendSoloMessageRef = useRef<any>(null);

  const handleSoloEvent = useCallback((soloLastMessage: any) => {
    if (mode !== 'solo') return;
    switch (soloLastMessage.type) {
        case 'test_result': {
            const msg = soloLastMessage as TestResultEvent;
            setOutput(prev => [...prev, `> Test Case ${msg.testcaseIndex}: ${msg.verdict} ${msg.time ? `(${msg.time}s)` : ''}`]);
            break;
        }
        case 'final_verdict': {
            const msg = soloLastMessage as FinalVerdictEvent;
            setVerdict(msg.verdict);
            setIsRunning(false);
            setOutput(prev => [...prev, `\n=== Final Verdict: ${msg.verdict} ===`]);
            break;
        }
        case 'status_update': {
            const msg = soloLastMessage as StatusUpdateEvent;
            if (msg.status === 'running') {
                setOutput(prev => [...prev, 'Judging in progress...']);
            }
            break;
        }
    }
  }, [mode]);

  const { isConnected: soloWsConnected, sendMessage: sendSoloMessage } = useSoloSocket(handleSoloEvent);

  useEffect(() => {
    sendCollabMessageRef.current = sendCollabMessage;
    sendSoloMessageRef.current = sendSoloMessage;
  }, [sendCollabMessage, sendSoloMessage]);

  // --- UNIFIED STATE CALCULATIONS ---
  const isHost = mode === 'solo' ? true : roomData?.hostId === user?.id;
  const canEdit = mode === 'solo' ? true : collabCanEdit;
  const content = mode === 'solo' ? soloContent : collabContent;
  const updateContent = mode === 'solo' ? setSoloContent : setCollabContent;
  const isConnected = mode === 'solo' ? soloWsConnected : (sharedbConnected || wsConnected);

  useEffect(() => {
    if (outputScrollRef.current) {
      outputScrollRef.current.scrollTop = outputScrollRef.current.scrollHeight;
    }
  }, [output]);

  // INITIAL LOAD
  useEffect(() => {
    if (mode === 'solo' && id) {
      api.get(`/problems/${id}`).then(res => {
        setProblem(res.data);
        const boilerplate = res.data.halfBoilerplate?.python || '';
        setSoloContent(boilerplate);
      }).catch(err => console.error(err));
    } else if (mode === 'collaboration' && roomId && token && user) {
      api.post(`/api/rooms/${roomId}/join`)
        .catch(err => console.log('Join room note:', err?.response?.data || err.message))
        .finally(() => {
          api.get(`/api/rooms/${roomId}`).then(res => {
            setRoomData(res.data);
            if (res.data.participants) {
              setInitialParticipants(res.data.participants);
            }
            api.get(`/problems/${res.data.problemId}`).then(pRes => {
              setProblem(pRes.data);
              if (!collabContent) {
                const boilerplate = pRes.data.halfBoilerplate?.python || '';
                setCollabContent(boilerplate);
              }
            });
          }).catch(err => console.error('Failed to load room:', err));
        });
    }
  }, [mode, id, roomId, token, user]);

  // BOILERPLATE SYNC (when language changes)
  useEffect(() => {
    if (!problem) return;
    const langName = LANGUAGES.find(l => l.id === languageId)?.name.toLowerCase();
    const key = langName === 'c++' ? 'cpp' : langName;
    if (key && problem.halfBoilerplate?.[key] && isHost) {
      updateContent(problem.halfBoilerplate[key]);
    }
  }, [languageId]);

  // ACTIONS
  const handleStartSession = async () => {
    if (!problem || !user) {
      if (!user) navigate('/login');
      return;
    }
    setIsCreatingRoom(true);
    try {
      const res = await api.post('/api/rooms', { problemId: problem.id, mode: 'interview' });
      navigate(`/room/${res.data.roomId}`);
    } catch (err) {
      console.error('Failed to start session', err);
      addToast({ type: 'error', title: 'Error', message: 'Failed to start collaborative session' });
      setIsCreatingRoom(false);
    }
  };

  const handleRun = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setVerdict(null);
    setOutput(['Running sample tests...']);
    setShowMobileRight(true);

    try {
      if (mode === 'collaboration') {
        if (!roomId) throw new Error('Missing room ID');
        await api.post(`/api/rooms/${roomId}/run`, { languageId });
      } else {
        if (!problem) throw new Error('Missing problem');
        const res = await api.post('/submissions', {
          problemId: problem.id,
          languageId,
          sourceCode: content,
          userId: user?.id || 'user-guest',
          mode: 'run'
        });
        if (soloWsConnected) {
          sendSoloMessage({ type: 'subscribe_submission', submissionId: res.data.id });
        } else {
          setOutput(prev => [...prev, 'Warning: WebSocket not connected. Check console.']);
          setIsRunning(false);
        }
      }
    } catch (e: any) {
      setIsRunning(false);
      setOutput(prev => [...prev, `Error: ${e.response?.data?.error || e.message}`]);
    }
  };

  const handleSubmit = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setVerdict(null);
    setOutput(['Submitting full solution...']);
    setShowMobileRight(true);

    try {
      if (mode === 'collaboration') {
        if (!roomId) throw new Error('Missing room ID');
        await api.post(`/api/rooms/${roomId}/submit`, { languageId });
      } else {
        if (!problem) throw new Error('Missing problem');
        const res = await api.post('/submissions', {
          problemId: problem.id,
          languageId,
          sourceCode: content,
          userId: user?.id || 'user-guest',
          mode: 'submit'
        });
        if (soloWsConnected) {
          sendSoloMessage({ type: 'subscribe_submission', submissionId: res.data.id });
        } else {
          setOutput(prev => [...prev, 'Warning: WebSocket not connected. Check console.']);
          setIsRunning(false);
        }
      }
    } catch (e: any) {
      setIsRunning(false);
      setOutput(prev => [...prev, `Error: ${e.response?.data?.error || e.message}`]);
    }
  };

  const handleLanguageChange = (id: number) => {
    setLanguageId(id);
    if (mode === 'collaboration' && canEdit && user) {
      sendCollabMessage({
        type: 'language_change',
        languageId: id
      });
    }
  };

  const getUserColor = (id: string) => {
    const colors = ['#e24a6a', '#3bb77e', '#ffd166', '#5b3e7a', '#007acc', '#d2527f'];
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const handleCursorChange = (position: any) => {
    if (mode !== 'collaboration' || !user) return;
    sendCollabMessage({
      type: 'cursor_update',
      position,
      color: getUserColor(user.id),
      username: user.username
    });
  };

  const handleTogglePermission = async (targetUserId: string, currentCanEdit: boolean) => {
    if (mode !== 'collaboration' || !roomId) return;
    try {
      await api.patch(`/api/rooms/${roomId}/permissions`, { targetUserId, canEdit: !currentCanEdit });
      const res = await api.get(`/api/rooms/${roomId}`);
      if (res.data.participants) {
        setInitialParticipants(res.data.participants);
      }
    } catch (e: any) {
      addToast({ type: 'error', title: 'Error', message: e.response?.data?.error || 'Failed' });
    }
  };

  if ((mode === 'collaboration' && (!roomData || !problem || !user)) || (mode === 'solo' && !problem)) {
    return (
      <div className="min-h-screen bg-base flex flex-col items-center justify-center text-text-main gap-4">
        <Loader2 className="animate-spin w-8 h-8 text-primary" />
        <p className="text-sm text-muted animate-pulse">Entering workspace...</p>
      </div>
    );
  }

  const currentLangName = LANGUAGES.find(l => l.id === languageId)?.name || 'Python';

  return (
    <div className="h-screen w-full bg-base text-text-main flex flex-col overflow-hidden font-sans">
      
      {/* 1. Top Navigation Bar */}
      <TopBar 
        problemName={problem!.name}
        difficulty={problem!.difficulty}
        isHost={isHost}
        roomId={mode === 'collaboration' ? roomId || '' : undefined}
        isRunning={isRunning}
        canEdit={canEdit}
        onRun={handleRun}
        onSubmit={handleSubmit}
        onStartSession={mode === 'solo' ? handleStartSession : undefined}
        isCreatingRoom={isCreatingRoom}
      />

      {/* Mobile Overlay triggers */}
      <div className="xl:hidden h-10 bg-surface border-b border-border flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
        <button onClick={() => setShowMobileLeft(true)} className="flex items-center gap-2 text-primary-hover text-sm font-medium">
          <Menu className="w-4 h-4" /> Problem Details
        </button>
        <button onClick={() => setShowMobileRight(true)} className="flex items-center gap-2 text-accent text-sm font-medium">
          Output / Users <Menu className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Main Workspace Area */}
      <div className="flex-1 overflow-hidden relative flex flex-col xl:block">
        
        <PanelGroup orientation="horizontal" className="hidden xl:flex h-full w-full">
          {/* Left Pane */}
          <Panel defaultSize={35} minSize={20} className="flex flex-col h-full bg-base transition-none z-10 min-w-0">
            <div className="flex-1 overflow-hidden pb-4">
               <ProblemPane problem={problem!} />
            </div>
          </Panel>

          <PanelResizeHandle className="w-1.5 bg-border hover:bg-primary/50 cursor-col-resize z-20 transition-colors flex items-center justify-center shrink-0 border-x border-border/10">
             <div className="w-0.5 h-8 bg-muted/30 rounded-full" />
          </PanelResizeHandle>

          {/* Right Pane */}
          <Panel minSize={30} className="flex flex-col h-full bg-base transition-none z-10 w-full min-w-0">
            <PanelGroup orientation="vertical">
              {/* Top Right: Editor */}
              <Panel defaultSize={65} minSize={20} className="flex flex-col min-h-0 relative shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                <EditorWrapper 
                  content={content}
                  languageId={languageId}
                  canEdit={canEdit}
                  onChange={updateContent}
                  onLanguageChange={handleLanguageChange}
                  onCursorChange={handleCursorChange}
                  remoteCursors={mode === 'collaboration' ? remoteCursors : {}}
                />
              </Panel>

              <PanelResizeHandle className="h-1.5 bg-border hover:bg-primary/50 cursor-row-resize z-20 transition-colors flex items-center justify-center shrink-0 border-y border-border/10">
                 <div className="w-8 h-0.5 bg-muted/30 rounded-full" />
              </PanelResizeHandle>

              {/* Bottom Right: Output */}
              <Panel defaultSize={35} minSize={10} className="flex flex-col min-h-0 bg-surface">
                {mode === 'collaboration' ? (
                  <div className="flex w-full h-full">
                    <div className="w-2/3 border-r border-border h-full flex flex-col min-h-0">
                      <OutputPanel 
                        output={output}
                        verdict={verdict}
                        isRunning={isRunning}
                        scrollRef={outputScrollRef}
                      />
                    </div>
                    <div className="w-1/3 h-full flex flex-col min-h-0 bg-base">
                      <ParticipantsList 
                        participants={participants}
                        currentUserId={user!.id}
                        isHost={isHost}
                        onTogglePermission={handleTogglePermission}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col min-h-0 bg-base">
                    <OutputPanel 
                      output={output}
                      verdict={verdict}
                      isRunning={isRunning}
                      scrollRef={outputScrollRef}
                    />
                  </div>
                )}
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>

        {/* Bottom panel for Solo Mode Output (Mobile) */}
        {mode === 'solo' && (
           <div className="absolute bottom-0 inset-x-0 h-1/3 xl:hidden border-t border-border z-10 bg-base shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
               <OutputPanel 
                output={output}
                verdict={verdict}
                isRunning={isRunning}
                scrollRef={outputScrollRef}
              />
           </div>
        )}

        {/* --- Mobile Overlays --- */}
        <AnimatePresence>
          {showMobileLeft && (
             <motion.div 
               initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
               transition={{ type: 'spring', damping: 25, stiffness: 200 }}
               className="absolute inset-y-0 left-0 w-4/5 max-w-sm bg-base z-30 shadow-2xl xl:hidden border-r border-border flex flex-col"
             >
               <button onClick={() => setShowMobileLeft(false)} className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 transition-all">
                 <X className="w-5 h-5 text-muted" />
               </button>
               <div className="flex-1 overflow-hidden">
                  <ProblemPane problem={problem!} />
               </div>
             </motion.div>
          )}

          {showMobileRight && (
             <motion.div 
               initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
               transition={{ type: 'spring', damping: 25, stiffness: 200 }}
               className="absolute inset-x-0 bottom-0 h-4/5 bg-base z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] xl:hidden border-t border-border flex flex-col rounded-t-2xl overflow-hidden"
             >
               <div className="flex justify-center p-2 cursor-grab active:cursor-grabbing bg-surface border-b border-border shrink-0" onClick={() => setShowMobileRight(false)}>
                 <div className="w-12 h-1.5 bg-border rounded-full" />
               </div>
               <div className="flex-1 overflow-y-auto">
                 <div className={mode === 'collaboration' ? 'h-[40vh] border-b border-border' : 'h-full'}>
                   <OutputPanel output={output} verdict={verdict} isRunning={isRunning} scrollRef={outputScrollRef} />
                 </div>
                 {mode === 'collaboration' && (
                    <div className="h-[40vh]">
                      <ParticipantsList participants={participants} currentUserId={user!.id} isHost={isHost} onTogglePermission={handleTogglePermission} />
                    </div>
                 )}
               </div>
             </motion.div>
          )}

          {(showMobileLeft || showMobileRight) && (
             <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               onClick={() => { setShowMobileLeft(false); setShowMobileRight(false); }}
               className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 xl:hidden"
             />
          )}
        </AnimatePresence>

      </div>

      {/* 3. Bottom Status Bar */}
      <BottomStatusBar 
        isConnected={isConnected}
        canEdit={canEdit}
        languageName={currentLangName}
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
