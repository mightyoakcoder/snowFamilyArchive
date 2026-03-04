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
    const { image_date = "", people = "", description = "" } = req.body;
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
    };
    await docRef.set(fileMetadata);

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
    const ALLOWED_FIELDS = new Set(["image_date","people","description"]);

    if (!field || !ALLOWED_FIELDS.has(field)) {
      return res.status(400).json({ error: "Invalid or missing field name" });
    }

    const docRef = db.collection(FILES_COL).doc(req.params.id);
    const doc    = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "File not found" });

    let updateValue;
    if (field === "people") {
      updateValue = parsePeopleString(value);
    } else if (field === "image_date") {
      updateValue = value || null;
    } else {
      updateValue = value || null;
    }

    await docRef.update({ [field]: updateValue });
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
    res.json({ success: true, file_id: req.params.id });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: `Delete failed: ${err.message}` });
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
