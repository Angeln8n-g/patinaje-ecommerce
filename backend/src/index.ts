import "dotenv/config";
import express from "express";
import cors from "cors";
import { authenticate } from "./lib/auth.js";

import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import contentRoutes from "./routes/content.js";
import orderRoutes from "./routes/orders.js";
import userRoutes from "./routes/users.js";
import cartRoutes from "./routes/cart.js";
import favoriteRoutes from "./routes/favorites.js";
import reviewRoutes from "./routes/reviews.js";
import posRoutes from "./routes/pos.js";
import inventoryRoutes from "./routes/inventory.js";
import deliveryRoutes from "./routes/delivery.js";
import notificationRoutes from "./routes/notifications.js";
import contactRoutes from "./routes/contact.js";
import uploadRoutes from "./routes/upload.js";
import fiscalRoutes from "./routes/fiscal.js";

const app = express();
const PORT = parseInt(process.env.PORT || "4000");

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || "*",
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(authenticate); // Attach user to req if token present

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/pos", posRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/fiscal", fiscalRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🛹 Skating Store API running on port ${PORT}`);
});
