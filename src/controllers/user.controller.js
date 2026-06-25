import {asyncHandler} from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.modal.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "JsonWebToken"
import mongoose from "mongoose";
const generateAccessAndRefreshTokens = async(userId) => {

    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken= user.generateRefreshToken()

        user.refreshToken=refreshToken
        user.save({validateBeforeSave: false})

        return {accessToken,refreshToken}


    } catch (error) {
        throw new ApiError(500,"Sommething went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler(async(req,res,next)=> {
    //res.status(201).json({
      //  message:"ok"
   // })
  // console.log("req.files:", req.files)


const {fullName,email,userName,password}=req.body
console.log(req.body);

if(
    [fullName,email,userName,password].some((field) => 
   field?.trim() ==="" )
){
    throw new ApiError(400, "all field is required ")
}
const existedUser = await User.findOne({
    $or:[{userName},{email}]
})
if(existedUser) {
    throw new ApiError(409,"user with email or username exist")
}

const avatarLocalPath=req.files?.avatar?.[0]?.path
const coverImageLocalPath= req.files?.coverImage?.[0]?.path

//console.log(req.files)

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
    coverImage: coverImage?.url || "",
    email,
    password,
    userName:userName.toLowerCase()

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
//login
const loginUser=asyncHandler(async(req,res) =>{

    const {email,userName,password}=req.body
    console.log(email);

    if (!(userName || email)){
        throw new ApiError(400, "username or email is required")

    }
    const user = await User.findOne({
        $or: [{userName},{email}]
    })

    if(!user){
        throw new ApiError(404,"User does not exist")
    }

    const isPasswordValid = await user.IsPasswordCorrect(password)
   

    if(!isPasswordValid){
        throw new ApiError(401, "Invalid user credentials")
       

    }
    const {accessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id)

    const loggedInUser= await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {user:loggedInUser,accessToken,refreshToken},
            "User logged In Successfully"
        )
    )

})
const logoutUser = asyncHandler(async(req,res)=> {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly : true,
        secure: true
    }
    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged Out"))
})

const refreshAccessToken= asyncHandler(async(req,res) => {

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "unauthorized request")

    }
    try {
        const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
   const user = await User.findById(decodedToken?._id)

   if(!user) {
    throw new ApiError(401,"Invalid refresh token")
   }
   if(incomingRefreshToken !== user?.refreshToken){
    throw new ApiError(401, "Refresh token is expired or used")

   }
   const options = {

    httpOnly: true,
    secure:true
   }
const {accessToken,newRefreshToken} = await generateAccessAndRefreshTokens(user._id)

return res
.status(200)
.cookie("accessToken", accessToken,options)
.cookie("refreshToken", newRefreshToken,options)
.json(
    new ApiResponse(
        200,
        {accessToken, refreshToken: newRefreshToken},
        "Access token refreshed"
    )
)

    } 
    catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})
const changeCurrentPassword= asyncHandler(async(req,res) => {
 const {oldPassword,newPassword}= req.body

 const user = await User.findById(req.user?._id)

 const isPasswordCorrect = await user.IsPasswordCorrect(oldPassword)

 if(!isPasswordCorrect) {
    throw new ApiError(400,"Invalid Old Password")
 }
 user.password= newPassword

 await user.save({validateBeforeSave:false})

 return res
 .status(200)
 .json(new ApiResponse(200,"Passoword changed succesfully"))
    
})

const getCurrentUser = asyncHandler(async(req,res) => {

    return res 
    .status(200)
    .json(newApiResponse(200,
        req.user,
    "User fetched successfully"))

}
)

const updateAccountDetails = asyncHandler(async(req,res) => {

    const {fullName,email} = req.body

    if(!fullName|| !email) {
        throw new ApiError (400, "All fields required")
    }
    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set : {
                fullName: fullName,
                email: email
            }
        },
      {  new:true}
    ).select("-password")

    return res
    .status(200)
    .json (new ApiResponse (200,user,"Account Details Updated Successfully"))
})

const updateUserAvatar = asyncHandler(async(req,res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError (400,"Avatar is missing")
    }
    const avatar =await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url) {
        throw new ApiError (400,"Error while uploading on avatar ")
    }
    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200,"Avatar updated successfully")
    )

})

const updateUserCoverImage = asyncHandler(async(req,res) => {

    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400,"Cover Image is missing")
    }
    const coverImage =await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading Cover Image")
    }
    const user = await User.findByIdAndUpdate(req.user?._id, {

        $set : {
            coverImage : coverImage.url
        }
    }, {new:true}
).select("-password")

return res
.status(200)
.json(new ApiResponse(
    200,
     "Cover Image updated successfully"
))
})





export {registerUser,
    loginUser,
    logoutUser,
refreshAccessToken}