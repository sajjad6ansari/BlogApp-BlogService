import { NextFunction } from "express";
import { Request, Response } from "express"
import jwt, { JwtPayload } from "jsonwebtoken"
import { IUser } from "../model/User.js";

export interface AuthenticatedRequest extends Request {
  user?: IUser | null;
}

export const isAuth=async(req:AuthenticatedRequest, res:Response, next:NextFunction):Promise<void>=>{
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
    const decoded = await jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    
    if(!decoded || !decoded.user){
      res.status(401).json({ message: "Unauthorized- Invalid Token" });
      return;
    }

    req.user = decoded.user;
    next();
  } catch (error) {
    console.error("JWT Authorization error:", error);
        res.status(401).json({ message: "Unauthorized" });
  }
}

