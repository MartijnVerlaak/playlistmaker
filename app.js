const CLIENT_ID = 'c17f3f874de044bcb883a69b5341d133';
const API = 'https://api.spotify.com/v1';
const ACCOUNTS = 'https://accounts.spotify.com';
const SCOPES = ['user-read-private', 'playlist-modify-private', 'playlist-modify-public'];
const REDIRECT_URI = `${location.origin}${location.pathname}`;

const byId = id => document.getElementById(id);
const ui = {
  login: byId('loginButton'), logout: byId('logoutButton'), create: byId('createButton'),
  account: byId('accountStatus'), redirect: byId('redirectUri'), playlistName: byId('playlistName'),
  topCount: byId('topCount'), artists: byId('artists'), isPublic: byId('isPublic'),
  avoidDuplicates: byId('avoidDuplicates'), message: byId('message'), results: byId('results'),
  progress: byId('progress'), playlistLink: byId('playlistLink')
};
ui.redirect.textContent = REDIRECT_URI;

function randomString(length = 64) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, byte => chars[byte % chars.length]).join('');
}
async function sha256(text) {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
}
function base64Url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function saveTokens(data) {
  localStorage.setItem('spotify_access_token', data.access_token);
  localStorage.setItem('spotify_expires_at', String(Date.now() + data.expires_in * 1000 - 30000));
  if (data.refresh_token) localStorage.setItem('spotify_refresh_token', data.refresh_token);
}
function clearTokens() {
  ['spotify_access_token', 'spotify_refresh_token', 'spotify_expires_at'].forEach(key => localStorage.removeItem(key));
}
async function login() {
  const verifier = randomString(96);
  const state = randomString(32);
  sessionStorage.setItem('spotify_code_verifier', verifier);
  sessionStorage.setItem('spotify_oauth_state', state);
  const params = new URLSearchParams({
    client_id: CLIENT_ID, response_type: 'code', redirect_uri: REDIRECT_URI,
    scope: SCOPES.join(' '), state, code_challenge_method: 'S256',
    code_challenge: base64Url(await sha256(verifier))
  });
  location.assign(`${ACCOUNTS}/authorize?${params}`);
}
async function exchangeCode(code) {
  const verifier = sessionStorage.getItem('spotify_code_verifier');
  if (!verifier) throw new Error('Login-informatie ontbreekt. Start de Spotify-login opnieuw.');
  const response = await fetch(`${ACCOUNTS}/api/token`, {
    method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({client_id: CLIENT_ID, grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI, code_verifier: verifier})
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || data.error || 'Spotify-login mislukt.');
  saveTokens(data);
  sessionStorage.removeItem('spotify_code_verifier');
  sessionStorage.removeItem('spotify_oauth_state');
}
async function refreshToken() {
  const refresh = localStorage.getItem('spotify_refresh_token');
  if (!refresh) throw new Error('Je sessie is verlopen. Log opnieuw in.');
  const response = await fetch(`${ACCOUNTS}/api/token`, {
    method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({client_id: CLIENT_ID, grant_type: 'refresh_token', refresh_token: refresh})
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || 'Spotify-login kon niet worden vernieuwd.');
  saveTokens(data);
  return data.access_token;
}
async function accessToken() {
  const token = localStorage.getItem('spotify_access_token');
  const expiry = Number(localStorage.getItem('spotify_expires_at') || 0);
  return token && Date.now() < expiry ? token : refreshToken();
}
async function spotify(path, options = {}, retry = true) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {Authorization: `Bearer ${await accessToken()}`, ...(options.body ? {'Content-Type': 'application/json'} : {}), ...(options.headers || {})}
  });
  if (response.status === 401 && retry) {
    await refreshToken();
    return spotify(path, options, false);
  }
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data?.error?.message || data?.error_description || `Spotify-fout ${response.status}`;
    const wait = response.headers.get('Retry-After');
    throw new Error(wait ? `${detail}. Probeer opnieuw na ${wait} seconden.` : detail);
  }
  return data;
}
function normalise(text) {
  return text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Zoekt eerst de artiest en verkiest een exacte naamsovereenkomst.
async function resolveArtist(artistName) {
  const data = await spotify(`/search?q=${encodeURIComponent(artistName)}&type=artist&limit=10`);
  const artists = data.artists?.items || [];
  if (!artists.length) return null;
  const target = normalise(artistName);
  return artists.find(artist => normalise(artist.name) === target) || artists[0];
}

// Spotify verwijderde in 2026 de Artist Top Tracks-endpoint voor Development Mode.
// Daarom zoekt deze functie tracks op de opgeloste artiestennaam en rangschikt ze op popularity.
async function topTracks(artist, amount) {
  const data = await spotify(`/search?q=${encodeURIComponent(`artist:${artist.name}`)}&type=track&limit=50`);
  const targetId = artist.id;
  const targetName = normalise(artist.name);
  const exactTracks = (data.tracks?.items || []).filter(track =>
    track.artists.some(item => item.id === targetId || normalise(item.name) === targetName)
  );
  const unique = [];
  const seen = new Set();
  for (const track of exactTracks.sort((a, b) => (b.popularity || 0) - (a.popularity || 0))) {
    const key = normalise(track.name);
    if (!seen.has(key)) { seen.add(key); unique.push(track); }
  }
  return unique.slice(0, amount);
}

async function createSpotifyPlaylist(name, isPublic) {
  return spotify('/me/playlists', {
    method: 'POST',
    body: JSON.stringify({name, public: isPublic, description: 'Gemaakt met Spotify Playlist Maker'})
  });
}
async function addTracks(playlistId, uris) {
  for (let i = 0; i < uris.length; i += 100) {
    await spotify(`/playlists/${playlistId}/items`, {method: 'POST', body: JSON.stringify({uris: uris.slice(i, i + 100)})});
  }
}
function showMessage(text, isError = false) {
  ui.message.textContent = text;
  ui.message.className = isError ? 'error' : '';
}
function showLoggedIn(profile) {
  ui.account.textContent = `Ingelogd als ${profile.display_name || profile.id}`;
  ui.login.classList.add('hidden');
  ui.logout.classList.remove('hidden');
  ui.create.disabled = false;
}
function logout() {
  clearTokens();
  sessionStorage.clear();
  location.reload();
}
function renderArtistResult(requestedName, artist, tracks) {
  const section = document.createElement('section');
  section.className = 'artist-result';
  const title = document.createElement('h3');
  title.textContent = artist ? `${requestedName} → ${artist.name}` : requestedName;
  section.appendChild(title);
  if (!tracks.length) {
    const text = document.createElement('p');
    text.className = 'muted';
    text.textContent = 'Geen passende tracks gevonden.';
    section.appendChild(text);
  } else {
    const list = document.createElement('ol');
    tracks.forEach(track => {
      const item = document.createElement('li');
      item.textContent = `${track.name} — ${track.artists.map(a => a.name).join(', ')} (populariteit ${track.popularity ?? '?'})`;
      list.appendChild(item);
    });
    section.appendChild(list);
  }
  ui.results.appendChild(section);
}
async function buildPlaylist() {
  const names = [...new Set(ui.artists.value.split(/\r?\n/).map(value => value.trim()).filter(Boolean))];
  const playlistName = ui.playlistName.value.trim();
  const amount = Math.max(1, Math.min(10, Number.parseInt(ui.topCount.value, 10) || 1));
  ui.topCount.value = String(amount);
  if (!playlistName) return showMessage('Geef een naam voor de playlist op.', true);
  if (!names.length) return showMessage('Geef minstens één artiest op.', true);

  ui.create.disabled = true;
  ui.results.innerHTML = '';
  ui.playlistLink.classList.add('hidden');
  const selected = [];
  const seenUris = new Set();
  const warnings = [];
  try {
    for (let i = 0; i < names.length; i++) {
      ui.progress.textContent = `${i + 1}/${names.length}`;
      showMessage(`Zoeken naar ${names[i]}…`);
      try {
        const artist = await resolveArtist(names[i]);
        if (!artist) { warnings.push(`${names[i]}: artiest niet gevonden`); renderArtistResult(names[i], null, []); continue; }
        const tracks = await topTracks(artist, amount);
        const accepted = tracks.filter(track => {
          if (!ui.avoidDuplicates.checked) return true;
          if (seenUris.has(track.uri)) return false;
          seenUris.add(track.uri);
          return true;
        });
        selected.push(...accepted);
        renderArtistResult(names[i], artist, accepted);
        if (accepted.length < amount) warnings.push(`${names[i]}: ${accepted.length} van ${amount} tracks gevonden`);
      } catch (error) {
        warnings.push(`${names[i]}: ${error.message}`);
        renderArtistResult(names[i], null, []);
      }
    }
    if (!selected.length) throw new Error(`Geen tracks gevonden. ${warnings.join(' | ')}`);
    showMessage('Playlist maken en tracks toevoegen…');
    const playlist = await createSpotifyPlaylist(playlistName, ui.isPublic.checked);
    await addTracks(playlist.id, selected.map(track => track.uri));
    ui.playlistLink.href = playlist.external_urls.spotify;
    ui.playlistLink.classList.remove('hidden');
    showMessage(`Klaar: ${selected.length} tracks toegevoegd.${warnings.length ? ` Opmerkingen: ${warnings.join(' | ')}` : ''}`);
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    ui.progress.textContent = '';
    ui.create.disabled = false;
  }
}
async function initialise() {
  try {
    const params = new URLSearchParams(location.search);
    if (params.get('error')) throw new Error(`Spotify-login geweigerd: ${params.get('error')}`);
    if (params.get('code')) {
      if (params.get('state') !== sessionStorage.getItem('spotify_oauth_state')) throw new Error('Ongeldige OAuth-state. Start opnieuw.');
      await exchangeCode(params.get('code'));
      history.replaceState({}, document.title, REDIRECT_URI);
    }
    if (localStorage.getItem('spotify_access_token') || localStorage.getItem('spotify_refresh_token')) {
      showLoggedIn(await spotify('/me'));
    }
  } catch (error) {
    clearTokens();
    showMessage(error.message, true);
  }
}
ui.login.addEventListener('click', login);
ui.logout.addEventListener('click', logout);
ui.create.addEventListener('click', buildPlaylist);
initialise();
