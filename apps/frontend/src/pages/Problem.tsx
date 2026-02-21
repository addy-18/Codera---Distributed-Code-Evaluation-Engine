import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import { api } from '../lib/api';
import type { Problem as ProblemType, TestResultEvent, FinalVerdictEvent, StatusUpdateEvent } from '../types';
import { useWebSocket } from '../hooks/useWebSocket';
import { Play, Send, Loader2, Terminal, ChevronLeft } from 'lucide-react';
import { clsx } from 'clsx';

const LANGUAGES = [
    { id: 71, name: 'Python', monaco: 'python' },
    { id: 63, name: 'JavaScript', monaco: 'javascript' },
    { id: 54, name: 'C++', monaco: 'cpp' },
    { id: 62, name: 'Java', monaco: 'java' },
];

export function Problem() {
    const { id } = useParams<{ id: string }>();
    const [problem, setProblem] = useState<ProblemType | null>(null);
    const [code, setCode] = useState('');
    const [languageId, setLanguageId] = useState(71);
    const [output, setOutput] = useState<string[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [verdict, setVerdict] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'description' | 'submissions'>('description');
    
    const { isConnected, sendMessage, lastMessage } = useWebSocket();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll output
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [output]);

    // Fetch problem
    useEffect(() => {
        if (!id) return;
        api.get(`/problems/${id}`).then(res => {
            setProblem(res.data);
            const boilerplate = res.data.halfBoilerplate?.python || '';
            setCode(boilerplate);
        }).catch(err => {
            console.error(err);
            setProblem(null); 
        });
    }, [id]);

    // Boilerplate handling
    useEffect(() => {
        if (!problem) return;
         const langName = LANGUAGES.find(l => l.id === languageId)?.name.toLowerCase();
         // simple mapping
         const key = langName === 'c++' ? 'cpp' : langName;
         if (key && problem.halfBoilerplate?.[key]) {
             setCode(problem.halfBoilerplate[key]);
         }
    }, [languageId, problem]);

    // WebSocket Messages
    useEffect(() => {
        if (!lastMessage) return;
        
        switch (lastMessage.type) {
            case 'test_result': {
                const msg = lastMessage as TestResultEvent;
                setOutput(prev => [...prev, `> Test Case ${msg.testcaseIndex}: ${msg.verdict} ${msg.time ? `(${msg.time}s)` : ''}`]);
                break;
            }
            case 'final_verdict': {
                const msg = lastMessage as FinalVerdictEvent;
                setVerdict(msg.verdict);
                setIsRunning(false);
                setOutput(prev => [...prev, `\n=== Final Verdict: ${msg.verdict} ===`]);
                break;
            }
            case 'status_update': {
                const msg = lastMessage as StatusUpdateEvent;
                if (msg.status === 'running') {
                    setOutput(prev => [...prev, 'Judging in progress...']);
                }
                break;
            }
        }
    }, [lastMessage]);

    const handleRun = async (mode: 'run' | 'submit') => {
        if (!problem || isRunning) return;
        
        setIsRunning(true);
        setVerdict(null);
        setOutput([mode === 'run' ? 'Running Sample Tests...' : 'Submitting Solution...']);
        
        try {
            const res = await api.post('/submissions', {
                problemId: problem.id,
                languageId,
                sourceCode: code,
                userId: 'user-guest', // hardcoded
                mode
            });
            
            const submissionId = res.data.id;
            
            if (isConnected) {
                sendMessage({ type: 'auth', userId: 'user-guest' });
                sendMessage({ type: 'subscribe_submission', submissionId });
            } else {
                setOutput(prev => [...prev, 'Warning: WebSocket not connected. Check console.']);
                setIsRunning(false); 
            }
        } catch (e: any) {
            console.error(e);
            setIsRunning(false);
            setOutput(prev => [...prev, `Error: ${e.response?.data?.error || e.message}`]);
        }
    };

    if (!problem) return (
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white">
            <Loader2 className="animate-spin w-8 h-8 text-blue-500" />
        </div>
    );

    return (
        <div className="h-screen bg-neutral-950 text-white flex flex-col overflow-hidden">
             {/* Header */}
             <header className="h-14 border-b border-white/10 bg-black/20 backdrop-blur flex items-center px-4 justify-between shrink-0 z-10">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <ChevronLeft className="w-5 h-5 text-gray-400" />
                    </Link>
                    <div className="flex items-center gap-3">
                         <h1 className="font-semibold text-sm md:text-base">{problem.name}</h1>
                         <span className={clsx(
                             "px-2 py-0.5 rounded text-xs font-medium",
                             problem.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' :
                             problem.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                         )}>{problem.difficulty}</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <button 
                       onClick={() => handleRun('run')}
                       disabled={isRunning}
                       className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-gray-200 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        <Play className="w-4 h-4" /> <span className="hidden sm:inline">Run</span>
                    </button>
                    <button 
                       onClick={() => handleRun('submit')}
                       disabled={isRunning}
                       className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        <span className="hidden sm:inline">Submit</span>
                    </button>
                </div>
             </header>
             
             {/* Content */}
             <div className="flex-1 flex overflow-hidden">
                {/* Left Panel: Description */}
                <div className="w-1/2 border-r border-white/10 flex flex-col bg-neutral-900/50">
                    <div className="border-b border-white/10 flex">
                        <button 
                           onClick={() => setActiveTab('description')}
                           className={clsx("px-6 py-3 text-sm font-medium border-b-2 transition-colors", activeTab === 'description' ? "border-blue-500 text-blue-400 bg-white/5" : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5")}
                        >
                            Description
                        </button>
                        <button 
                           onClick={() => setActiveTab('submissions')}
                           className={clsx("px-6 py-3 text-sm font-medium border-b-2 transition-colors", activeTab === 'submissions' ? "border-blue-500 text-blue-400 bg-white/5" : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5")}
                        >
                            Submissions
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 prose prose-invert prose-sm max-w-none">
                        {activeTab === 'description' ? (
                            <ReactMarkdown>{problem.description}</ReactMarkdown>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <p>No previous submissions found.</p>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Right Panel: Editor & Terminal */}
                <div className="w-1/2 flex flex-col bg-[#1e1e1e]">
                    <div className="h-10 bg-[#1e1e1e] border-b border-white/5 flex items-center justify-between px-4 shrink-0">
                        <select 
                           value={languageId}
                           onChange={(e) => setLanguageId(Number(e.target.value))}
                           className="bg-neutral-800 text-gray-300 text-xs px-2 py-1 rounded border border-white/10 focus:outline-none cursor-pointer"
                        >
                            {LANGUAGES.map(lang => (
                                <option key={lang.id} value={lang.id}>{lang.name}</option>
                            ))}
                        </select>
                         <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-semibold text-gray-500">
                             {isConnected ? <span className="text-green-500 flex items-center gap-1">Online <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"/></span> : <span className="text-red-500 flex items-center gap-1">Offline <span className="w-1.5 h-1.5 rounded-full bg-red-500"/></span>}
                         </div>
                    </div>
                    
                    <div className="flex-1 relative">
                        <Editor
                            height="100%"
                            language={LANGUAGES.find(l => l.id === languageId)?.monaco || 'python'}
                            theme="vs-dark"
                            value={code}
                            onChange={(value) => setCode(value || '')}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 13,
                                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                automaticLayout: true,
                                scrollBeyondLastLine: false,
                                padding: { top: 16, bottom: 16 }
                            }}
                        />
                    </div>
                    
                    {/* Terminal / Output */}
                    <div className="h-1/3 min-h-[150px] border-t border-white/10 bg-neutral-900 flex flex-col shrink-0">
                         <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between bg-neutral-900 shrink-0">
                             <div className="flex items-center gap-2 text-gray-400 text-xs font-medium uppercase tracking-wider">
                                 <Terminal className="w-3.5 h-3.5" /> Console Output
                             </div>
                             {verdict && (
                                 <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded border", 
                                     verdict === 'AC' ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                                 )}>
                                     {verdict}
                                 </span>
                             )}
                         </div>
                         <div className="flex-1 overflow-y-auto p-4 font-mono text-sm text-gray-300 space-y-1" ref={scrollRef}>
                             {output.length === 0 && <span className="text-gray-600 italic text-xs">Waiting for execution...</span>}
                             {output.map((line, i) => (
                                 <div key={i} className="break-words whitespace-pre-wrap">{line}</div>
                             ))}
                         </div>
                    </div>
                </div>
             </div>
        </div>
    );
}
