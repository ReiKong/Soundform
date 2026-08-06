# Soundform

Soundform is a spatial music-discovery app. Search for a track, then explore a
visual constellation of sonically related recordings.

Spotify supplies catalog metadata, cover artwork, and listening links.
ReccoBeats supplies audio features and recommendation candidates.

## Local development

Requires Node.js 22.13 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Add your Spotify developer credentials to `.env.local`:

```env
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
```

Secrets and local environment files are excluded from version control.

## Commands

```bash
npm run dev
npm run build
npm run lint
```
