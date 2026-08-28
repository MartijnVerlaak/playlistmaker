# Spotify Playlist Maker v2

## Welke bestanden vervangen?

Vervang in de hoofdmap van je GitHub-repository:

- `index.html`
- `app.js`
- `style.css`

Je mag deze `README.md` eveneens uploaden.

## Redirect URI

Na publicatie toont de app zelf de exacte Redirect URI. Voeg die exact toe in het Spotify Developer Dashboard, inclusief de afsluitende slash.

## Werking

1. Log in met Spotify via PKCE.
2. Geef één artiest per regel op.
3. Kies 1 tot 10 tracks per artiest.
4. De app zoekt eerst de artiest via `resolveArtist()`.
5. De app zoekt daarna tracks van die artiest via `topTracks()`.
6. Tracks worden gerangschikt op de door Spotify teruggegeven `popularity`-waarde.
7. De playlist wordt gemaakt via `POST /me/playlists`.
8. Tracks worden in groepen van maximaal 100 toegevoegd via `POST /playlists/{playlist_id}/items`.

## Belangrijke beperking vanaf 2026

Spotify heeft `GET /artists/{id}/top-tracks` voor Development Mode verwijderd. Deze app gebruikt daarom de nog beschikbare Search-endpoint en sorteert de passende zoekresultaten op `popularity`. De gekozen tracks zijn dus een praktische benadering van de populairste tracks, niet gegarandeerd exact de zichtbare Spotify-ranglijst op de artiestenpagina.

## Client ID

De opgegeven client ID staat bovenaan `app.js`. Plaats nooit een client secret in GitHub of browsercode.

## Versie 3: bescherming tegen fout 429

Deze versie voegt toe:

- automatische verwerking van Spotify `429 Too Many Requests`;
- respect voor de `Retry-After`-header;
- maximaal zes automatische pogingen;
- oplopende wachttijd wanneer Spotify geen `Retry-After` meestuurt;
- een globale pauze, zodat ook volgende aanvragen niet te vroeg vertrekken;
- 1,2 seconde spreiding tussen artiesten;
- caching van artiest- en trackzoekresultaten tijdens dezelfde run.

Vervang minstens `app.js`. Omdat de interface ongewijzigd is tegenover v2, mogen `index.html` en `style.css` blijven staan, maar dit pakket bevat voor de zekerheid de volledige set.
