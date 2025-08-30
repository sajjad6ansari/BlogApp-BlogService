import TryCatchHandler from "../utils/TryCatchHandler.js";
import { sql } from "../utils/db.js";
import axios from "axios";
import { redisClient } from "../server.js";
export const getAllBlogs = TryCatchHandler(async (req, res) => {
    const { searchQuery = "", category = "" } = req.query;
    const cacheKey = `blogs:${searchQuery}:${category}`;
    const cachedBlogs = await redisClient.get(cacheKey);
    if (cachedBlogs) {
        console.log("Cache hit");
        res.json(JSON.parse(cachedBlogs));
        return;
    }
    let blogs;
    if (searchQuery && category) {
        blogs = await sql `
        SELECT * FROM blogs
        WHERE (title ILIKE '%' || ${searchQuery} || '%' 
            OR description ILIKE '%' || ${searchQuery} || '%')
        AND category = ${category}
        ORDER BY created_at DESC
    `;
    }
    else if (searchQuery) {
        blogs = await sql `
        SELECT * FROM blogs
        WHERE title ILIKE '%' || ${searchQuery} || '%'
        OR description ILIKE '%' || ${searchQuery} || '%'
        ORDER BY created_at DESC
    `;
    }
    else if (category) {
        blogs = await sql `
        SELECT * FROM blogs
        WHERE category = ${category}
        ORDER BY created_at DESC
    `;
    }
    else {
        blogs = await sql `
        SELECT * FROM blogs
        ORDER BY created_at DESC
    `;
    }
    console.log("Cache miss");
    await redisClient.set(cacheKey, JSON.stringify(blogs), { EX: 3600 }); // cache for 1 hour=3600seconds
    res.json(blogs);
});
export const getSingleBlog = TryCatchHandler(async (req, res) => {
    const { id } = req.params;
    const cacheKey = `blog:${id}`;
    const cachedBlog = await redisClient.get(cacheKey);
    if (cachedBlog) {
        console.log("Cache hit");
        return res.json(JSON.parse(cachedBlog));
    }
    if (!id) {
        res.status(400).json({ error: "Blog ID is required" });
        return;
    }
    const blog = await sql `
        SELECT * FROM blogs
        WHERE id = ${id}
    `;
    if (blog.length === 0) {
        res.status(404).json({ error: "Blog not found" });
        return;
    }
    const { data } = await axios.get(`${process.env.USER_SERVICE}/api/v1/user/${blog[0].author}`, {
        headers: {
            Authorization: req.headers.authorization // forward token
        }
    });
    const responseData = { blog: blog[0], author: data };
    await redisClient.set(cacheKey, JSON.stringify(responseData), { EX: 3600 }); // cache for 1 hour=3600seconds
    res.json(responseData);
});
