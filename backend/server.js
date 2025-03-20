import express from "express"
const app = express()
import dotenv from "dotenv"
import db from "./db.js"
dotenv.config();

app.use(express.json())


const PORT=process.env.PORT;
app.listen(PORT,()=>{
    console.log("Listening on port ",PORT);
    
})