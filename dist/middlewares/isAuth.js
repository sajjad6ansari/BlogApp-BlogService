import jwt from "jsonwebtoken";
export const isAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({ message: "Unauthorized- No Authorization Header" });
            return;
        }
        const token = authHeader?.split(" ")[1];
        if (!token) {
            res.status(401).json({ message: "Unauthorized- No Token Provided" });
            return;
        }
        const decoded = await jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded || !decoded.user) {
            res.status(401).json({ message: "Unauthorized- Invalid Token" });
            return;
        }
        req.user = decoded.user;
        next();
    }
    catch (error) {
        console.error("JWT Authorization error:", error);
        res.status(401).json({ message: "Unauthorized" });
    }
};
