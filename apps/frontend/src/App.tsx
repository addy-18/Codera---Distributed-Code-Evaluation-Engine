import { Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { Problem } from './pages/Problem';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/problem/:id" element={<Problem />} />
    </Routes>
  );
}

export default App;
