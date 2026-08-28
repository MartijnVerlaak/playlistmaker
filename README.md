# Spotify Top Track Playlistmaker

Een statische GitHub Pages-app. Er is geen server, npm of Python nodig.

## 1. Spotify Developer Dashboard

1. Open https://developer.spotify.com/dashboard
2. Open je app.
3. Voeg bij **Redirect URIs** exact de URL toe die de app onder **Redirect URI** toont.
4. Sla de wijziging op.

Voor een repository `playlistmaker` is de GitHub Pages-URL doorgaans:

`https://JOUW-GITHUB-NAAM.github.io/playlistmaker/`

Let op de afsluitende `/`. De redirect URI in Spotify moet exact overeenkomen.

## 2. Publiceren via GitHub

1. Maak of open een GitHub-repository.
2. Upload `index.html` in de hoofdmap van de repository.
3. Open **Settings > Pages**.
4. Kies **Deploy from a branch**.
5. Selecteer branch **main** en map **/(root)**.
6. Open daarna de gepubliceerde Pages-URL.
7. Doe bij een update eventueel een harde refresh met `Ctrl+Shift+R`.

## 3. Gebruiken

1. Klik op **Login met Spotify**.
2. Geef toestemming.
3. Plak één artiest per regel.
4. Kies de naam en zichtbaarheid van de playlist.
5. Klik op **Maak playlist**.

## Technische opmerkingen

- De app gebruikt Authorization Code met PKCE. Er staat geen client secret in de browsercode.
- Spotify heeft in 2026 voor Development Mode het artist-top-tracksendpoint verwijderd. Daarom zoekt deze app rechtstreeks naar tracks per artiest en kiest ze uit de zoekresultaten de track met de hoogste `popularity`.
- Search gebruikt `limit=10`, conform de Development Mode-beperking.
- Bij HTTP 429 respecteert de app `Retry-After` en probeert ze automatisch opnieuw.
- De standaardpauze is 1250 ms. Voor zeer lange lijsten kun je die verhogen.
- Stoppen vóór het einde maakt geen playlist aan, zodat je geen gedeeltelijke playlist krijgt.

## Veiligheid

Een Spotify Client ID mag zichtbaar zijn in een browserapp. Plaats nooit een Spotify Client Secret in `index.html`, GitHub of GitHub Pages.
