import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Problem } from '../types';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Code2, Loader2, LogIn, Network, BrainCircuit, TrendingUp } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { motion, useScroll, useTransform } from 'framer-motion';
import clsx from 'clsx';

export function Home() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinError, setJoinError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  useEffect(() => {
    api.get('/problems')
      .then((res) => setProblems(res.data))
      .catch((err) => console.error(err));
  }, []);

  const handleJoinRoom = async () => {
    const trimmed = joinRoomId.trim();
    if (!trimmed) return;
    if (!user) {
      navigate('/login');
      return;
    }
    setJoinError('');
    setIsJoining(true);
    try {
      await api.post(`/api/rooms/${trimmed}/join`);
      navigate(`/room/${trimmed}`);
    } catch (err: any) {
      setJoinError(err.response?.data?.error || 'Room not found or unable to join');
      setIsJoining(false);
    }
  };

  const scrollToChallenges = () => {
    document.getElementById('challenges-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-base text-text-main selection:bg-primary/30 font-sans overflow-x-hidden relative">
      {/* Background ambient glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full opacity-20 bg-primary blur-[120px]" />
        <div className="absolute top-[20%] right-[-10%] w-[30%] h-[50%] rounded-full opacity-10 bg-accent blur-[150px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[40%] rounded-full opacity-15 bg-primary-hover blur-[120px]" />
      </div>

      <header className="border-b border-border/50 bg-base/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-primary to-primary-hover p-2 rounded-xl shadow-glow">
              <Code2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">Codera</span>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4 text-sm font-medium">
                <span className="text-muted hidden sm:inline">Welcome, <span className="text-white font-semibold">{user.username}</span></span>
                <button 
                  onClick={logout}
                  className="px-4 py-2 hover:bg-elevated rounded-lg transition-colors border border-transparent hover:border-border text-muted hover:text-white"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button 
                onClick={() => navigate('/login')}
                className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors shadow-glow hover:scale-105 active:scale-95 duration-200"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 flex flex-col items-center">
        
        {/* --- HERO SECTION --- */}
        <section className="container mx-auto px-6 min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row items-center justify-center gap-12 pt-10 pb-20">
          
          {/* Left Text */}
          <motion.div 
            style={{ y: heroY, opacity: heroOpacity }}
            className="flex-1 max-w-2xl text-center lg:text-left z-20"
          >
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="text-5xl md:text-7xl font-extrabold mb-6 text-white tracking-tight leading-[1.1]"
            >
              Code. <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-hover to-accent">Collaborate.</span> Conquer.
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
              className="text-muted text-xl md:text-2xl mb-10 font-medium max-w-xl mx-auto lg:mx-0"
            >
              Real-time collaborative coding built for competitive programmers.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="flex justify-center lg:justify-start gap-4"
            >
              <button 
                onClick={scrollToChallenges}
                className="relative group px-8 py-4 bg-primary text-white font-bold rounded-xl shadow-[0_0_20px_rgba(91,62,122,0.6)] hover:bg-primary-hover transition-all hover:scale-105 active:scale-95 duration-200 overflow-hidden"
              >
                <div className="absolute inset-0 border-2 border-accent/0 group-hover:border-accent/40 rounded-xl transition-colors duration-300" />
                <span className="relative z-10 flex items-center gap-2">Start Coding <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></span>
              </button>
            </motion.div>
          </motion.div>

          {/* Right Visual (3D Isometric Editor) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, rotateX: 20, rotateY: -15, rotateZ: 5 }}
            animate={{ opacity: 1, scale: 1, rotateX: 10, rotateY: -20, rotateZ: 3 }}
            transition={{ duration: 1.2, delay: 0.3, type: "spring", stiffness: 50 }}
            className="flex-1 w-full max-w-[600px] perspective-[2000px] z-10 hidden md:block"
          >
            <div className="bg-elevated/80 backdrop-blur-md border border-border/50 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.6),0_0_40px_rgba(114,79,152,0.3)] overflow-hidden flex flex-col h-[400px] relative transform-style-3d">
              {/* Window Header */}
              <div className="h-10 border-b border-border/50 bg-surface/80 flex items-center px-4 gap-2 shrink-0">
                <div className="w-3 h-3 rounded-full bg-danger/80" />
                <div className="w-3 h-3 rounded-full bg-accent/80" />
                <div className="w-3 h-3 rounded-full bg-success/80" />
                <div className="ml-4 text-xs font-mono text-muted">binary_search.cpp</div>
              </div>
              
              {/* Code Content */}
              <div className="p-6 font-mono text-sm leading-relaxed overflow-hidden relative h-full">
<pre>
<span className="text-primary-hover">#include</span> <span className="text-success">&lt;iostream&gt;</span>
<span className="text-primary-hover">#include</span> <span className="text-success">&lt;vector&gt;</span>

<span className="text-accent">int</span> binarySearch(<span className="text-primary">const</span> std::vector&lt;<span className="text-accent">int</span>&gt;&amp; arr, <span className="text-accent">int</span> target) {'{'}
  <span className="text-muted/60">// Two pointers initialization</span>
  <span className="text-accent">int</span> left = <span className="text-accent-hover">0</span>;
  <span className="text-accent">int</span> right = arr.size() - <span className="text-accent-hover">1</span>;

  <span className="text-primary">while</span> (left &lt;= right) {'{'}
    <span className="text-accent">int</span> mid = left + (right - left) / <span className="text-accent-hover">2</span>;

    <span className="text-primary">if</span> (arr[mid] == target)
      <span className="text-primary">return</span> mid;
    <span className="text-primary">if</span> (arr[mid] &lt; target)
      left = mid + <span className="text-accent-hover">1</span>;
    <span className="text-primary">else</span>
      right = mid - <span className="text-accent-hover">1</span>;
  {'}'}
  <span className="text-primary">return</span> <span className="text-danger">-1</span>;
{'}'}
</pre>
                
                {/* Animated Cursors */}
                <motion.div 
                  animate={{ 
                    x: [100, 160, 220, 160], 
                    y: [120, 150, 150, 120] 
                  }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  className="absolute top-0 left-0 flex flex-col items-center pointer-events-none"
                >
                  <motion.div className="w-0.5 h-4 bg-danger" />
                  <div className="mt-1 px-2 py-0.5 rounded-full bg-danger text-[9px] font-bold text-white shadow-lg whitespace-nowrap">
                    Alice
                  </div>
                </motion.div>

                <motion.div 
                  animate={{ 
                    x: [300, 320, 320, 280], 
                    y: [220, 220, 260, 260] 
                  }}
                  transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 1 }}
                  className="absolute top-0 left-0 flex flex-col items-center pointer-events-none"
                >
                  <motion.div className="w-0.5 h-4 bg-[#8b75a6]" />
                  <div className="mt-1 px-2 py-0.5 rounded-full bg-[#8b75a6] text-[9px] font-bold text-white shadow-lg whitespace-nowrap">
                    Bob
                  </div>
                </motion.div>
                
              </div>
            </div>
          </motion.div>
        </section>

        {/* --- FEATURES SECTION --- */}
        <section className="w-full py-24 bg-surface/30 border-y border-border/30 relative z-20">
          <div className="container mx-auto px-6 max-w-6xl">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.2 }
                }
              }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              
              {/* Feature 1 */}
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 30 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
                }}
                className="bg-elevated/65 backdrop-blur-md border border-primary/20 rounded-2xl p-8 hover:border-primary/50 transition-colors duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative group overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-14 h-14 rounded-xl bg-surface border border-border/50 flex items-center justify-center mb-6 group-hover:shadow-[0_0_15px_rgba(255,209,102,0.3)] transition-shadow">
                  <Network className="w-7 h-7 text-accent" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Real-Time Collaboration</h3>
                <p className="text-muted leading-relaxed text-sm">
                  Collaborate instantly with synchronized cursors and shared execution. Pair program with low latency like never before.
                </p>
              </motion.div>

              {/* Feature 2 */}
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 30 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
                }}
                className="bg-elevated/65 backdrop-blur-md border border-primary/20 rounded-2xl p-8 hover:border-primary/50 transition-colors duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative group transform md:translate-y-8"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-14 h-14 rounded-xl bg-surface border border-border/50 flex items-center justify-center mb-6 group-hover:shadow-[0_0_15px_rgba(114,79,152,0.5)] transition-shadow">
                  <BrainCircuit className="w-7 h-7 text-primary-hover" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">AI Code Review</h3>
                <p className="text-muted leading-relaxed text-sm">
                  Get intelligent feedback and optimization insights instantly. Our AI understands your approach and helps you improve.
                </p>
              </motion.div>

              {/* Feature 3 */}
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 30 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
                }}
                className="bg-elevated/65 backdrop-blur-md border border-primary/20 rounded-2xl p-8 hover:border-primary/50 transition-colors duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-14 h-14 rounded-xl bg-surface border border-border/50 flex items-center justify-center mb-6 group-hover:shadow-[0_0_15px_rgba(59,183,126,0.3)] transition-shadow">
                  <TrendingUp className="w-7 h-7 text-success" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Performance Analytics</h3>
                <p className="text-muted leading-relaxed text-sm">
                  Track runtime, memory, and ranking trends visually. Optimize your solutions to hit the absolute peak performance.
                </p>
              </motion.div>

            </motion.div>
          </div>
        </section>

        {/* --- CHALLENGES & ROOM SECTION --- */}
        <section id="challenges-section" className="container mx-auto px-6 py-24 max-w-7xl z-20">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            
            {/* Left Col: Join Room & Intro */}
            <div className="col-span-1 lg:col-span-1 flex flex-col gap-8">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="text-3xl font-extrabold mb-4 text-white tracking-tight">
                  The Arena
                </h2>
                <p className="text-muted">
                  Select a challenge from the list, or quickly jump into a teammate's active session.
                </p>
              </motion.div>

              {/* Join Room Card */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="bg-surface/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6"
              >
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-white">
                  <LogIn className="w-4 h-4 text-accent" /> Join an Existing Room
                </h3>
                <div className="flex flex-col gap-3">
                  <input
                    type="text"
                    value={joinRoomId}
                    onChange={(e) => { setJoinRoomId(e.target.value); setJoinError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                    placeholder="Enter Room ID..."
                    className="w-full px-4 py-2.5 bg-base/80 border border-border rounded-xl text-white placeholder:text-muted/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors text-sm"
                  />
                  <button
                    onClick={handleJoinRoom}
                    disabled={!joinRoomId.trim() || isJoining}
                    className="w-full px-6 py-2.5 bg-accent hover:bg-accent-hover text-base text-black font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-glow hover:scale-[1.02] active:scale-95 duration-200"
                  >
                    {isJoining ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Joining...</>
                    ) : (
                      <>Enter Room <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </div>
                {joinError && (
                  <p className="mt-3 text-danger text-sm font-medium text-center">{joinError}</p>
                )}
              </motion.div>
            </div>

            {/* Right Col: Problem Grid */}
            <div className="col-span-1 lg:col-span-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {problems.map((problem, idx) => (
                  <motion.div 
                    key={problem.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: idx * 0.05 }}
                    onClick={() => navigate(`/problems/${problem.id}`)}
                    className="group relative bg-surface/50 border border-border/50 rounded-2xl p-5 hover:bg-elevated cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-soft hover:border-primary/30"
                  >
                    <div className="relative flex flex-col h-full">
                      <div className="flex justify-between items-start mb-3">
                        <span className={clsx(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          problem.difficulty === 'Easy' ? 'bg-success/15 text-success' :
                          problem.difficulty === 'Medium' ? 'bg-accent/15 text-accent' :
                          'bg-danger/15 text-danger'
                        )}>
                          {problem.difficulty}
                        </span>
                        <div className="p-1.5 rounded-lg bg-base/50 border border-border/50 text-muted group-hover:text-primary transition-colors">
                          <Code2 className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      
                      <h2 className="text-lg font-bold mb-2 text-white group-hover:text-primary-hover transition-colors">
                        {problem.name}
                      </h2>
                      
                      <p className="text-muted text-sm mb-4 flex-1 line-clamp-2 leading-relaxed">
                        {problem.description.substring(0, 100)}...
                      </p>
                      
                      <div className="flex items-center pt-3 border-t border-border/30 mt-auto">
                        <span className="text-xs font-semibold text-muted group-hover:text-primary transition-colors flex items-center gap-1">
                          Solve &rarr;
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

          </div>
        </section>

      </main>
    </div>
  );
}
