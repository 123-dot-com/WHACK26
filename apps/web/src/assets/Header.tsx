import React from 'react';
import ReactDOM from 'react-dom';
import './header.css'

function Header() {
    return (
        <header className="header">
        <div className="logo"> <a href="./Home">BULLISH!</a></div>
        <nav>
        <a href="./accessibility">Accessibility</a>
        </nav>
        </header>
    );
}
export default Header;
