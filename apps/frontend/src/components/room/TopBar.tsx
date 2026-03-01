import { Play, Send, Loader2, ChevronLeft, Crown, Check, Copy } from 'lucide-react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { useState } from 'react';

interface TopBarProps {
  problemName: string;
  difficulty: string;
  isHost: boolean;
  roomId?: string;
  isRunning: boolean;
  canEdit: boolean;
  onRun: () => void;
  onSubmit: () => void;
  onStartSession?: () => void;
  isCreatingRoom?: boolean;
}

export function TopBar({
  problemName,
  difficulty,
  isHost,
  roomId,
  isRunning,
  canEdit,
  onRun,
  onSubmit,
  onStartSession,
  isCreatingRoom,
}: TopBarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyRoomId = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="h-14 bg-surface border-b border-white/5 flex items-center px-4 justify-between shrink-0 z-20 shadow-sm">
      <div className="flex items-center gap-4">
        <Link to="/" className="p-2 hover:bg-elevated rounded-lg transition-colors group">
          <ChevronLeft className="w-5 h-5 text-muted group-hover:text-text-main transition-colors" />
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="font-semibold text-sm md:text-[#ffffff] text-[#ffffff]">{problemName}</h1>
          <span className={clsx(
            "px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide",
            difficulty === 'Easy' ? 'bg-success/20 text-success' :
            difficulty === 'Medium' ? 'bg-accent/20 text-accent' : 'bg-danger/20 text-danger'
          )}>
            {difficulty}
          </span>
          {isHost && (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/20 text-primary-hover text-xs font-semibold tracking-wide">
              <Crown className="w-3.5 h-3.5" /> Host
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Share/Room ID */}
        {roomId && (
          <button
            onClick={handleCopyRoomId}
            className="flex items-center gap-2 px-3 py-1.5 bg-elevated hover:bg-white/5 rounded-md text-xs text-muted transition-colors border border-border"
            title="Copy Room ID"
          >
            {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
            <span className="hidden md:inline font-mono text-text-main/80">{roomId.slice(0, 8)}...</span>
          </button>
        )}

        {/* Start Session (solo mode) */}
        {onStartSession && (
          <button
            onClick={onStartSession}
            disabled={isCreatingRoom || isRunning}
            className="active:scale-[0.98] flex items-center gap-2 px-4 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-md text-sm font-medium transition-all disabled:opacity-50 shadow-glow"
          >
            {isCreatingRoom ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
            <span className="hidden sm:inline">Collaborate</span>
          </button>
        )}

        {/* Run */}
        <button
          onClick={onRun}
          disabled={isRunning || !canEdit}
          className="active:scale-[0.98] flex items-center gap-2 px-4 py-1.5 bg-elevated hover:bg-white/10 text-text-main rounded-md text-sm font-medium transition-all disabled:opacity-50 border border-border"
        >
          {isRunning ? <Loader2 className="w-4 h-4 animate-spin text-muted" /> : <Play className="w-4 h-4 text-accent" />}
          <span className="hidden sm:inline">Run</span>
        </button>

        {/* Submit (host only) */}
        {isHost && (
          <button
            onClick={onSubmit}
            disabled={isRunning}
            className="active:scale-[0.98] flex items-center gap-2 px-4 py-1.5 bg-primary hover:bg-primary-hover text-text-main rounded-md text-sm font-medium transition-all disabled:opacity-50 shadow-glow"
          >
            {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span className="hidden sm:inline">Submit</span>
          </button>
        )}
      </div>
    </header>
  );
}
