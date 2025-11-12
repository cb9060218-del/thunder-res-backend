import express from "express";
import cors from "cors";
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ✅ Test DB
pool.connect()
  .then(() => console.log("✅ Database connected successfully"))
  .catch((err) => console.error("❌ DB connection error:", err));

// ✅ Get menu
app.get("/api/menu", async (req, res) => {
  const result = await pool.query("SELECT * FROM menu_items ORDER BY id ASC");
  res.json(result.rows);
});

// ✅ Add new menu item
app.post("/api/menu", async (req, res) => {
  const { name, price, category, image_url } = req.body;
  await pool.query(
    "INSERT INTO menu_items (name, price, category, image_url) VALUES ($1, $2, $3, $4)",
    [name, price, category, image_url]
  );
  res.json({ success: true });
});

// ✅ Create new order
app.post("/api/order", async (req, res) => {
  const client = await pool.connect();
  try {
    const { table_no, items } = req.body;
    let total = 0;
    items.forEach((i) => (total += i.qty * i.price || 0));

    // 1️⃣ Create order
    const orderResult = await client.query(
      "INSERT INTO orders (table_no, total, status) VALUES ($1, $2, 'pending') RETURNING id",
      [table_no, total]
    );

    const orderId = orderResult.rows[0].id;

    // 2️⃣ Add items
    for (const item of items) {
      await client.query(
        "INSERT INTO order_items (order_id, item_id, quantity) VALUES ($1, $2, $3)",
        [orderId, item.id, item.qty]
      );
    }

    res.json({ success: true, order_id: orderId });
  } catch (err) {
    console.error("❌ Order error:", err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});

// ✅ Get all orders with item details
app.get("/api/orders", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        o.id AS order_id,
        o.table_no,
        o.total,
        o.status,
        o.created_at,
        json_agg(
          json_build_object(
            'name', m.name,
            'price', m.price,
            'quantity', oi.quantity
          )
        ) AS items
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN menu_items m ON oi.item_id = m.id
      GROUP BY o.id
      ORDER BY o.created_at DESC;
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching orders:", err);
    res.status(500).json({ error: err.message });
  }
});


// ✅ Mark order ready
app.put("/api/orders/:id/ready", async (req, res) => {
  await pool.query("UPDATE orders SET status='ready' WHERE id=$1", [req.params.id]);
  res.json({ success: true });
});

app.listen(10000, () => console.log("⚡ Server live on port 10000"));
