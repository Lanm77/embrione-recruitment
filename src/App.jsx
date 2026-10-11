import { useEffect, useRef, useState } from 'react';
import { configured, supabase } from './supabase.js';

const LOGO_URL = 'https://media.licdn.com/dms/image/v2/C4E0BAQHVDYFZmOCI4Q/company-logo_200_200/company-logo_200_200/0/1676861881809?e=2147483647&v=beta&t=-H5ZYCNuyDmV8VdWFZzy7WWhQ68AExFEH-9FxEk7e28';
const ADMIN_EMAIL = 'admin@embrione.pes.edu';
const domains = ['Web Development', 'Design', 'Logistics', 'Operations', 'Sponsorship', 'Hospitality', 'Social Media', 'Event Management'];
const positions = ['Head', 'Vice-Head', 'Core Member', 'Member'];
const branches = ['CSE', 'AIML', 'ECE', 'EEE', 'ME', 'Biotech', 'Other'];
const initialForm = { name: '', srn: '', email: '', domain: '', position: '', branch: '', semester: '', linkedin: '', github: '', bio: '' };

// Convert PNG/JPEG to an actual WebP file in the browser before upload.
async function convertToWebP(file) {
  const sourceURL = URL.createObjectURL(file);
  const img = new Image();
  try {
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('Could not read this image.'));
      img.src = sourceURL;
    });
    const scale = Math.min(1, 800 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image canvas unavailable.');
    context.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(result => result ? resolve(result) : reject(new Error('WebP conversion failed.')), 'image/webp', 0.8);
    });
    if (blob.type !== 'image/webp') {
      throw new Error('This browser cannot encode WebP using Canvas. Try Firefox or Chrome.');
    }
    const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]/gi, '-') || 'profile';
    return new File([blob], `${baseName}.webp`, { type: 'image/webp' });
  } finally {
    URL.revokeObjectURL(sourceURL);
  }
}

function validURL(input) {
  if (!input?.trim()) return '';
  try {
    const url = new URL(input.trim());
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}

function Field({ label, id, children }) {
  return <div className="field"><label htmlFor={id}>{label}</label>{children}</div>;
}

function Selection({ label, id, value, options, onChange }) {
  return (
    <Field label={label} id={id}>
      <select id={id} name={id} value={value} onChange={onChange} required>
        <option value="">Select {label.toLowerCase()}</option>
        {options.map(item => <option key={item} value={item}>{item}</option>)}
      </select>
    </Field>
  );
}

function MemberCard({ member, preview = false }) {
  const [brokenImage, setBrokenImage] = useState(false);
  const linkedin = validURL(member.linkedin_url || member.linkedin || '');
  const github = validURL(member.github_url || member.github || '');
  
const originalPhoto = member.photo_url || member.photoPreview;

const isGeneratedAvatar =
  originalPhoto?.includes('api.dicebear.com/9.x/initials/') ||
  originalPhoto?.includes('ui-avatars.com/api/');

const photo = isGeneratedAvatar
  ? `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(member.name || 'Member')}`
  : originalPhoto;

  useEffect(() => setBrokenImage(false), [photo]);
  return (
    <article className="member-card">
      <div className="avatar">
        {photo && !brokenImage ? <img src={photo} alt="Member profile" onError={() => setBrokenImage(true)} /> : <span role="img" aria-label="Developer avatar">👨‍💻</span>}
      </div>
      <p className="card-eyebrow">EMBRIONE MEMBER</p>
      <h3>{member.name || 'Your Name'}</h3>
      <p className="accent">{member.domain || 'Domain not selected'}</p>
      <p className="muted">{member.position || 'Position not selected'}</p>
      <hr />
      <p>SRN: {member.srn || 'Not entered'}</p>
      <p>Email: {member.email || 'Not entered'}</p>
      <p>Branch: {member.branch || 'Not selected'}</p>
      <p>Semester: {member.semester || 'Not selected'}</p>
      <hr />
      <p className="bio">{member.bio || 'Your bio will appear here...'}</p>
      <div className="social-links">
        {linkedin && <a href={linkedin} target="_blank" rel="noopener noreferrer">LinkedIn ↗</a>}
        {github && <a href={github} target="_blank" rel="noopener noreferrer">GitHub ↗</a>}
      </div>
      {!preview && member.status && <span className={`status status-${member.status}`}>{member.status}</span>}
    </article>
  );
}

function Register() {
  const [form, setForm] = useState(initialForm);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoMessage, setPhotoMessage] = useState('Choose a PNG or JPG (10 MB max).');
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState('error');
  const [submitting, setSubmitting] = useState(false);
  const conversionID = useRef(0);
  const previewURL = useRef(null);
  const fileInput = useRef(null);
  useEffect(() => () => {
    conversionID.current += 1;
    if (previewURL.current) URL.revokeObjectURL(previewURL.current);
  }, []);

  function updateField(event) {
    const { name, value } = event.target;
    setForm(previous => ({ ...previous, [name]: value }));
  }

  async function handlePhoto(event) {
    const selection = ++conversionID.current;
    const file = event.target.files?.[0];
    setFeedback('');
    setPhotoFile(null);
    setPhotoPreview('');
    if (previewURL.current) URL.revokeObjectURL(previewURL.current);
    previewURL.current = null;
    if (!file) { setPhotoMessage('Choose a PNG or JPG (10 MB max).'); return; }
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setPhotoMessage('Only PNG and JPG files are supported.');
      event.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setPhotoMessage('Please choose a photo smaller than 10 MB.');
      event.target.value = '';
      return;
    }
    setPhotoMessage('Converting to WebP…');
    try {
      const converted = await convertToWebP(file);
      if (conversionID.current !== selection) return;
      const url = URL.createObjectURL(converted);
      previewURL.current = url;
      setPhotoFile(converted);
      setPhotoPreview(url);
      setPhotoMessage(`✓ ${converted.name} • ${(converted.size / 1024).toFixed(1)} KB • image/webp`);
    } catch (err) {
      if (conversionID.current === selection) {
        setFeedbackType('error');
        setFeedback(err.message || 'Photo conversion failed.');
        setPhotoMessage('Please choose another image.');
      }
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFeedback('');
    setFeedbackType('error');
    if (!configured) { setFeedback('Supabase connection is not configured. Add your .env.local file.'); return; }
    if (!photoFile || photoFile.type !== 'image/webp') {
      setFeedback('Choose a profile picture and wait for WebP conversion.'); return;
    }
    if ((form.linkedin && !validURL(form.linkedin)) || (form.github && !validURL(form.github))) {
      setFeedback('Please provide valid http:// or https:// social profile links.'); return;
    }
    setSubmitting(true);
    let uploaded = false;
    try {
      const imagePath = `${Date.now()}-${crypto.randomUUID()}.webp`;
      const { error: uploadError } = await supabase.storage
        .from('member-photos')
        .upload(imagePath, photoFile, { contentType: 'image/webp', upsert: false });
      if (uploadError) throw new Error(`Photo upload: ${uploadError.message}`);
      uploaded = true;
      const { data } = supabase.storage.from('member-photos').getPublicUrl(imagePath);
      const { error: insertError } = await supabase.from('members').insert({
        name: form.name.trim(), srn: form.srn.trim(), email: form.email.trim(),
        domain: form.domain, position: form.position, branch: form.branch,
        semester: Number(form.semester), bio: form.bio.trim(),
        linkedin_url: validURL(form.linkedin) || null,
        github_url: validURL(form.github) || null,
        photo_url: data.publicUrl,
        status: 'pending'
      });
      if (insertError) {
        if (insertError.code === '23505') throw new Error('This SRN is already registered.');
        throw new Error(`Database: ${insertError.message}`);
      }
      setFeedbackType('success');
      setFeedback('✓ Submitted successfully! Your profile is pending admin approval.');
      setForm(initialForm);
      ++conversionID.current;
      if (previewURL.current) URL.revokeObjectURL(previewURL.current);
      previewURL.current = null;
      setPhotoFile(null);
      setPhotoPreview('');
      setPhotoMessage('Choose a PNG or JPG (10 MB max).');
      if (fileInput.current) fileInput.current.value = '';
    } catch (err) {
      setFeedbackType('error');
      setFeedback(`${err.message || 'Unable to submit.'}${uploaded ? ' Your image may already have uploaded; try again after checking the database.' : ''}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="main-container">
      <form className="registration-card" onSubmit={handleSubmit}>
        <h2>Member Registration</h2>
        <p className="muted">Fill in your details and watch the card update live.</p>
        <Field label="Full Name" id="name"><input id="name" name="name" value={form.name} onChange={updateField} placeholder="Enter your name" required /></Field>
        <Field label="SRN" id="srn"><input id="srn" name="srn" value={form.srn} onChange={updateField} placeholder="PES1UG26CS001" required /></Field>
        <Field label="Email" id="email"><input id="email" name="email" value={form.email} onChange={updateField} type="email" placeholder="you@example.com" required /></Field>
        <Selection label="Domain" id="domain" value={form.domain} options={domains} onChange={updateField} />
        <Selection label="Position" id="position" value={form.position} options={positions} onChange={updateField} />
        <Selection label="Branch" id="branch" value={form.branch} options={branches} onChange={updateField} />
        <Selection label="Semester" id="semester" value={form.semester} options={Array.from({length: 8}, (_, i) => String(i + 1))} onChange={updateField} />
        <Field label="LinkedIn URL" id="linkedin"><input id="linkedin" name="linkedin" type="url" value={form.linkedin} onChange={updateField} placeholder="https://linkedin.com/in/username" /></Field>
        <Field label="GitHub URL" id="github"><input id="github" name="github" type="url" value={form.github} onChange={updateField} placeholder="https://github.com/username" /></Field>
        <Field label="Short Bio" id="bio">
          <textarea id="bio" name="bio" value={form.bio} onChange={updateField} maxLength={200} rows={4} placeholder="Tell us about yourself..." />
          <p className="char-count">{form.bio.length} / 200 characters</p>
        </Field>
        <Field label="Profile Picture" id="photo">
          <input ref={fileInput} id="photo" name="photo" type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" onChange={handlePhoto} />
          <p className="file-note" aria-live="polite">{photoMessage}</p>
        </Field>
        {feedback && <p className={`message ${feedbackType}`} role="status">{feedback}</p>}
        <button type="submit" disabled={submitting || !configured}>{submitting ? 'Submitting…' : 'Submit Registration'}</button>
        <p className="footnote">Submitted members appear on /team only after admin approval.</p>
      </form>
      <section className="preview-column" aria-label="Live member preview">
        <div className="preview-container">
          <h2>Live Member Preview</h2>
          <p className="muted">Changes instantly as you fill the form.</p>
          <MemberCard member={{...form, photoPreview}} preview />
          {photoFile && <p className="webp-confirmation">✓ Image converted to WebP, ready to upload</p>}
        </div>
      </section>
    </div>
  );
}

function Team() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [domain, setDomain] = useState('');
  const [position, setPosition] = useState('');
  async function loadMembers() {
    if (!configured) { setLoading(false); return; }
    setLoading(true);
    setError('');
    const { data, error: fetchError } = await supabase.from('members').select('*').eq('status', 'approved').order('created_at', { ascending: false });
    if (fetchError) setError(fetchError.message);
    setMembers(data || []);
    setLoading(false);
  }
  useEffect(() => { loadMembers(); }, []);
  const visible = members.filter(member => (!domain || member.domain === domain) && (!position || member.position === position));
  return (
    <section className="directory-section">
      <div className="section-heading"><div><h2>Meet The Team</h2><p className="muted">Only admin-approved members appear here.</p></div><button className="small-button" onClick={loadMembers}>Refresh</button></div>
      <div className="filters">
        <label>Domain <select value={domain} onChange={e => setDomain(e.target.value)}><option value="">All domains</option>{domains.map(d => <option key={d}>{d}</option>)}</select></label>
        <label>Position <select value={position} onChange={e => setPosition(e.target.value)}><option value="">All positions</option>{positions.map(p => <option key={p}>{p}</option>)}</select></label>
      </div>
      {error && <p className="message error">{error}</p>}
      {loading ? <p className="muted">Loading approved members…</p> : visible.length ? (
        <div className="team-grid">{visible.map(member => <MemberCard key={member.id} member={member} />)}</div>
      ) : <p className="muted">No approved members match these filters yet.</p>}
    </section>
  );
}

function Admin() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [members, setMembers] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const isAdmin = session?.user?.email?.toLowerCase() === ADMIN_EMAIL;

  useEffect(() => {
    if (!configured) { setChecking(false); return; }
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) { setSession(data.session); setChecking(false); }
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) setSession(nextSession);
    });
    return () => { mounted = false; subscription.subscription.unsubscribe(); };
  }, []);

  async function loadAll() {
    if (!configured || !isAdmin) return;
    setBusy(true);
    setError('');
    const { data, error: fetchError } = await supabase.from('members').select('*').order('created_at', { ascending: false });
    if (fetchError) setError(`Loading members failed: ${fetchError.message}. Check your admin RLS policies.`);
    setMembers(data || []);
    setBusy(false);
  }
  useEffect(() => { if (isAdmin) loadAll(); else setMembers([]); }, [isAdmin]);

  async function login(event) {
    event.preventDefault();
    setError(''); setNotice(''); setBusy(true);
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (authError) setError(`Login failed: ${authError.message}`);
    else if (data.user?.email?.toLowerCase() !== ADMIN_EMAIL) {
      await supabase.auth.signOut();
      setError('Only the Embrione admin account is allowed here.');
    } else { setPassword(''); setNotice('Admin logged in.'); }
    setBusy(false);
  }
  async function updateStatus(member, status) {
    setBusy(true); setError(''); setNotice('');
    const { data, error: updateError } = await supabase.from('members').update({ status }).eq('id', member.id).select('id, status');
    if (updateError) setError(`Update failed: ${updateError.message}`);
    else if (!data?.length) setError('No row was updated. Check admin access and RLS policies.');
    else { setNotice(`${member.name}: ${status}`); await loadAll(); }
    setBusy(false);
  }
  async function logout() {
    await supabase.auth.signOut();
    setSession(null); setMembers([]); setNotice(''); setError('');
  }
  if (checking) return <p className="muted">Checking admin session…</p>;
  if (!isAdmin) return (
    <section className="admin-login registration-card">
      <h2>Admin Login</h2>
      <p className="muted">Only the configured admin account can moderate submissions.</p>
      <form onSubmit={login}>
        <Field label="Admin email" id="admin-email"><input id="admin-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required /></Field>
        <Field label="Password" id="admin-password"><input id="admin-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required /></Field>
        {error && <p className="message error">{error}</p>}
        <button disabled={busy}>{busy ? 'Signing in…' : 'Log In'}</button>
      </form>
      <p className="footnote">Create the admin user in Supabase Authentication → Users before logging in.</p>
    </section>
  );
  const pending = members.filter(member => member.status === 'pending');
  return (
    <section className="admin-dashboard">
      <div className="section-heading"><div><h2>Admin Moderation</h2><p className="muted">Signed in as {session.user.email}</p></div><div className="toolbar"><button className="small-button" disabled={busy} onClick={loadAll}>Refresh</button><button className="small-button" onClick={logout}>Log out</button></div></div>
      <div className="stats"><div><strong>{members.length}</strong><span>Total</span></div><div><strong>{pending.length}</strong><span>Pending</span></div><div><strong>{members.filter(m => m.status === 'approved').length}</strong><span>Approved</span></div></div>
      {error && <p className="message error">{error}</p>}
      {notice && <p className="message success">{notice}</p>}
      <h3>Pending Applications</h3>
      {pending.length ? <div className="moderation-list">{pending.map(member => (
        <article className="moderation-row" key={member.id}>
          <div className="moderation-summary"><img src={member.photo_url} alt="Applicant avatar" /><div><strong>{member.name}</strong><small>{member.srn} • {member.domain} • {member.position}</small><small>{member.email}</small></div></div>
          <div className="moderation-buttons"><button disabled={busy} onClick={() => updateStatus(member, 'approved')}>Approve</button><button disabled={busy} className="reject-button" onClick={() => updateStatus(member, 'rejected')}>Reject</button></div>
        </article>
      ))}</div> : <p className="muted">No pending submissions. Submit a profile at /register to test the workflow.</p>}
    </section>
  );
}

function getPage() {
  return ['/register', '/team', '/admin'].includes(window.location.pathname) ? window.location.pathname : '/register';
}

export default function App() {
  const [page, setPage] = useState(getPage);
  useEffect(() => {
    const onPopState = () => setPage(getPage());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  function navigate(event, route) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (page === route) return;
    window.history.pushState({}, '', route);
    setPage(route);
    window.scrollTo(0, 0);
  }
  return (
    <main className="page">
      <header className="header">
        <img className="logo" src={LOGO_URL} alt="Embrione logo" onError={e => {e.currentTarget.style.display='none';}} />
        <p className="eyebrow">THE EMBRIONE</p>
        <h1>Meet the Team</h1>
        <p className="subtitle">Registration & Moderation Portal</p>
        <nav className="top-nav" aria-label="Main navigation">
          {[['/register', 'Register'], ['/team', 'Meet The Team'], ['/admin', 'Admin']].map(([route, label]) => <a key={route} href={route} className={page === route ? 'active' : ''} onClick={e => navigate(e, route)}>{label}</a>)}
        </nav>
      </header>
      {!configured && <p className="message error setup-alert">Supabase is not connected yet. Create <code>.env.local</code> beside package.json with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the dev server.</p>}
      {page === '/register' ? <Register /> : page === '/team' ? <Team /> : <Admin />}
    </main>
  );
}
