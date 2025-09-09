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
    console.log(req.headers);
    const { data } = await axios.get(`${process.env.USER_SERVICE}/api/v1/user/${blog[0].author}`, {
        headers: {
            Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7Il9pZCI6IjY4YmRjZGE5ZjlhNjc4YWZkOTVhZTI3NiIsIm5hbWUiOiJBaGxhbiIsImVtYWlsIjoia2hheDMxM0BnbWFpbC5jb20iLCJpbWFnZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0ktb2t5elRmWmpRQ21YQkhZZzFZczMtdHFmWlR4aW9fVjBzdUN0S3ZEcjlhRWNuUT1zOTYtYyIsImNyZWF0ZWRBdCI6IjIwMjUtMDktMDdUMTg6MjM6MzcuMTIyWiIsInVwZGF0ZWRBdCI6IjIwMjUtMDktMDdUMTg6MjM6MzcuMTIyWiIsIl9fdiI6MH0sImlhdCI6MTc1NzM1MjYwOSwiZXhwIjoxNzU3Nzg0NjA5fQ.IR0TUrMQuiq2dBzmAhvc2yfI20gWh1yobc03sHQdVz0` // forward token
        }
    });
    const responseData = { blog: blog[0], author: data };
    await redisClient.set(cacheKey, JSON.stringify(responseData), { EX: 3600 }); // cache for 1 hour=3600seconds
    res.json(responseData);
});
export const addComment = TryCatchHandler(async (req, res) => {
    const { id: blogid } = req.params;
    const { comment } = req.body;
    await sql `INSERT INTO comments (comment, blog_id, user_id, username) VALUES (${comment}, ${blogid}, ${req.user?._id}, ${req.user?.name}) RETURNING *`;
    res.json({
        message: "Comment Added",
    });
});
export const getAllComments = TryCatchHandler(async (req, res) => {
    const { id } = req.params;
    const comments = await sql `SELECT * FROM comments WHERE blog_id = ${id} ORDER BY created_at DESC`;
    res.json(comments);
});
export const deleteComment = TryCatchHandler(async (req, res) => {
    const { commentid } = req.params;
    const comment = await sql `SELECT * FROM comments WHERE id = ${commentid}`;
    console.log(comment);
    if (comment[0].userid !== req.user?._id) {
        res.status(401).json({
            message: "You are not owner of this comment",
        });
        return;
    }
    await sql `DELETE FROM comments WHERE id = ${commentid}`;
    res.json({
        message: "Comment Deleted",
    });
});
export const saveBlog = TryCatchHandler(async (req, res) => {
    const { blogid } = req.params;
    const userid = req.user?._id;
    if (!blogid || !userid) {
        res.status(400).json({
            message: "Missing blog id or userid",
        });
        return;
    }
    const existing = await sql `SELECT * FROM savedblogs WHERE userid = ${userid} AND blogid = ${blogid}`;
    if (existing.length === 0) {
        await sql `INSERT INTO savedblogs (blog_id, user_id) VALUES (${blogid}, ${userid})`;
        res.json({
            message: "Blog Saved",
        });
        return;
    }
    else {
        await sql `DELETE FROM savedblogs WHERE user_id = ${userid} AND blog_id = ${blogid}`;
        res.json({
            message: "Blog Unsaved",
        });
        return;
    }
});
export const getSavedBlog = TryCatchHandler(async (req, res) => {
    const blogs = await sql `SELECT * FROM savedblogs WHERE user_id = ${req.user?._id}`;
    res.json(blogs);
});
