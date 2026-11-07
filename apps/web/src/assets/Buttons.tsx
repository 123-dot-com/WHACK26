import {Routes, Route, useNavigate} from 'react-router-dom';

function BriefButton() {
    const navigate = useNavigate();
    return (
        <button onClick={navigate('./Briefing')}> [ The Brief ] </button>
    );
}
