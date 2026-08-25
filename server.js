import "dotenv/config";
import express from "express";
import path from "node:path";
import fs from "node:fs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import { fileURLToPath } from "node:url";
import { securityAlert } from "./security-monitor.js";
import {
  initPersistentStore,
  persistentRead,
  persistentWrite,
  persistentSaveMedia,
  persistentGetMedia
} from "./persistent-store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!JWT_SECRET || !ADMIN_USER || !ADMIN_PASSWORD) {
  console.error("Missing required environment variables.");
  process.exit(1);
}

const dataDir = path.join(__dirname, "data");

const files = {
  orders: path.join(dataDir, "orders.json"),
  products: path.join(dataDir, "products.json"),
  posts: path.join(dataDir, "posts.json"),
  subscribers: path.join(dataDir, "subscribers.json")
};

fs.mkdirSync(dataDir, { recursive: true });

const uploadDir = path.join(__dirname, "public", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    const allowed = [
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
      ".gif"
    ];

    const safeExt = allowed.includes(ext)
      ? ext
      : ".jpg";

    cb(
      null,
      "arwa-" +
      Date.now() +
      "-" +
      Math.random().toString(36).slice(2, 8) +
      safeExt
    );
  }
});

const mediaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    const allowedImages = [
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
      ".gif"
    ];

    const allowedVideos = [
      ".mp4",
      ".webm",
      ".mov"
    ];

    const allowed = [
      ...allowedImages,
      ...allowedVideos
    ];

    const safeExt = allowed.includes(ext)
      ? ext
      : "";

    if (!safeExt) {
      return cb(
        new Error("Unsupported media type.")
      );
    }

    cb(
      null,
      "arwa-" +
      Date.now() +
      "-" +
      Math.random().toString(36).slice(2, 8) +
      safeExt
    );
  }
});

const mediaUpload = multer({
  storage: mediaStorage,

  limits: {
    fileSize: 100 * 1024 * 1024
  },

  fileFilter: (req, file, cb) => {

    const images = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif"
    ];

    const videos = [
      "video/mp4",
      "video/webm",
      "video/quicktime"
    ];

    if (
      images.includes(file.mimetype) ||
      videos.includes(file.mimetype)
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Only JPG, PNG, WEBP, GIF, MP4, WEBM and MOV videos are allowed."
        )
      );
    }
  }
});

const imageUpload = multer({
  storage,

  limits: {
    fileSize: 8 * 1024 * 1024
  },

  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif"
    ];

    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Only JPG, PNG, WEBP and GIF images are allowed."
        )
      );
    }
  }
});


const defaultProducts = [];

function ensureFile(file, fallback = []) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(
      file,
      JSON.stringify(fallback, null, 2)
    );
  }
}

ensureFile(files.orders);
ensureFile(files.products, defaultProducts);
ensureFile(files.posts);
ensureFile(files.subscribers);

const storeKeys = new Map([
  [files.orders, "orders"],
  [files.products, "products"],
  [files.posts, "posts"],
  [files.subscribers, "subscribers"]
]);

function read(file) {
  const key = storeKeys.get(file);

  if (key) {
    return persistentRead(
      key,
      JSON.parse(fs.readFileSync(file, "utf8"))
    );
  }

  return JSON.parse(
    fs.readFileSync(file, "utf8")
  );
}

function write(file, data) {
  const key = storeKeys.get(file);

  if (key) {
    return persistentWrite(key, data);
  }

  fs.writeFileSync(
    file,
    JSON.stringify(data, null, 2)
  );
}

/*
 * Initialize persistent storage BEFORE API routes.
 * This guarantees admin and public APIs use the same
 * current catalog.
 */




async function migrateLocalUploadsToPersistentStorage() {
  if (!process.env.DATABASE_URL) {
    console.warn(
      "ARWA media migration skipped: DATABASE_URL is not configured."
    );
    return;
  }

  if (!fs.existsSync(uploadDir)) {
    return;
  }

  const filesToMigrate = fs.readdirSync(uploadDir);
  let migrated = 0;

  const mimeTypes = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime"
  };

  for (const filename of filesToMigrate) {
    const filePath = path.join(uploadDir, filename);

    let stat;

    try {
      stat = fs.statSync(filePath);
    } catch {
      continue;
    }

    if (!stat.isFile()) {
      continue;
    }

    const buffer = fs.readFileSync(filePath);

    if (!buffer.length) {
      continue;
    }

    const ext = path.extname(filename).toLowerCase();
    const mimeType =
      mimeTypes[ext] || "application/octet-stream";

    await persistentSaveMedia(
      filename,
      mimeType,
      buffer
    );

    migrated++;

    console.log(
      `ARWA media protected: ${filename} (${buffer.length} bytes)`
    );
  }

  console.log(
    `ARWA persistent media migration complete: ${migrated} file(s).`
  );
}

const persistentStoreReady = initPersistentStore({
  orders: JSON.parse(fs.readFileSync(files.orders, "utf8")),
  products: JSON.parse(fs.readFileSync(files.products, "utf8")),
  posts: JSON.parse(fs.readFileSync(files.posts, "utf8")),
  subscribers: JSON.parse(fs.readFileSync(files.subscribers, "utf8"))
}).then(async () => {
  await migrateLocalUploadsToPersistentStorage();
}).catch(error => {
  console.error(
    "ARWA PostgreSQL initialization failed:",
    error.message
  );

  throw error;
});

/*
 * PostgreSQL must be ready BEFORE any API route is allowed
 * to read or write persistent data.
 */
app.use(async (req, res, next) => {
  try {
    await persistentStoreReady;
    next();
  } catch (error) {
    next(error);
  }
});

app.use(express.json({ limit: "1mb" }));

/* PERSISTENT MEDIA */

app.get("/uploads/:filename", async (req, res, next) => {
  const filename = path.basename(req.params.filename);

  try {
    const media = await persistentGetMedia(filename);

    if (media) {
      res.setHeader("Content-Type", media.mime_type);
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      return res.send(media.media_data);
    }

    const localFile = path.join(uploadDir, filename);

    if (fs.existsSync(localFile)) {
      return res.sendFile(localFile);
    }

    return res.status(404).send("Media not found.");
  } catch (error) {
    console.error("ARWA media read failed:", error.message);
    return next(error);
  }
});

app.use(express.static(
  path.join(__dirname, "public")
));

/* SECURITY MONITORING */

const failedLogins = new Map();

function clientIp(req) {
  return (
    req.headers["cf-connecting-ip"] ||
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.ip ||
    "unknown"
  );
}

/*
 * Detect repeated failed admin logins.
 */
app.use("/api/admin/login", async (req, res, next) => {
  if (req.method !== "POST") {
    return next();
  }

  const originalJson = res.json.bind(res);

  res.json = async (body) => {
    if (res.statusCode === 401) {
      const ip = clientIp(req);

      const record = failedLogins.get(ip) || {
        count: 0,
        first: Date.now()
      };

      record.count++;
      failedLogins.set(ip, record);

      if (record.count === 3 || record.count === 5 || record.count >= 10) {
        await securityAlert({
          type:
            record.count >= 10
              ? "POSSIBLE_BRUTE_FORCE"
              : "FAILED_ADMIN_LOGIN",
          req,
          details: {
            attempts: record.count,
            username: req.body?.username || "unknown"
          }
        });
      }
    }

    return originalJson(body);
  };

  next();
});

/*
 * Watch suspicious paths commonly probed by scanners.
 */
app.use(async (req, res, next) => {
  const suspiciousPatterns = [
    "/wp-admin",
    "/wp-login.php",
    "/phpmyadmin",
    "/.env",
    "/config.php",
    "/shell",
    "/cmd",
    "/cgi-bin",
    "/server-status",
    "/actuator",
    "/vendor/phpunit"
  ];

  const pathname = req.path.toLowerCase();

  if (
    suspiciousPatterns.some(
      pattern => pathname === pattern || pathname.startsWith(pattern + "/")
    )
  ) {
    await securityAlert({
      type: "SUSPICIOUS_PATH_SCAN",
      req,
      details: {
        matchedPath: pathname
      }
    });
  }

  next();
});

/*
 * Watch repeated 404 probing.
 */
const notFoundAttempts = new Map();

app.use(async (req, res, next) => {
  const originalStatus = res.status.bind(res);

  res.status = function(code) {
    if (code === 404) {
      const ip = clientIp(req);
      const now = Date.now();

      const record = notFoundAttempts.get(ip) || {
        count: 0,
        window: now
      };

      if (now - record.window > 5 * 60 * 1000) {
        record.count = 0;
        record.window = now;
      }

      record.count++;
      notFoundAttempts.set(ip, record);

      if (record.count === 10 || record.count === 25) {
        securityAlert({
          type: "EXCESSIVE_404_PROBING",
          req,
          details: {
            attempts: record.count
          }
        }).catch(() => {});
      }
    }

    return originalStatus(code);
  };

  next();
});


function authenticate(req, res, next) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Authentication required"
    });
  }

  const token = header.slice(7);

  try {
    req.admin = jwt.verify(
      token,
      JWT_SECRET
    );

    next();
  } catch {
    return res.status(401).json({
      error: "Invalid or expired token"
    });
  }
}


/* HEALTH */

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "ARWA",
    time: new Date().toISOString()
  });
});


/* AUTH */

app.post("/api/admin/login", async (req, res) => {

  const { username, password } =
    req.body || {};

  if (
    username !== ADMIN_USER ||
    password !== ADMIN_PASSWORD
  ) {
    return res.status(401).json({
      error: "Invalid username or password"
    });
  }

  const token = jwt.sign(
    {
      username,
      role: "admin"
    },
    JWT_SECRET,
    {
      expiresIn: "8h"
    }
  );

  res.json({
    success: true,
    token
  });
});


/* PRODUCTS */

app.get("/api/products", (req, res) => {

  const products = read(
    files.products
  );

  res.json(
    products.filter(
      product => product.active !== false
    )
  );
});


app.get(
  "/api/admin/products",
  authenticate,
  (req, res) => {

    res.json(
      read(files.products)
    );

  }
);


app.post(
  "/api/admin/products",
  authenticate,
  imageUpload.single("image"),
  async (req, res) => {

    const {
      name,
      category,
      description,
      price,
      stock
    } = req.body || {};

    if (!name || !category) {
      return res.status(400).json({
        error:
          "Product name and category are required."
      });
    }

    const products =
      read(files.products);

    const product = {
      id:
        "P" +
        Date.now()
          .toString(36)
          .toUpperCase(),

      name:
        String(name).trim(),

      category:
        String(category).trim(),

      description:
        String(description || "").trim(),

      price:
        price === null ||
        price === "" ||
        price === undefined
          ? null
          : Number(price),

      stock:
        Number.isFinite(Number(stock))
          ? Number(stock)
          : 0,

      image:
        req.file &&
        req.file.mimetype.startsWith("image/")
          ? "/uploads/" + req.file.filename
          : "",

      video:
        req.file &&
        req.file.mimetype.startsWith("video/")
          ? "/uploads/" + req.file.filename
          : "",

      active: true
    };

    products.unshift(product);

    try {
      if (
        req.file &&
        process.env.DATABASE_URL
      ) {
        await persistentSaveMedia(
          req.file.filename,
          req.file.mimetype,
          fs.readFileSync(req.file.path)
        );
      }

      await write(
        files.products,
        products
      );

      res.status(201).json(product);
    } catch (error) {
      console.error(
        "ARWA product persistence failed:",
        error.message
      );

      return res.status(500).json({
        error: "Product could not be saved."
      });
    }
  }
);


app.put(
  "/api/admin/products/:id",
  authenticate,
  async (req, res) => {

    const products =
      read(files.products);

    const index =
      products.findIndex(
        p => p.id === req.params.id
      );

    if (index === -1) {
      return res.status(404).json({
        error: "Product not found"
      });
    }

    const old =
      products[index];

    products[index] = {
      ...old,
      ...req.body,
      id: old.id
    };

    try {
      await write(
        files.products,
        products
      );

      res.json(products[index]);
    } catch (error) {
      console.error(
        "ARWA product update persistence failed:",
        error.message
      );

      return res.status(500).json({
        error: "Product update could not be saved."
      });
    }
  }
);


app.delete(
  "/api/admin/products/:id",
  authenticate,
  (req, res) => {

    const products =
      read(files.products);

    const index =
      products.findIndex(
        p => p.id === req.params.id
      );

    if (index === -1) {
      return res.status(404).json({
        error: "Product not found"
      });
    }

    products[index].active = false;

    write(
      files.products,
      products
    );

    res.json({
      success: true
    });
  }
);


/* ORDERS */

app.post("/api/orders", (req, res) => {

  const {
    customer,
    items,
    note
  } = req.body || {};

  if (
    !customer?.name ||
    !customer?.phone ||
    !Array.isArray(items) ||
    !items.length
  ) {
    return res.status(400).json({
      error:
        "Name, phone and at least one product are required."
    });
  }

  const orders =
    read(files.orders);

  const order = {

    id:
      "ARWA-" +
      Date.now()
        .toString(36)
        .toUpperCase(),

    createdAt:
      new Date().toISOString(),

    status: "new",

    customer,

    items,

    note:
      note || ""
  };

  orders.unshift(order);

  write(
    files.orders,
    orders
  );

  res.status(201).json(order);
});


app.get(
  "/api/admin/orders",
  authenticate,
  (req, res) => {

    res.json(
      read(files.orders)
    );

  }
);


app.patch(
  "/api/admin/orders/:id",
  authenticate,
  (req, res) => {

    const orders =
      read(files.orders);

    const order =
      orders.find(
        o => o.id === req.params.id
      );

    if (!order) {
      return res.status(404).json({
        error: "Order not found"
      });
    }

    if (req.body.status) {
      order.status =
        req.body.status;
    }

    write(
      files.orders,
      orders
    );

    res.json(order);
  }
);


/* POSTS */

app.get("/api/posts", (req, res) => {

  res.json(
    read(files.posts)
  );

});


app.post(
  "/api/admin/posts",
  authenticate,
  mediaUpload.single("media"),
  async (req, res) => {

    const {
      title,
      content,
      price,
      category
    } = req.body || {};

    if (!title || !content) {
      return res.status(400).json({
        error:
          "Title and content are required."
      });
    }

    const posts =
      read(files.posts);

    const post = {
      id:
        "POST-" +
        Date.now()
          .toString(36)
          .toUpperCase(),

      title:
        String(title).trim(),

      content:
        String(content).trim(),

      price:
        String(price || "").trim(),

      category:
        String(category || "").trim(),

      image:
        req.file
          ? "/uploads/" + req.file.filename
          : "",

      createdAt:
        new Date().toISOString()
    };

    posts.unshift(post);

    try {
      await write(
        files.posts,
        posts
      );

      res.status(201).json(post);
    } catch (error) {
      console.error(
        "ARWA post persistence failed:",
        error.message
      );

      return res.status(500).json({
        error: "Post could not be permanently stored."
      });
    }
  }
);


/* POST ADMIN CONTROLS */

app.patch(
  "/api/admin/posts/:id",
  authenticate,
  imageUpload.single("image"),
  async (req, res) => {

    const posts = read(files.posts);

    const index = posts.findIndex(
      post => post.id === req.params.id
    );

    if (index === -1) {
      return res.status(404).json({
        error: "Post not found"
      });
    }

    const post = posts[index];

    const {
      title,
      content,
      price,
      category
    } = req.body || {};

    if (title !== undefined)
      post.title = String(title).trim();

    if (content !== undefined)
      post.content = String(content).trim();

    if (price !== undefined)
      post.price = String(price).trim();

    if (category !== undefined)
      post.category = String(category).trim();

    if (req.file) {
      post.image =
        "/uploads/" + req.file.filename;
    }

    post.updatedAt =
      new Date().toISOString();

    posts[index] = post;

    try {
      await write(files.posts, posts);
      res.json(post);
    } catch (error) {
      console.error(
        "ARWA post update persistence failed:",
        error.message
      );

      return res.status(500).json({
        error: "Post update could not be permanently stored."
      });
    }
  }
);


app.delete(
  "/api/admin/posts/:id",
  authenticate,
  async (req, res) => {

    const posts = read(files.posts);

    const index = posts.findIndex(
      post => post.id === req.params.id
    );

    if (index === -1) {
      return res.status(404).json({
        error: "Post not found"
      });
    }

    const deleted =
      posts.splice(index, 1)[0];

    try {
      await write(files.posts, posts);

      res.json({
        success: true,
        post: deleted
      });
    } catch (error) {
      console.error(
        "ARWA post delete persistence failed:",
        error.message
      );

      return res.status(500).json({
        error: "Post deletion could not be permanently stored."
      });
    }
  }
);



/* SUBSCRIBERS */

app.post(
  "/api/subscribers",
  (req, res) => {

    const {
      name,
      phone,
      email
    } = req.body || {};

    if (!phone && !email) {
      return res.status(400).json({
        error:
          "Phone or email is required."
      });
    }

    const subscribers =
      read(files.subscribers);

    const subscriber = {
      id:
        "SUB-" +
        Date.now()
          .toString(36)
          .toUpperCase(),

      name:
        String(name || "").trim(),

      phone:
        String(phone || "").trim(),

      email:
        String(email || "").trim(),

      createdAt:
        new Date().toISOString()
    };

    subscribers.unshift(
      subscriber
    );

    write(
      files.subscribers,
      subscribers
    );

    res.status(201).json({
      success: true
    });
  }
);


app.get(
  "/api/admin/subscribers",
  authenticate,
  (req, res) => {

    res.json(
      read(files.subscribers)
    );

  }
);


/* SECURITY EVENTS */

app.get(
  "/api/admin/security-events",
  authenticate,
  (req, res) => {
    const file = path.join(
      dataDir,
      "security-events.json"
    );

    if (!fs.existsSync(file)) {
      return res.json([]);
    }

    try {
      res.json(
        JSON.parse(
          fs.readFileSync(file, "utf8")
        )
      );
    } catch {
      res.json([]);
    }
  }
);


/* ADMIN STATS */

app.get(
  "/api/admin/stats",
  authenticate,
  (req, res) => {

    const products = read(files.products);
    const orders = read(files.orders);
    const posts = read(files.posts);
    const subscribers = read(files.subscribers);

    res.json({
      success: true,
      products: products.length,
      activeProducts: products.filter(
        product => product.active !== false
      ).length,
      orders: orders.length,
      posts: posts.length,
      subscribers: subscribers.length
    });

  }
);


/* ADMIN DASHBOARD */

app.get("/admin", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "admin.html")
  );
});



app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log("");
    console.log(
      "================================"
    );
    console.log(
      "        ARWA MACHINE PARTS"
    );
    console.log(
      "================================"
    );
    console.log(
      `Local: http://127.0.0.1:${PORT}`
    );
    console.log(
      `Admin: http://127.0.0.1:${PORT}/admin`
    );
    console.log(
      "================================"
    );

  }
);
