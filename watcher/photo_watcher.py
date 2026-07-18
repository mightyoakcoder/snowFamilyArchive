#!/usr/bin/env python3
"""
Watches a local folder for new photos and auto-uploads each one to the Snow
Family Archive as a PRIVATE DRAFT (is_private: true, no date/people set).
Nothing is ever auto-published. Every batch of uploads triggers one summary
email with a direct link to the site's "Needs labeling" gallery filter,
where the photos get finished off with the normal edit form.

Setup:
  1. pip install -r requirements.txt
  2. cp config.example.json config.json   and fill it in
  3. python3 photo_watcher.py             (test run in the foreground)
  4. Install as a background service — see ../watcher/README.md

Config lives in config.json next to this script (gitignored — see
config.example.json for the template and README.md for where each value
comes from).
"""

import json
import mimetypes
import os
import smtplib
import ssl
import sys
import threading
import time
from email.mime.text import MIMEText
from pathlib import Path

import requests
from PIL import ExifTags, Image
from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

HERE = Path(__file__).resolve().parent
CONFIG_PATH = HERE / "config.json"
LEDGER_PATH = HERE / "seen_files.json"

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".webp"}
BATCH_WINDOW_SECONDS = 60   # collect new files for this long before uploading as one batch
STABLE_CHECKS = 2           # how many consecutive 1s checks a file's size must hold steady


def load_config():
    if not CONFIG_PATH.exists():
        sys.exit(
            f"Missing config file: {CONFIG_PATH}\n"
            f"Copy config.example.json to config.json and fill it in."
        )
    return json.loads(CONFIG_PATH.read_text())


def load_ledger():
    if LEDGER_PATH.exists():
        return set(json.loads(LEDGER_PATH.read_text()))
    return set()


def save_ledger(seen):
    LEDGER_PATH.write_text(json.dumps(sorted(seen)))


def extract_exif_date(path):
    """Best-effort EXIF DateTimeOriginal -> 'YYYY-MM-DD'. Returns "" if unknown
    (screenshots, edited files, etc. often have none — that's fine, it just
    means the date field stays blank and gets filled in by hand later)."""
    try:
        img = Image.open(path)
        exif = img.getexif()
        for tag_id, value in exif.items():
            tag = ExifTags.TAGS.get(tag_id, tag_id)
            if tag in ("DateTimeOriginal", "DateTime"):
                # EXIF format: "2024:07:04 12:30:00"
                return value.split(" ")[0].replace(":", "-")
    except Exception:
        pass
    return ""


def wait_until_stable(path, checks=STABLE_CHECKS):
    """Blocks until the file's size hasn't changed for `checks` seconds in a
    row — avoids uploading a half-written file (e.g. mid photo-sync)."""
    last_size = -1
    stable_for = 0
    while stable_for < checks:
        try:
            size = os.path.getsize(path)
        except FileNotFoundError:
            return False
        if size == last_size:
            stable_for += 1
        else:
            stable_for = 0
            last_size = size
        time.sleep(1)
    return True


def upload_photo(config, path):
    image_date = extract_exif_date(path)
    content_type = mimetypes.guess_type(path)[0] or "application/octet-stream"
    with open(path, "rb") as f:
        resp = requests.post(
            f"{config['site_url'].rstrip('/')}/watcher/upload",
            headers={"X-Watcher-Key": config["watcher_api_key"]},
            files={"file": (os.path.basename(path), f, content_type)},
            data={"image_date": image_date},
            timeout=60,
        )
    resp.raise_for_status()
    return resp.json()


def send_summary_email(config, uploaded, failed):
    if not uploaded and not failed:
        return

    gallery_link = f"{config['site_url'].rstrip('/')}/gallery?needsLabel=true"
    lines = []
    if uploaded:
        lines.append(f"{len(uploaded)} new photo(s) uploaded as private drafts, waiting to be labeled:\n")
        for item in uploaded:
            lines.append(f"  - {item['original_name']}")
    if failed:
        lines.append(f"\n{len(failed)} file(s) failed to upload:")
        for item in failed:
            lines.append(f"  - {item['name']}: {item['error']}")
    lines.append(f"\nLabel them here: {gallery_link}")
    body = "\n".join(lines)

    msg = MIMEText(body)
    msg["Subject"] = (
        f"{len(uploaded)} new photo(s) need labeling" if uploaded else "Photo watcher: upload failures"
    )
    msg["From"] = config["gmail_address"]
    msg["To"] = config["notify_to"]

    context = ssl.create_default_context()
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
        server.login(config["gmail_address"], config["gmail_app_password"])
        server.sendmail(config["gmail_address"], [config["notify_to"]], msg.as_string())


class BatchUploader:
    """Collects newly-detected files for BATCH_WINDOW_SECONDS, then uploads
    them all and sends ONE summary email — so dropping in 40 photos from an
    event doesn't produce 40 separate emails."""

    def __init__(self, config):
        self.config = config
        self.pending = []
        self.lock = threading.Lock()
        self.timer = None

    def add(self, path):
        with self.lock:
            self.pending.append(path)
            if self.timer is None:
                self.timer = threading.Timer(BATCH_WINDOW_SECONDS, self.flush)
                self.timer.daemon = True
                self.timer.start()

    def flush(self):
        with self.lock:
            batch = self.pending
            self.pending = []
            self.timer = None

        seen = load_ledger()
        uploaded, failed = [], []
        for path in batch:
            if not wait_until_stable(path):
                continue  # file vanished before it finished writing — skip it
            try:
                result = upload_photo(self.config, path)
                uploaded.append({"original_name": os.path.basename(path), "doc_id": result.get("doc_id")})
                seen.add(str(path))
                print(f"Uploaded {path} -> doc {result.get('doc_id')}")
            except Exception as e:
                failed.append({"name": os.path.basename(path), "error": str(e)})
                print(f"FAILED {path}: {e}")

        save_ledger(seen)
        try:
            send_summary_email(self.config, uploaded, failed)
        except Exception as e:
            print(f"Failed to send summary email: {e}")


class NewPhotoHandler(FileSystemEventHandler):
    def __init__(self, batcher, seen):
        self.batcher = batcher
        self.seen = seen

    def _maybe_enqueue(self, path):
        p = Path(path)
        if p.suffix.lower() not in IMAGE_EXTS:
            return
        if str(p) in self.seen:
            return
        self.seen.add(str(p))
        self.batcher.add(str(p))

    def on_created(self, event):
        if not event.is_directory:
            self._maybe_enqueue(event.src_path)


def initial_scan(watch_dir, seen, batcher):
    """Catch anything dropped in while the watcher wasn't running (laptop
    asleep/off). Not real-time, but closes the gap on the next launch."""
    for root, _dirs, files in os.walk(watch_dir):
        for name in files:
            path = str(Path(root) / name)
            if Path(path).suffix.lower() in IMAGE_EXTS and path not in seen:
                seen.add(path)
                batcher.add(path)


def main():
    config = load_config()
    watch_dir = config["watch_dir"]
    if not os.path.isdir(watch_dir):
        sys.exit(f"watch_dir does not exist: {watch_dir}")

    seen = load_ledger()
    batcher = BatchUploader(config)

    initial_scan(watch_dir, seen, batcher)
    save_ledger(seen)

    handler = NewPhotoHandler(batcher, seen)
    observer = Observer()
    observer.schedule(handler, watch_dir, recursive=True)
    observer.start()
    print(f"Watching {watch_dir} for new photos...")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()


if __name__ == "__main__":
    main()
