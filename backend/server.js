import express from "express";
const app = express();
import dotenv from "dotenv";
dotenv.config();
import db from "./db.js";
import cookieParser from "cookie-parser";
import cors from "cors";
app.use(cors({ origin: "http://localhost:3001", credentials: true }));
app.use(cookieParser());
app.use(express.json());
import userRoute from "./routes/userRoute.js";
import adminRoute from "./routes/adminRoute.js";
app.use("/api/user", userRoute);
app.use("/api/admin", adminRoute);
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log("Listening on port ", PORT);
});
