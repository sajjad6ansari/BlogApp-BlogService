import express from "express";
import dotenv from "dotenv";
import blogRoutes from "./routes/blog.js";
import { createClient } from "redis";
dotenv.config();
const app = express();
export const redisClient = createClient({
    url: process.env.REDIS_URL
});
redisClient.connect().then(() => {
    console.log("Connected to Redis");
}).catch((error) => {
    console.error("Error connecting to Redis:", error);
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get("/", (req, res) => {
    res.send("Hello from Blog Service!");
});
app.use("/api/v1", blogRoutes);
app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});
