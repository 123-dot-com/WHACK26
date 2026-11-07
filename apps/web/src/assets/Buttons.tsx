import { useNavigate } from 'react-router-dom';

export default function BriefButton() {
    const navigate = useNavigate();
    return (
        <button onClick={() => navigate('./Briefing')}> [ The Brief ] </button>
    );
}
