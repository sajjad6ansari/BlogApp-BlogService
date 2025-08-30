import { NextFunction, RequestHandler, Request, Response } from "express";

const TryCatchHandler=(handler:RequestHandler ):RequestHandler=>{
  return async(req:Request,res:Response,next:NextFunction)=>{
    try {
      await handler(req,res,next);
    } catch (error:any ) {
      res.status(500).json({ message: error.message });
    }
  };
};

export default TryCatchHandler;
