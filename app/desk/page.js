'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getBrowserClient } from '../../lib/supabase';

export default function Desk() {
  const sb = getBrowserClient();
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [mine, setMine] = useState([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [body, setBody] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [err, setErr] = useState('');
  const [notice, setNotice] = useState('');

  async function loadUser(user) {
    if (!sb || !user) return;
    let { data: p } = await sb.from('ng_profiles').select('*').eq('id', user.id).maybeSingle();
    if (!p) {
      const handle = (user.email?.split('@')[0] || 'member') + user.id.slice(0, 4);
      await sb.from('ng_profiles').insert({ id: user.id, handle, display_name: user.email?.split('@')[0] || 'member' });
      ({ data: p } = await sb.from('ng_profiles').select('*').eq('id', user.id).maybeSingle());
    }
    setProfile(p);
    const { data } = await sb.from('ng_slips').select('*').eq('author_id', user.id).order('created_at', { ascending: false });
    setMine(data || []);
  }

  useEffect(() => {
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) loadUser(data.session.user);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, sess) => {
      setSession(sess);
      if (sess?.user) loadUser(sess.user);
      else { setProfile(null); setMine([]); }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signUp(e) {
    e.preventDefault();
    setErr('');
    const { error } = await sb.auth.signUp({ email, password });
    if (error) setErr(error.message);
    else setNotice('Check your email if confirmation is on, or you are already in.');
  }
  async function signIn(e) {
    e.preventDefault();
    setErr('');
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) setErr(error.message);
  }
  async function signOut() { await sb.auth.signOut(); }
  async function publish(e) {
    e.preventDefault();
    setErr('');
    if (!profile) return;
    const { error } = await sb.from('ng_slips').insert({ author_id: profile.id, body, is_public: isPublic });
    if (error) setErr(error.message);
    else { setBody(''); loadUser(session.user); }
  }
  async function toggle(slip) {
    await sb.from('ng_slips').update({ is_public: !slip.is_public }).eq('id', slip.id);
    loadUser(session.user);
  }
  async function remove(slip) {
    await sb.from('ng_slips').delete().eq('id', slip.id);
    loadUser(session.user);
  }

  if (!sb) {
    return (
      <div className="wrap">
        <p className="err">Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to deploy env.</p>
      </div>
    );
  }

  return (
    <div className="wrap">
      <header className="top">
        <div className="mark">North<span>glass</span></div>
        <nav>
          <Link href="/">Wall</Link>
          <Link href="/desk">Desk</Link>
        </nav>
      </header>

      {!session && (
        <>
          <h1 className="serif">Sit down.</h1>
          <p className="empty">Email and a password. Public slips go on the wall; private ones stay in this drawer.</p>
          <form className="auth" onSubmit={signIn}>
            <input type="email" required placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input type="password" required minLength={6} placeholder="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit">Sign in</button>
              <button type="button" className="ghost" onClick={signUp}>Create account</button>
            </div>
            {err && <div className="err">{err}</div>}
            {notice && <div>{notice}</div>}
          </form>
        </>
      )}

      {session && (
        <>
          <h1 className="serif">Hello{profile?.display_name ? `, ${profile.display_name}` : ''}.</h1>
          <button className="ghost" onClick={signOut}>Sign out</button>
          <form className="compose" onSubmit={publish}>
            <textarea required maxLength={800} placeholder="Leave a slip…" value={body} onChange={(e) => setBody(e.target.value)} />
            <label className="chk">
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
              Put this on the public wall
            </label>
            <button type="submit">Save slip</button>
            {err && <div className="err">{err}</div>}
          </form>
          <div className="grid">
            {mine.map((s, i) => (
              <article key={s.id} className="slip" style={{ '--i': i }}>
                <p>{s.body}</p>
                <div className="meta">
                  <span>{s.is_public ? 'on the wall' : 'in the drawer'}</span>
                  <span>
                    <button className="ghost" type="button" onClick={() => toggle(s)}>{s.is_public ? 'Hide' : 'Publish'}</button>{' '}
                    <button className="ghost" type="button" onClick={() => remove(s)}>Delete</button>
                  </span>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
