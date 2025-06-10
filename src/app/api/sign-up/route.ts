import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User";
import bcrypt from "bcryptjs";
import { sendVerificationEmail } from "@/helpers/sendVerificationEmail";
import { NextRequest } from "next/server";

export async function POST(req:NextRequest){
    await dbConnect();
    try {
        const {username,email,password}=await req.json()
        const existByusername = await UserModel.findOne({
            username,
            isVerified:true
        })
        if(existByusername){
            return Response.json(
               {
                success:false,
                message:"Username already exists"
               },
               {
                status:400
               }
            )
        }

        const existByemail = await UserModel.findOne({email})
        
        const verifyCode = Math.floor(100000+Math.random()*900000).toString()
        if(existByemail){
            if(existByemail.isVerified){
                return Response.json({
                    success:false,
                    message:"User exist with this email"
                },{
                    status:400
                }) 
            }else{
                const hashedPassword = await bcrypt.hash(password,10)
                existByemail.password=hashedPassword;
                existByemail.verifyCode=verifyCode
                existByemail.verifyCodeExpiry=new Date(Date.now()+3600000)
                await existByemail.save()
            }

        }else{
           const hashedpassword = await bcrypt.hash(password,10)

           const expiryDate = new Date()
           expiryDate.setDate(expiryDate.getHours() + 1)

           const newuser=new UserModel({
            username,
            email,
            password: hashedpassword,
            verifyCode: verifyCode,
            verifyCodeExpiry:expiryDate,
            isVerified:false,
            isAcceptingMessage: true,
            messages: [] 
           })

           await newuser.save() 
        }
       //send verification email

      const emailResponse = await sendVerificationEmail(email,username,verifyCode)

      if(!emailResponse.success){
        return Response.json({
            success:false,
            message:emailResponse.message
        },{
            status:500
        })
      }

      return Response.json({
        success:true,
        message:"User registered successfully.Please verify your email"
       },{
        status:201
       })
    } catch (error) {
        console.error('Error in Registering User', error);
        return Response.json({
            success:false,
            message:'Error in Registering User'
        },{
            status:500
        })
    }
}