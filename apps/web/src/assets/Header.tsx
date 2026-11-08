import { Link } from "react-router-dom";
import PixelIcon from "../components/pixel/PixelIcon";

export default function Header() {
  return <header className="site-header"><Link className="logo" to="/">BULLISH! <span>↗</span></Link>
    <a href="#how-to-play"><PixelIcon name="star" /> How to play</a></header>;
}
