import { useNavigate } from "react-router-dom"
import Header from '../assets/Header'
import '../assets/home.css'

function HomeBody() { // This stupid function took an embarrassingly long time to make i hate web dev
    let navigate = useNavigate();
    const changePage = () => {
        let path = './Briefing';
        navigate(path);
    }
    return (
        <>
        <Header />
        <main>
        <h1> BULLISH! </h1>
        <h2> A trading game </h2>
        {/*<a href='./Briefing' class="link"> [ The Briefing ] </a>*/}
        <button onClick={changePage} className="link"> [ The Briefing ] </button>
        <p>
        A WHACK project brought to you by the BULLISH! team. <br />
        Bullish - We're always up. <br /> <br />
        </p>
        </main>
        </>
    );
}

export default HomeBody;
