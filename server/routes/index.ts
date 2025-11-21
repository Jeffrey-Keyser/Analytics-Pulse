import express, { Request, Response, NextFunction } from 'express';

const router = express.Router();

/* GET home page. */
router.get("/", function (req: Request, res: Response, next: NextFunction) {
  res.status(200).json({ 
    title: "Myrrs API",
    message: "Welcome to the API",
    documentation: "/api-docs"
  });
});

router.get("/ping", function (req: Request, res: Response, next: NextFunction) {
  res.status(200).send("pong");
});

// Health check endpoint is now handled by express-server-factory

export default router; 