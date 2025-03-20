import mongoose from "mongoose"
import dotenv from "dotenv"
dotenv.config()

const MONGO_URL=process.env.MONGO_URL
mongoose.connect(MONGO_URL,{
    useNewUrlParser:true,
    useUnifiedTopology:true
})

const db = mongoose.connection;
db.on('connected',()=>{
    console.log("Connected to MongoDb Server")
})
db.on("error",(err)=>{
    console.error('MongoDb connection error :',err)
})
db.on('disconnected',()=>{
    console.log('Disconnected from MongoDb Server')
})

export default mongoose;