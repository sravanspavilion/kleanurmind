'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <div className="container page"><div className="card"><h1>We couldn’t load this page</h1><p>Check the database and authentication configuration, then try again.</p><button className="btn" onClick={reset}>Try again</button></div></div>;}
