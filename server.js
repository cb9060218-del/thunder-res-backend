import express from "express";
import cors from "cors";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
// ✅ Test database connection on startup
db.connect()
  .then(() => console.log("✅ Database connected successfully"))
  .catch((err) => console.error("❌ Database connection failed:", err));


// ✅ Root route test
app.get("/", (req, res) => {
  res.send("Thunder QR Backend Running ⚡");
});

// ✅ Fetch all menu items
app.get("/api/menu", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM menu_items WHERE available=true ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching menu");
  }
});

// ✅ Add new menu item
app.post("/api/menu", async (req, res) => {
  const { name, price, category, image_url } = req.body;
  try {
    await db.query(
      "INSERT INTO menu_items (name, price, category, image_url) VALUES ($1, $2, $3, $4)",
      [name, price, category, image_url]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error adding item");
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server live on ${PORT}`));
