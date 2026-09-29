'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getBrowserClient } from '../lib/supabase';

export default function Home() {
  const [hour, setHour] = useState(null);
  const [slips, setSlips] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sb = getBrowserClient();
    if (!sb) { setReady(true); return; }
    (async () => {
      const [{ data: hours }, { data: publicSlips }] = await Promise.all([
        sb.from('ng_hours').select('*').order('created_at', { ascending: false }).limit(1),
        sb.from('ng_slips').select('id, body, created_at, author_id, ng_profiles(handle, display_name)').eq('is_public', true).order('created_at', { ascending: false }).limit(36),
      ]);
      setHour(hours?.[0] || null);
      setSlips(publicSlips || []);
      setReady(true);
    })();
  }, []);

  return (
    <div className="wrap">
      <header className="top">
        <div className="mark">North<span>glass</span></div>
        <nav>
          <Link href="/">Wall</Link>
          <Link href="/desk">Desk</Link>
        </nav>
      </header>

      <section className="hour">
        <div className="kicker">This hour</div>
        <h1>{hour?.title || 'The wall is waking'}</h1>
        <p>{hour?.body || 'A new note is pinned here every hour. Public slips from signed-in writers sit below.'}</p>
      </section>

      {!ready && <p className="empty">Setting the table…</p>}
      {ready && slips.length === 0 && (
        <p className="empty">No public slips yet. Sign in at the desk and leave one on the wall.</p>
      )}
      <div className="grid">
        {slips.map((s, i) => (
          <article key={s.id} className="slip" style={{ '--i': i, '--tilt': `${(i % 5) - 2}deg` }}>
            <p>{s.body}</p>
            <div className="meta">
              <span>{s.ng_profiles?.display_name || s.ng_profiles?.handle || 'anon'}</span>
              <span>{new Date(s.created_at).toLocaleString()}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
