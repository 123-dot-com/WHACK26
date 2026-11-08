import { getNews } from "../api/client";
import ChibiSprite from "../components/pixel/ChibiSprite";
import PixelIcon from "../components/pixel/PixelIcon";
import { useGame } from "../hooks/game-context";
import { useGameResource } from "../hooks/use-game-resource";
import { money } from "../lib/format";

export default function Briefing() {
  const { game } = useGame();
  const news = useGameResource(getNews);
  if (!game) return null;
  return <div className="news-feed"><div className="news-feed__intro"><ChibiSprite animation="phone" size={84} />
    <div><span className="eyebrow">YOUR MORNING MARKET MESSAGES</span><h1>Stock announcements</h1><span className="muted">Day {game.day} · BULLISH WIRE</span></div></div>
    {news.loading ? <p role="status">Loading today's news…</p> : news.error ?
      <p role="alert">{news.error} <button onClick={news.reload}>Retry news</button></p> : news.data && <>
      <article className="news-message"><div className="news-message__sender"><PixelIcon name="newspaper" /><strong>Market announcement</strong><span>now</span></div>
        <span className="tag">{news.data.focusStockId}</span><h2>{news.data.headline}</h2>
        <p>{game.day === 1 ? "A major partnership puts Nova AI in the spotlight. Will the crowd buy the story?" :
          game.day === 2 ? "AI is the talk of the market. Momentum can bring in the FOMO crowd." :
          "A forecast cut has investors paying attention. Yesterday's hype can turn quickly."}</p></article>
      <article className="news-message news-message--broker"><span className="news-message__avatar"><ChibiSprite size={54} /></span>
        <div><strong>Your broker buddy</strong><p>Headline received. Your next move is yours to make, bro.</p></div></article>
      <article className="news-message"><div className="news-message__sender"><PixelIcon name="market" /><strong>Stock watch</strong><span>latest</span></div>
        <dl className="news-stock-watch">{game.stocks.map((stock) => <div key={stock.id}><dt>{stock.id}</dt><dd>{money(stock.pricePence)}</dd></div>)}</dl></article>
    </>}
  </div>;
}
