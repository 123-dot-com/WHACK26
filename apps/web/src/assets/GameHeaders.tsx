import './header.css'

function GameHeaders() {
    return (
        <header>
        <div className="logo"> <a href="./">BULLISH!</a></div>
        <nav>
        <div class="links">
        <a href="./Briefing">Briefing</a>
        <a href="./Bank">Bank</a>
        <a href="./Market">Market</a>
        <a href="./Portfolio">Portfolio</a>
        <a href="./Arbitrage">Arbitrage</a>
        </div>
        </nav>
        </header>
    );
}
export default GameHeaders;
