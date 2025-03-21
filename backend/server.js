import express from "express"
const app = express()
import dotenv from "dotenv"
import { v4 as uuidv4 } from "uuid";
import db from "./db.js"
import cookieParser from "cookie-parser";
app.use(cookieParser());

app.use((req, res, next) => {
  if (!req.cookies.sessionId) {
    const sessionId = uuidv4(); 
    res.cookie("sessionId", sessionId, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }); 
  }
  next();
});
dotenv.config();

app.use(express.json())
import userRoute from "./routes/userRoute.js"
import adminRoute from "./routes/adminRoute.js"
app.use('/api/user',userRoute)
app.use('/api/admin',adminRoute)
const PORT=process.env.PORT;
app.listen(PORT,()=>{
    console.log("Listening on port ",PORT);
    
})