const CLIENT_ID = 'c17f3f874de044bcb883a69b5341d133';
const API = 'https://api.spotify.com/v1';
const ACCOUNTS = 'https://accounts.spotify.com';
const SCOPES = ['user-read-private', 'playlist-modify-private', 'playlist-modify-public'];
const REDIRECT_URI = `${window.location.origin}${window.location.pathname}`;

const $ = (id) => document.getElementById(id);
const ui = {
  login: $('loginButton'), logout: $('logoutButton'), create: $('createButton'),
  status: $('accountStatus'), redirect: $('redirectUri'), name: $('playlistName'),
  artists: $('artists'), isPublic: $('isPublic'), avoidDuplicates: $('avoidDuplicates'),
  message: $('message'), results: $('results'), progress: $('progress'), link: $('playlistLink')
};
ui.redirect.textContent = REDIRECT_URI;

function randomString(length = 64) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, x => chars[x % chars.length]).join('');
}
async function sha256(value) { return crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)); }
function base64url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function storeTokens(data) {
  localStorage.setItem('spotify_access_token', data.access_token);
  localStorage.setItem('spotify_expires_at', String(Date.now() + (data.expires_in * 1000) - 30000));
  if (data.refresh_token) localStorage.setItem('spotify_refresh_token', data.refresh_token);
}
async function login() {
  const verifier = randomString(96);
  const state = randomString(32);
  sessionStorage.setItem('spotify_code_verifier', verifier);
  sessionStorage.setItem('spotify_oauth_state', state);
  const params = new URLSearchParams({
    client_id: CLIENT_ID, response_type: 'code', redirect_uri: REDIRECT_URI,
    scope: SCOPES.join(' '), state, code_challenge_method: 'S256',
    code_challenge: base64url(await sha256(verifier))
  });
  window.location.assign(`${ACCOUNTS}/authorize?${params}`);
}
async function exchangeCode(code) {
  const verifier = sessionStorage.getItem('spotify_code_verifier');
  if (!verifier) throw new Error('PKCE-code ontbreekt. Start de login opnieuw.');
  const response = await fetch(`${ACCOUNTS}/api/token`, {
    method: 'POST', headers: {'Content-Type':'application/x-www-form-urlencoded'},
    body: new URLSearchParams({client_id:CLIENT_ID, grant_type:'authorization_code', code, redirect_uri:REDIRECT_URI, code_verifier:verifier})
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || data.error || 'Token kon niet worden opgehaald.');
  storeTokens(data);
  sessionStorage.removeItem('spotify_code_verifier');
  sessionStorage.removeItem('spotify_oauth_state');
}
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('spotify_refresh_token');
  if (!refreshToken) throw new Error('Je sessie is verlopen. Log opnieuw in.');
  const response = await fetch(`${ACCOUNTS}/api/token`, {
    method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({client_id:CLIENT_ID, grant_type:'refresh_token', refresh_token:refreshToken})
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || 'Vernieuwen van de login is mislukt.');
  storeTokens(data);
  return data.access_token;
}
async function token() {
  const access = localStorage.getItem('spotify_access_token');
  const expiry = Number(localStorage.getItem('spotify_expires_at') || 0);
  if (access && Date.now() < expiry) return access;
  return refreshAccessToken();
}
async function spotify(path, options = {}) {
  const makeRequest = async (accessToken) => fetch(`${API}${path}`, {
    ...options,
    headers:{Authorization:`Bearer ${accessToken}`, ...(options.body ? {'Content-Type':'application/json'} : {}), ...(options.headers || {})}
  });
  let response = await makeRequest(await token());
  if (response.status === 401) response = await makeRequest(await refreshAccessToken());
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const retry = response.headers.get('Retry-After');
    const detail = data?.error?.message || data?.error_description || `Spotify-fout ${response.status}`;
    throw new Error(retry ? `${detail}. Probeer opnieuw na ${retry} seconden.` : detail);
  }
  return data;
}
function normalise(value) { return value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,''); }
async function findTopTrack(artistName) {
  const query = encodeURIComponent(`artist:${artistName}`);
  const data = await spotify(`/search?q=${query}&type=track&limit=20`);
  const tracks = data.tracks?.items || [];
  const target = normalise(artistName);
  const exact = tracks.filter(t => t.artists.some(a => normalise(a.name) === target));
  const candidates = exact.length ? exact : tracks;
  candidates.sort((a,b) => (b.popularity || 0) - (a.popularity || 0));
  return candidates[0] || null;
}
async function createPlaylist(profile, name, isPublic) {
  const body = JSON.stringify({name, public:isPublic, description:'Automatisch gemaakt met Spotify Playlist Maker'});
  try {
    return await spotify('/me/playlists', {method:'POST', body});
  } catch (error) {
    if (!/404|not found/i.test(error.message)) throw error;
    return spotify(`/users/${encodeURIComponent(profile.id)}/playlists`, {method:'POST', body});
  }
}
async function addTracks(playlistId, uris) {
  for (let i = 0; i < uris.length; i += 100) {
    await spotify(`/playlists/${playlistId}/items`, {method:'POST', body:JSON.stringify({uris:uris.slice(i, i + 100)})});
  }
}
function setMessage(text, error = false) { ui.message.textContent = text; ui.message.className = error ? 'message error' : 'message'; }
function setLoggedIn(profile) {
  ui.status.textContent = `Ingelogd als ${profile.display_name || profile.id}`;
  ui.login.classList.add('hidden'); ui.logout.classList.remove('hidden'); ui.create.disabled = false;
}
function logout() {
  ['spotify_access_token','spotify_refresh_token','spotify_expires_at'].forEach(k => localStorage.removeItem(k));
  sessionStorage.clear(); window.location.reload();
}
async function initialise() {
  try {
    const params = new URLSearchParams(location.search);
    if (params.get('error')) throw new Error(`Spotify-login geweigerd: ${params.get('error')}`);
    const code = params.get('code');
    if (code) {
      const returnedState = params.get('state');
      if (!returnedState || returnedState !== sessionStorage.getItem('spotify_oauth_state')) throw new Error('Ongeldige OAuth-state. Start de login opnieuw.');
      await exchangeCode(code);
      history.replaceState({}, document.title, REDIRECT_URI);
    }
    if (localStorage.getItem('spotify_access_token') || localStorage.getItem('spotify_refresh_token')) setLoggedIn(await spotify('/me'));
  } catch (error) { setMessage(error.message, true); logoutWithoutReload(); }
}
function logoutWithoutReload() {
  ['spotify_access_token','spotify_refresh_token','spotify_expires_at'].forEach(k => localStorage.removeItem(k));
  ui.create.disabled = true; ui.login.classList.remove('hidden'); ui.logout.classList.add('hidden'); ui.status.textContent = 'Niet ingelogd';
}
async function run() {
  const artists = [...new Set(ui.artists.value.split(/\r?\n/).map(x => x.trim()).filter(Boolean))];
  const name = ui.name.value.trim();
  if (!name) return setMessage('Geef een naam voor de playlist op.', true);
  if (!artists.length) return setMessage('Plak minstens één artiest in de lijst.', true);
  ui.create.disabled = true; ui.results.innerHTML = ''; ui.link.classList.add('hidden'); setMessage('Tracks zoeken…');
  try {
    const profile = await spotify('/me');
    const selected = [], seen = new Set(), failed = [];
    for (let i = 0; i < artists.length; i++) {
      ui.progress.textContent = `${i + 1}/${artists.length}`;
      const artist = artists[i];
      try {
        const track = await findTopTrack(artist);
        if (!track) { failed.push(`${artist}: geen track gevonden`); continue; }
        if (ui.avoidDuplicates.checked && seen.has(track.uri)) { failed.push(`${artist}: dubbele track overgeslagen`); continue; }
        seen.add(track.uri); selected.push(track);
        const li = document.createElement('li');
        li.innerHTML = `<span class="track"></span><br><span class="meta"></span>`;
        li.querySelector('.track').textContent = `${track.name} — ${track.artists.map(a => a.name).join(', ')}`;
        li.querySelector('.meta').textContent = `Spotify-populariteit: ${track.popularity ?? 'onbekend'}`;
        ui.results.appendChild(li);
      } catch (error) { failed.push(`${artist}: ${error.message}`); }
    }
    if (!selected.length) throw new Error(`Geen tracks gevonden. ${failed.join(' | ')}`);
    setMessage('Playlist aanmaken en tracks toevoegen…');
    const playlist = await createPlaylist(profile, name, ui.isPublic.checked);
    await addTracks(playlist.id, selected.map(t => t.uri));
    ui.link.href = playlist.external_urls.spotify; ui.link.classList.remove('hidden');
    setMessage(`Klaar: ${selected.length} track(s) toegevoegd.${failed.length ? ` ${failed.length} item(s) niet toegevoegd: ${failed.join(' | ')}` : ''}`);
  } catch (error) { setMessage(error.message, true); }
  finally { ui.progress.textContent = ''; ui.create.disabled = false; }
}
ui.login.addEventListener('click', login);
ui.logout.addEventListener('click', logout);
ui.create.addEventListener('click', run);
initialise();
