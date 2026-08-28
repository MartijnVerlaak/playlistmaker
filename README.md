# Spotify Playlist Maker

Een statische GitHub Pages-app die via Spotify OAuth 2.0 met PKCE inlogt, per opgegeven artiest een populaire track zoekt en daarvan een playlist maakt in jouw Spotify-account.

## Belangrijk

- Er is **geen client secret** nodig. Zet een client secret nooit in browsercode of GitHub.
- De client ID staat al in `app.js`: `c17f3f874de044bcb883a69b5341d133`.
- De app werkt via HTTPS op GitHub Pages.
- De app kiest niet noodzakelijk de officiële sectie “Populair” op de artiestenpagina. Ze zoekt maximaal 20 tracks, verkiest een exacte artiestmatch en neemt daaruit de hoogste `popularity`-waarde die de Spotify Web API teruggeeft.

## Stap 1: repository maken

1. Meld je aan op GitHub.
2. Kies **New repository**.
3. Geef de repository bijvoorbeeld de naam `spotify-playlist-maker`.
4. Kies **Public** en maak de repository aan.
5. Pak het gedownloade ZIP-bestand uit.
6. Upload de bestanden uit de map rechtstreeks naar de hoofdmap van de repository: `index.html`, `style.css`, `app.js`, `.nojekyll` en `README.md`.
7. Commit de upload.

## Stap 2: GitHub Pages activeren

1. Open in je repository **Settings**.
2. Kies links **Pages**.
3. Bij **Build and deployment** kies je **Deploy from a branch**.
4. Kies branch `main` en map `/(root)`.
5. Klik **Save**.
6. Je siteadres heeft normaal deze vorm: `https://JOUW-GITHUB-NAAM.github.io/spotify-playlist-maker/`.

Let op: de exacte GitHub Pages-URL hangt af van jouw gebruikersnaam en repositorynaam. Open de gepubliceerde site en kopieer de Redirect URI die de app zelf onder de login-knop toont.

## Stap 3: Spotify Developer App instellen

1. Open het Spotify Developer Dashboard.
2. Open de app met client ID `c17f3f874de044bcb883a69b5341d133`.
3. Open **Settings** of **Edit settings**.
4. Voeg bij **Redirect URIs** exact de URI toe die de gepubliceerde app toont. Hoofdletters, pad en afsluitende slash moeten exact overeenkomen.
5. Zorg dat **Web API** voor de app geselecteerd is.
6. Sla de instellingen op.

Voorbeeld, alleen als jouw GitHub-gebruikersnaam en repository exact zo heten:

`https://JOUW-GITHUB-NAAM.github.io/spotify-playlist-maker/`

## Stap 4: gebruiken

1. Open je GitHub Pages-site.
2. Klik **Inloggen met Spotify**.
3. Geef toestemming.
4. Vul een playlistnaam in.
5. Plak één artiest per regel.
6. Kies eventueel **Publieke playlist**.
7. Klik **Playlist maken**.
8. Open de playlist via de getoonde Spotify-knop.

## Testlijst

```text
Big Thief
Turnstile
Alex G
Agriculture
Deafheaven
```

## Veelvoorkomende fouten

### `INVALID_CLIENT: Invalid redirect URI`
De Redirect URI in Spotify is niet exact gelijk aan de URI die de app gebruikt. Kopieer de URI uit de app, inclusief de afsluitende `/`.

### Login werkt, maar playlist maken niet
Controleer of je bij de login toestemming hebt gegeven voor playlistwijzigingen. Log uit en opnieuw in. Controleer ook of de app in het Spotify Dashboard toegang heeft tot de Web API.

### Andere Spotify-gebruikers kunnen niet inloggen
Spotify-apps kunnen, afhankelijk van de actuele ontwikkelmodus en Spotify-regels, beperkt zijn tot toegelaten gebruikers. Voeg testgebruikers toe in het Spotify Developer Dashboard indien die instelling beschikbaar is.

### Verkeerde track voor een artiest
Artiestennamen zijn niet altijd uniek. Gebruik de exacte artiestennaam zoals die op Spotify staat. De app toont welke artiest en track uiteindelijk geselecteerd zijn.

### Spotify-fout 429
De API-limiet is geraakt. De foutmelding toont, als Spotify die meestuurt, hoeveel seconden je moet wachten voordat je opnieuw probeert.

## Bestanden aanpassen

- Client ID: bovenaan `app.js` bij `CLIENT_ID`.
- Standaard playlistnaam: in `index.html` bij `id="playlistName"`.
- Opmaak: `style.css`.
- Selectie-algoritme: functie `findTopTrack()` in `app.js`.
