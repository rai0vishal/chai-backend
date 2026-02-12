import { Router } from "express";
import {asyncHandler} from "../utils/asyncHandler.js";
import {apiError} from "../utils/apiError.js";
import { User } from "../models/user.model.js"; 
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import {apiResponse} from "../utils/apiResponse.js";

const generateAcessAndRefreshTokens = async (userId) => {   
    try{
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken=refreshToken
        await user.save({validateBeforeSave:false})
        
        return {accessToken,refreshToken}

    }catch(error){
        throw new apiError(500,"Something Went wrong while generating refresh and access token")
    }
}
const registerUser = asyncHandler( async (req,res) => {
  
    // get user details form frontend
    //validation - not empty
   // check if user already exists:username,email
   // check for images,check for avatar
   // upload them to cloudinary,avatar
   //create user object - creta ee ntry in db
   // remove password and refresh token field from response
   //check for user creation
   //return response


   const {fullName,email,userName,password}= req.body
   console.log("email",email);
   if (
    [fullName,email,userName,password].some((field) => 
    field.trim() === "")
    ) {
        throw new apiError(400,"All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{userName},{email}]
    })

    if (existedUser) {
        throw new apiError(409,"User with given username or email already exists")
    }
    
    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImageLocalPath = req.files?.coverImage[0]?.
    path;

    if (!avatarLocalPath) {
        throw new apiError (400,"Avatar image is required")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new apiError(500,"Unable to upload avatar image,please try again")
    }

    const user =await User.create({
        fullName,
        avatar:avatar.url,
        coverImage: coverImage?.url || "",
        email,
        userName: userName.toLowerCase(),
        password
    })

    const createdUser= await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if (!createdUser) {
        throw new apiError(500,"Unable to create user,please try again")
    }
    return res.status(201).json(
        new apiResponse(200, createdUser,"User registered successfully")
    )
    
})
const loginUser = asyncHandler( async (req,res) => {
    // get user details form frontend
    //username or email
    //find the user
    //passwoord match
    //generate access token and refresh token
    //send cookie
    
    const{email,userName,password} = req.body
    console.log(email);

    if(!(userName || email)){
        throw new apiError(400,"username or email is required")
    }

    const user =await User.findOne({
        $or:[{userName},{email}]
    })
    
    if(!user){
        throw new apiError(404,"user does not exist")
    }

    const isPasswordValid= await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new apiError(401,"Invalid credentials")
    }

    const{accessToken,refreshToken} =await generateAcessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure:true

    }
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshtoken",refreshToken,options)
    .json(
        new apiResponse(
            200,
            {
                user: loggedInUser,accessToken,refreshToken
            },
                "User logged in successfully")
    )
})

const logoutUser = asyncHandler(async (req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{refreshToken:""}  

        },
        {
            new: true
        }
    ) 
    const options = {
        httpOnly: true,
        secure:true,    
    }  
    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(
        new apiResponse(200,null,"User logged out successfully")
    )


})

export {
    registerUser,
    loginUser,
    logoutUser
}