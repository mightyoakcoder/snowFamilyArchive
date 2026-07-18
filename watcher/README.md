# Photo watcher — auto-upload + label-later pipeline

## How it fits together (the "pub/sub" part)

- **Publisher:** `photo_watcher.py`, running on your Mac, watching one folder.
- **Event:** "a new photo file appeared."
- **Subscriber 1 (automatic):** uploads the photo to the site via a new
  `/watcher/upload` endpoint, always as a **private draft** — `is_private:
  true`, no people, no date (unless EXIF has one).
- **Subscriber 2 (automatic):** once a batch of uploads finishes, sends you
  one summary email with a link straight to the site's new **"Needs
  labeling"** gallery filter.
- **You:** click the link, open each photo in the existing edit form
  (already has date/people fields), fill them in, and either leave it
  private or flip it public. Nothing gets auto-published.

No message broker needed — it's a one-event, two-subscriber fan-out, which
a single script handles fine.

## What changed in the site itself

- `server.js` — new `POST /watcher/upload` route, gated by a shared secret
  (`WATCHER_API_KEY`) instead of your Firebase login, since this is called
  by an unattended script. Deliberately placed outside `/api/*` so it's
  unaffected by `requireAuth`.
- `client/components/ImageGallery.jsx` + `client/index.jsx` — added a
  "Needs labeling" filter (private + no date) and a `?needsLabel=true` URL
  param so the email can deep-link into it.
- `deploy.sh` — added `WATCHER_API_KEY` to the list of secrets it will
  prompt to create.

## One-time server setup

1. Generate a secret and store it in Secret Manager:
   ```
   openssl rand -hex 32 | gcloud secrets create WATCHER_API_KEY --data-file=- --project=snowarchive-486816
   ```
   (Save the value it printed — you'll need it in `config.json` below.)

2. Wire it into the running Cloud Run service (this repo's `build.yaml`
   only handles build-time `VITE_*` args, so this one's a manual step, same
   as `GCS_BUCKET_NAME` was):
   ```
   gcloud run services update snowarchive \
     --region=us-central1 --project=snowarchive-486816 \
     --set-secrets=WATCHER_API_KEY=WATCHER_API_KEY:latest
   ```

3. Deploy the updated `server.js` / client build as usual (`./deploy.sh` or
   your normal path).

## One-time local setup (this folder)

```
cd watcher
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp config.example.json config.json
```

Edit `config.json`:
- `watch_dir` — the folder to watch (e.g. wherever your phone/camera synced
  photos land).
- `site_url` — your live site URL.
- `watcher_api_key` — the value from step 1 above.
- `gmail_address` / `gmail_app_password` — a Gmail
  [App Password](https://myaccount.google.com/apppasswords) (needs 2FA
  enabled on the account first). Regular Gmail passwords won't work here.
- `notify_to` — where the summary email goes (defaults to
  mightyoakcoder@gmail.com).

Test it in the foreground first:
```
python3 photo_watcher.py
```
Drop a photo into `watch_dir` and confirm you see an "Uploaded ..." line
and get the email within ~60 seconds (uploads are batched for a minute so a
big dump of photos doesn't spam your inbox).

## Running it in the background (launchd)

`com.snowarchive.photowatcher.plist` is pre-filled with this repo's path.
If you used a virtualenv (recommended), update `ProgramArguments` in that
file to point at `venv/bin/python3` instead of `/usr/bin/python3` first.

```
cp com.snowarchive.photowatcher.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.snowarchive.photowatcher.plist
```

It'll now start on login and restart itself if it crashes. Logs go to
`watcher.log` / `watcher.error.log` in this folder.

To stop it:
```
launchctl unload ~/Library/LaunchAgents/com.snowarchive.photowatcher.plist
```

## Known limitations (read before relying on this)

- **Only runs while your Mac is on and awake.** If it's asleep/off when a
  photo lands, it'll pick it up on next wake via a startup scan — not
  real-time, but nothing gets lost.
- **The shared-secret header is simpler than Firebase auth, not stronger.**
  Fine for a personal family site; don't reuse this pattern for anything
  more sensitive without adding rate-limiting/rotation.
- **EXIF date only works for camera/phone photos.** Screenshots or
  already-edited files usually have no EXIF — they'll just show up with a
  blank date, same as before.
- **First run's startup scan uploads everything already in `watch_dir`.**
  If that folder already has old photos in it, point `watch_dir` at an
  empty folder or clear it out before the first run, or you'll get a big
  batch of drafts on day one.
