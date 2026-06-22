import {asyncHandler} from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.modal.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";

const registerUser = asyncHandler(async(req,res)=> {
    res.status(201).json({
        message:"ok"
    })


const {fullName,email,password}=req.body
console.log("email:",email);

if(
    [fullName,email,userName,password].some((filed) => 
   field?.trim() ==="" )
){
    throw new ApiError(400, "all field is required ")
}
const existedUser = User.findOne({
    $or:[{userName},{email}]
})
if(existedUser) {
    throw new ApiError(409,"user with email or username exist")
}

const avatarLocalPath=req.files?.avatar[0]?.path
const coverImageLocalPath= req.files.coverImage.path

if(!avatarLocalPath){
    throw new ApiError(400,"avatar is required")
}
const avatar= await uploadOnCloudinary(avatarLocalPath)
const coverImage=await uploadOnCloudinary(coverImageLocalPath)

if(!avatar){
    throw new ApiError(400,"avatar is required")
}
const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url|| "",
    email,
    password,
    userName=userName.toLowerCase()

})

const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
)

if(!createdUser) {
    throw new ApiError(500,"something went wrong while registering the user")
    
}
return res.status(201).json(
    new ApiResponse(200, createdUser, "user registered successfully")
)

})

export {registerUser}