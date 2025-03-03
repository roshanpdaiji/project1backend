import validator from 'validator';
import bcrypt from 'bcrypt';
import { v2 as cloudinary } from 'cloudinary';
import doctorModel from '../models/doctorModel.js';
import stream from 'stream';
import jwt from 'jsonwebtoken'
import appointmentModel from '../models/appointmentModel.js';
import userModel from '../models/userModel.js';



// API for adding doctor
const addDoctor = async (req, res) => {
    try {
        const { name, email, password, speciality, degree, experience, about, fees, address } = req.body;
        const imageFile = req.file;

        console.log({ name, email, password, speciality, degree, experience, about, fees, address }, imageFile);

        // Checking for all required data to add a doctor
        if (!name || !email || !password || !speciality || !degree || !experience || !about || !fees || !address) {
            return res.json({ success: false, message: "Missing details" });
        }

        // Validate email format
        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Please enter a valid email" });
        }

        // Validate strong password
        if (password.length < 8) {
            return res.json({ success: false, message: "Please enter a strong password" });
        }

        // Validate image file
        if (!imageFile || !imageFile.buffer) {
            return res.json({ success: false, message: "Image file is required" });
        }

        // Parse address
        let parsedAddress;
        try {
            parsedAddress = typeof address === 'string' ? JSON.parse(address) : address;
        } catch (err) {
            return res.json({ success: false, message: "Invalid address format" });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Upload image to Cloudinary
        const bufferStream = new stream.PassThrough();
        bufferStream.end(imageFile.buffer);

        const imageUpload = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                { resource_type: "image" },
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            ).end(imageFile.buffer);
        });

        // Create the doctor object
        const DoctorData = {
            name,
            email,
            password: hashedPassword,
            image: imageUpload.secure_url,
            speciality,
            degree,
            experience,
            about,
            fees,
            address: parsedAddress,
            date: Date.now(),
            slot_booked: {}
        };

        // Save the doctor to the database
        const newDoctor = new doctorModel(DoctorData);
        await newDoctor.save();

        return res.json({ success: true, message: "Doctor added successfully", doctor: newDoctor });

    } catch (err) {
        console.error("Error adding doctor:", err);
        return res.json({ success: false, message: "Error adding doctor", error: err.message });
    }
};



//API for admin login


const loginAdmin = async(req,res)=>{
    try {
        const {email,password} = req.body
        if(email===process.env.ADMIN_EMAIL && password=== process.env.ADMIN_PASSWORD){
            const token = jwt.sign(email+password,process.env.JWT_SECRET)
            res.json({successs:true,token})
        }
        else{
            res.json({success:false,message:'Invalid Credentials'})
        }
    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
        
    }
}


//API to get all doctors list for admin panel


const allDoctors = async(req,res)=>{
    try {
        const doctors = await doctorModel.find({}).select('-password')
        res.json({success:true,doctors})
    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
        
    }
}


//API To get all appointment list

const appointmentAdmin = async(req,res)=>{
    try {
        const appointments = await appointmentModel.find({})
        res.json({success:true,appointments})
    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }
}


//API for Appointmnet cancellation

const appointmentCancel = async (req, res) => {
    try {
      const {appointmentId } = req.body;
      const appointmentData = await appointmentModel.findById(appointmentId);
  
   
      // Update the appointment status to cancelled
      await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true });
  
      // Release doctor slot
      const { docId, slotDate, slotTime } = appointmentData;
  
      const doctorData = await doctorModel.findById(docId);
      if (!doctorData) {
        return res.status(404).json({ success: false, message: 'Doctor not found' });
      }
  
      let slots_booked = doctorData.slots_booked || {}; // Handle case where slots_booked might be undefined
      if (slots_booked[slotDate]) {
        slots_booked[slotDate] = slots_booked[slotDate].filter(e => e !== slotTime);
      }
  
      // Update doctor's booked slots
      await doctorModel.findByIdAndUpdate(docId, { slots_booked });
  
      res.json({ success: true, message: 'Appointment Cancelled' });
    } catch (error) {
      console.log(error);
      res.json({ success: false, message: error.message });
    }
  };


//API to get dashboard data for admin panel

const adminDashboard = async(req,res)=>{
    try {
        const doctors = await doctorModel.find({})
        const users = await userModel.find({})
        const appointments = await appointmentModel.find({})

        const dashData = {
            doctors:doctors.length,
            appointments:appointments.length,
            patients:users.length,
            latestAppointments:appointments.reverse().slice(0,5)
        }

        res.json({success:true,dashData})

    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }
}
  

export { addDoctor,loginAdmin,allDoctors ,appointmentAdmin,appointmentCancel,adminDashboard};