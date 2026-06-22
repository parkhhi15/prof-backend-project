import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () =>{
try{
    console.log("DEBUG: The URI being passed is ->", process.env.MONGODB_URI);
    const connectionInstance=await mongoose.connect (`${process.env.MONGODB_URI}/${DB_NAME}`)
console.log(`\n MongoDB connected !! DB HOST :
    ${connectionInstance.connection.host}`);
;
}catch (error){
    console.log("MongoDB connection error",error);
    process.exit(1)

}

}
export default connectDB