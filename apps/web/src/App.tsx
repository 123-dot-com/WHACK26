import { Routes, Route } from 'react-router-dom'
import Header from './assets/Header'
import Home from './pages/Home'
import Briefing from './pages/Briefing'


function App() {
    return (
        <>
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/Briefing" element={<Briefing />} />
        </Routes>
        </>
    );
}

export default App;
