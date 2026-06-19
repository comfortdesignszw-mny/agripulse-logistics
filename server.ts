import express from "express";
import path from "path";
import http from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import feedRoutes from "./server/routes/feedRoutes";
import { dbInit } from "./server/config/db";
import cors from "cors";

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: "*" },
  });
  const PORT = 3000;

  // Initialize DB Schema
  await dbInit();

  app.use(cors());
  app.use(express.json());

  // Inject io into requests so controllers can emit events
  app.use((req: any, res, next) => {
    req.io = io;
    next();
  });

  // API Routes
  app.use("/api/feed", feedRoutes);

  // WebSocket Connection Logic
  io.on("connection", (socket) => {
    console.log(`User connected to Feed Hub: ${socket.id}`);
    
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
