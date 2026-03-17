import express from "express";
import multer from "multer";
import { Storage } from "@google-cloud/storage";
import { Firestore } from "@google-cloud/firestore";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

// ── Firebase Admin (token verification) ───────────────────────────────────
// Locally: set GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
// Cloud Run: credentials are picked up automatically from the service account
admin.initializeApp({ projectId: process.env.VITE_FIREBASE_PROJECT_ID });

// Simple in-memory cache for IP geo lookups
const geoCache = new Map();

async function getGeoInfo(ip) {
  if (!ip || ip === '::1' || ip === '127.0.0.1') return null;
  if (geoCache.has(ip)) return geoCache.get(ip);

  try {
    const token = process.env.IPINFO_TOKEN ? `?token=${process.env.IPINFO_TOKEN}` : '';
    const res = await fetch(`https://ipinfo.io/${ip}/json${token}`);
    if (!res.ok) return null;
    const data = await res.json();
    const geo = {
      city: data.city || null,
      region: data.region || null,
      country: data.country || null,
      org: data.org || null,
    };
    geoCache.set(ip, geo);
    return geo;
  } catch {
    return null;
  }
}

// Skip logging static assets
const ASSET_RE = /\.(js|css|png|jpg|jpeg|svg|ico|woff2?|ttf|map)(\?.*)?$/;
const BOT_PATHS = /wp-admin|wp-login|phpMyAdmin|\.env|setup-config/i;
const INTERNAL_IPS = (process.env.INTERNAL_IPS || '').split(',').map(s => s.trim());

// Log page visits with geo enrichment
app.use((req, _res, next) => {
  if (ASSET_RE.test(req.path)) return next();
  if (BOT_PATHS.test(req.path)) return next();

  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  if (INTERNAL_IPS.includes(ip)) return next();
  
  const referrer = req.headers['referer'] || req.headers['referrer'] || 'direct';
  const userAgent = req.headers['user-agent'] || 'unknown';
  

  // Fire-and-forget so geo lookup doesn't slow the response
  getGeoInfo(ip).then((geo) => {
    console.log(JSON.stringify({
      event: 'visit',
      timestamp: new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }),
      ip,
      referrer,
      userAgent,
      path: req.path,
      ...(geo && { city: geo.city, region: geo.region, country: geo.country, org: geo.org }),
    }));
  });

  next();
});

// Middleware — verifies the Firebase ID token on every /api/ route
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token  = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    req.firebaseUser = await admin.auth().verifyIdToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// GET /api/public/files — no auth required, returns only non-private files
// Supports the same ?search=, ?person=, ?date_from=, ?date_to= filters
app.get("/api/public/files", async (req, res) => {
  try {
    const { search = "", person = "", date_from, date_to } = req.query;
    const snapshot = await db.collection(FILES_COL).get();
    const files = [];

    snapshot.forEach(doc => {
      const data = { ...doc.data(), id: doc.id };

      if (data.is_private === true) return;

      if (person) {
        const match = (data.people || []).some(p =>
          p.toLowerCase().includes(person.toLowerCase())
        );
        if (!match) return;
      }

      if (date_from && data.image_date && data.image_date < date_from) return;
      if (date_to   && data.image_date && data.image_date > date_to)   return;

      if (search) {
        const haystack = `${data.description || ""} ${data.original_filename || ""} ${data.filename || ""}`.toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return;
      }

      files.push(data);
    });

    res.json({ files, count: files.length });
  } catch (err) {
    console.error("Public files list error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Apply auth to all /api/ routes
app.use("/api", requireAuth);

// ── Config ─────────────────────────────────────────────────────────────────
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || "snow-archive-photos";
const PORT        = parseInt(process.env.PORT || "8080", 10);
const ALLOWED_EXT = new Set(["png","jpg","jpeg","gif","pdf","webp"]);
const MAX_SIZE_MB  = 16;

// ── GCP clients ────────────────────────────────────────────────────────────
const storage  = new Storage();
const bucket   = storage.bucket(BUCKET_NAME);
const db       = new Firestore();
const FILES_COL = "uploaded_files";
const AUDIT_COL = "audit_log";

// ── Audit log helper ───────────────────────────────────────────────────────
// Writes a single entry to the audit_log collection. Fire-and-forget —
// we never let a logging failure block the actual response.
function writeAuditLog({ action, fileId, filename, user, detail = {} }) {
  const entry = {
    action,                          // "upload" | "edit" | "delete" | "view"
    file_id:    fileId   || null,
    filename:   filename || null,
    user_uid:   user?.uid   || null,
    user_email: user?.email || null,
    user_name:  user?.name  || null,
    detail,                          // action-specific payload
    timestamp:  Firestore.Timestamp.now(),
  };
  db.collection(AUDIT_COL).add(entry).catch(err =>
    console.error("Audit log write failed:", err)
  );
}

// ── Multer (in-memory, so we can stream straight to GCS) ───────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const ext = file.originalname.split(".").pop().toLowerCase();
    cb(null, ALLOWED_EXT.has(ext));
  },
});

// ── Helpers ────────────────────────────────────────────────────────────────
function parsePeopleString(str) {
  return str ? str.split(",").map(p => p.trim()).filter(Boolean) : [];
}

function timestamp() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}_${String(d.getHours()).padStart(2,"0")}${String(d.getMinutes()).padStart(2,"0")}${String(d.getSeconds()).padStart(2,"0")}`;
}

// Upload a Buffer to GCS and return the blob
function uploadToGCS(buffer, filename, contentType) {
  return new Promise((resolve, reject) => {
    const blob   = bucket.file(filename);
    const stream = blob.createWriteStream({ contentType, resumable: false });
    stream.on("error", reject);
    stream.on("finish", () => resolve(blob));
    stream.end(buffer);
  });
}

// ── Routes ─────────────────────────────────────────────────────────────────

// Health check
app.get("/health", (_req, res) => res.json({ status: "healthy" }));

// Proxy image by Firestore doc ID (keeps same URL scheme as Flask app)
app.get("/proxy/:docId", async (req, res) => {
  try {
    const doc = await db.collection(FILES_COL).doc(req.params.docId).get();
    if (!doc.exists) return res.status(404).send("Not found");

    const { filename, content_type } = doc.data();
    const blob = bucket.file(filename);
    const [exists] = await blob.exists();
    if (!exists) return res.status(404).send("File not in GCS");

    res.setHeader("Content-Type", content_type || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=3600");
    blob.createReadStream().pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/upload
app.post("/api/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file provided or file type not allowed" });

  try {
    const { image_date = "", people = "", description = "", is_private = "false" } = req.body;
    const peopleList    = parsePeopleString(people);
    const originalName  = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueId      = uuidv4().slice(0, 8);
    const filename      = `${timestamp()}_${uniqueId}_${originalName}`;
    const contentType   = req.file.mimetype || "application/octet-stream";

    await uploadToGCS(req.file.buffer, filename, contentType);

    const blob    = bucket.file(filename);
    const [meta]  = await blob.getMetadata();
    const fileUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${filename}`;

    const docRef = db.collection(FILES_COL).doc();
    const fileMetadata = {
      filename,
      original_filename: originalName,
      url:          fileUrl,
      content_type: contentType,
      size:         parseInt(meta.size, 10),
      uploaded_at:  Firestore.Timestamp.now(),
      image_date:   image_date || null,
      people:       peopleList,
      description:  description || null,
      is_private:   is_private === "true",
    };
    await docRef.set(fileMetadata);

    writeAuditLog({
      action:   "upload",
      fileId:   docRef.id,
      filename: originalName,
      user:     req.firebaseUser,
      detail:   { size: fileMetadata.size, is_private: fileMetadata.is_private },
    });

    res.json({
      success:           true,
      filename,
      original_filename: originalName,
      url:               fileUrl,
      doc_id:            docRef.id,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: `Upload failed: ${err.message}` });
  }
});

// POST /api/uploadmulti — accepts up to 20 files, each with its own metadata
// FormData fields per file (indexed): file_0, image_date_0, people_0, description_0, is_private_0 …
app.post("/api/uploadmulti", upload.any(), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "No files provided or file types not allowed" });
  }
  const MAX_FILES = 20;
  if (req.files.length > MAX_FILES) {
    return res.status(400).json({ error: `Too many files — maximum is ${MAX_FILES}` });
  }

  const results = await Promise.all(
    req.files.map(async (file) => {
      const idx         = file.fieldname.replace(/^file_?/, "");
      const image_date  = req.body[`image_date_${idx}`]  || "";
      const people      = req.body[`people_${idx}`]      || "";
      const description = req.body[`description_${idx}`] || "";
      const is_private  = req.body[`is_private_${idx}`]  || "false";

      const peopleList   = parsePeopleString(people);
      const originalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      const uniqueId     = uuidv4().slice(0, 8);
      const filename     = `${timestamp()}_${uniqueId}_${originalName}`;
      const contentType  = file.mimetype || "application/octet-stream";

      try {
        await uploadToGCS(file.buffer, filename, contentType);
        const blob    = bucket.file(filename);
        const [meta]  = await blob.getMetadata();
        const fileUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${filename}`;

        const docRef = db.collection(FILES_COL).doc();
        await docRef.set({
          filename,
          original_filename: originalName,
          url:          fileUrl,
          content_type: contentType,
          size:         parseInt(meta.size, 10),
          uploaded_at:  Firestore.Timestamp.now(),
          image_date:   image_date || null,
          people:       peopleList,
          description:  description || null,
          is_private:   is_private === "true",
        });

        const result = { success: true, filename, original_filename: originalName, url: fileUrl, doc_id: docRef.id };

        writeAuditLog({
          action:   "upload",
          fileId:   docRef.id,
          filename: originalName,
          user:     req.firebaseUser,
          detail:   { size: parseInt(meta.size, 10), is_private: is_private === "true" },
        });

        return result;
      } catch (err) {
        console.error(`Upload error for ${originalName}:`, err);
        return { success: false, original_filename: originalName, error: err.message };
      }
    })
  );

  const succeeded = results.filter(r => r.success).length;
  const failed    = results.length - succeeded;
  res.status(failed === results.length ? 500 : 200).json({
    results,
    summary: { total: results.length, succeeded, failed },
  });
});

// GET /api/files  — supports ?search=, ?person=, ?date_from=, ?date_to=
app.get("/api/files", async (req, res) => {
  try {
    const { search = "", person = "", date_from, date_to } = req.query;
    const snapshot = await db.collection(FILES_COL).get();
    const files = [];

    snapshot.forEach(doc => {
      const data = { ...doc.data(), id: doc.id };

      // person filter (partial, case-insensitive)
      if (person) {
        const match = (data.people || []).some(p =>
          p.toLowerCase().includes(person.toLowerCase())
        );
        if (!match) return;
      }

      // date range filter
      if (date_from && data.image_date && data.image_date < date_from) return;
      if (date_to   && data.image_date && data.image_date > date_to)   return;

      // text search across description + filenames
      if (search) {
        const haystack = `${data.description || ""} ${data.original_filename || ""} ${data.filename || ""}`.toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return;
      }

      files.push(data);
    });

    res.json({ files, count: files.length });
  } catch (err) {
    console.error("Files list error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/files/:id  — body: { field, value }
app.patch("/api/files/:id", async (req, res) => {
  try {
    const { field, value } = req.body;
    const ALLOWED_FIELDS = new Set(["image_date","people","description","is_private"]);

    if (!field || !ALLOWED_FIELDS.has(field)) {
      return res.status(400).json({ error: "Invalid or missing field name" });
    }

    const docRef = db.collection(FILES_COL).doc(req.params.id);
    const doc    = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "File not found" });

    const previousValue = doc.data()[field];

    let updateValue;
    if (field === "people") {
      updateValue = parsePeopleString(value);
    } else if (field === "image_date") {
      updateValue = value || null;
    } else if (field === "is_private") {
      updateValue = value === true || value === "true";
    } else {
      updateValue = value || null;
    }

    await docRef.update({ [field]: updateValue });

    writeAuditLog({
      action:   "edit",
      fileId:   req.params.id,
      filename: doc.data().original_filename,
      user:     req.firebaseUser,
      detail:   { field, from: previousValue, to: updateValue },
    });

    res.json({ success: true, file_id: req.params.id, field, value: updateValue });
  } catch (err) {
    console.error("Patch error:", err);
    res.status(500).json({ error: `Update failed: ${err.message}` });
  }
});

// DELETE /api/files/:id
app.delete("/api/files/:id", async (req, res) => {
  try {
    const docRef = db.collection(FILES_COL).doc(req.params.id);
    const doc    = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "File not found" });

    const { filename } = doc.data();
    if (filename) {
      const blob = bucket.file(filename);
      const [exists] = await blob.exists();
      if (exists) await blob.delete();
    }

    await docRef.delete();

    writeAuditLog({
      action:   "delete",
      fileId:   req.params.id,
      filename: doc.data().original_filename,
      user:     req.firebaseUser,
      detail:   { was_private: doc.data().is_private || false },
    });

    res.json({ success: true, file_id: req.params.id });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: `Delete failed: ${err.message}` });
  }
});

// POST /api/files/:id/view — logs a view event (called by the frontend on lightbox open)
app.post("/api/files/:id/view", async (req, res) => {
  try {
    const doc = await db.collection(FILES_COL).doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: "File not found" });

    writeAuditLog({
      action:   "view",
      fileId:   req.params.id,
      filename: doc.data().original_filename,
      user:     req.firebaseUser,
      detail:   {},
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/audit — returns audit log entries, newest first
// Supports ?file_id=, ?action=, ?limit= (default 200)
app.get("/api/audit", async (req, res) => {
  try {
    const { file_id, action, limit = "200" } = req.query;
    const maxResults = Math.min(parseInt(limit, 10) || 200, 500);

    let query = db.collection(AUDIT_COL).orderBy("timestamp", "desc").limit(maxResults);
    if (file_id) query = query.where("file_id", "==", file_id);
    if (action)  query = query.where("action",  "==", action);

    const snapshot = await query.get();
    const entries  = [];
    snapshot.forEach(doc => entries.push({ id: doc.id, ...doc.data() }));

    res.json({ entries, count: entries.length });
  } catch (err) {
    console.error("Audit log fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── Serve Vite production build ────────────────────────────────────────────
// In production (Cloud Run), Express serves the built React app.
// In development, Vite dev server runs separately on its own port.
if (process.env.NODE_ENV === "production") {
  const DIST = path.join(__dirname, "dist");
  app.use(express.static(DIST));
  app.get("*", (_req, res) => res.sendFile(path.join(DIST, "index.html")));
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
