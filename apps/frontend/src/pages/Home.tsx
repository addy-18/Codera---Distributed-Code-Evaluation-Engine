import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Problem } from '../types';
import { Link } from 'react-router-dom';
import { ArrowRight, Code2 } from 'lucide-react';

export function Home() {
  const [problems, setProblems] = useState<Problem[]>([]);

  useEffect(() => {
    api.get('/problems')
      .then((res) => setProblems(res.data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-white selection:bg-blue-500/30">
        <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
           <div className="container mx-auto px-6 h-16 flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <div className="bg-blue-600 p-2 rounded-lg">
                    <Code2 className="w-5 h-5 text-white" />
                 </div>
                 <span className="font-bold text-xl tracking-tight">Codera</span>
              </div>
           </div>
        </header>

        <main className="container mx-auto px-6 py-12">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Problems</h1>
            <p className="text-gray-400 mb-10 text-lg">Master algorithms and data structures.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {problems.map((problem) => (
                    <Link key={problem.id} to={`/problem/${problem.id}`} className="group relative bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/10">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative">
                            <div className="flex justify-between items-start mb-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    problem.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' :
                                    problem.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                    'bg-red-500/20 text-red-400'
                                }`}>
                                    {problem.difficulty}
                                </span>
                            </div>
                            <h2 className="text-xl font-semibold mb-2 group-hover:text-blue-400 transition-colors">{problem.name}</h2>
                            <p className="text-gray-400 line-clamp-2 text-sm mb-6">
                                {problem.description.substring(0, 100)}...
                            </p>
                            <div className="flex items-center text-sm text-gray-500 group-hover:text-gray-300 transition-colors">
                                Solve Problem <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </main>
    </div>
  );
}
