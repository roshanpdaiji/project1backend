import validator from 'validator';
import bcrypt from 'bcrypt';
import userModel from '../models/userModel.js';
import jwt from 'jsonwebtoken';
import { v2 as cloudinary } from 'cloudinary';
import doctorModel from '../models/doctorModel.js';
import appointmentModel from '../models/appointmentModel.js';
import razorpay from 'razorpay'


// // API to register User

const registerUser = async (req, res) => {
    try {
        const { name, email, password, dob } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Missing required details' });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({ success: false, message: 'Enter a valid email' });
        }

        if (password.length < 8) {
            return res.status(400).json({ success: false, message: 'Enter a strong password' });
        }

        // Hashing user password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const userData = {
            name,
            email,
            password: hashedPassword,
            dob: dob ? new Date(dob) : null, // Convert to Date if provided, else set null
        };

        const newUser = new userModel(userData);
        const user = await newUser.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

        res.status(201).json({ success: true, token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

//API for user again


const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body; // Corrected "password" spelling
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        // Check if user exists
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User does not exist' });
        }

        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password); // Corrected "user.password" spelling
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid Credentials' });
        }

        // Generate JWT token if password matches
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.status(200).json({ success: true, token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};


//API to get user profile data

const getProfile = async (req, res) => {
    try {
        const { userId } = req.body

        const userData = await userModel.findById(userId).select('-password')

        res.json({ success: true, userData })

    } catch (error) {

        console.log(error)
        res.json({ success: false, message: error.message })

    }
}


//API To Update user Profile



const updateProfile = async (req, res) => {
    try {
        console.log(req.body); // To check other form data
        console.log(req.file);  // To check the file object

        const { userId, name, dob, phone, address, gender } = req.body;
        const imageFile = req.file;

        if (!name || !phone || !dob || !gender) {
            return res.json({ success: false, message: "Missing Details" });
        }

        await userModel.findByIdAndUpdate(userId, { name, phone, address: JSON.parse(address), dob, gender });
        if (imageFile) {
            const streamUpload = (buffer) => {
                return new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        { resource_type: 'image' },
                        (error, result) => {
                            if (error) reject(error);
                            else resolve(result);
                        }
                    );
                    stream.end(buffer);
                });
            };
        
            const imageUpload = await streamUpload(imageFile.buffer);
            const imageURL = imageUpload.secure_url;
        
            await userModel.findByIdAndUpdate(userId, { image: imageURL });
        }
        

        res.json({ success: true, message: 'Profile Updated' });
    } catch (error) {
        console.log(error);  // Log any error
        res.json({ success: false, message: error.message });
    }
};


//API to book Appointment

const bookAppointment = async (req, res) => {
    try {
        const { userId, docId, slotDate, slotTime } = req.body;

        // Validate input
        if (!userId || !docId || !slotDate || !slotTime) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        // Find doctor data
        const docData = await doctorModel.findById(docId).select('-password');
        if (!docData || !docData.available) {
            return res.json({ success: false, message: 'Doctor not available' });
        }

        const slotsBooked = docData.slots_booked || {};

        // Check slot availability
        if (slotsBooked[slotDate]?.includes(slotTime)) {
            return res.json({ success: false, message: 'Slot not available' });
        }

        // Book the slot
        if (!slotsBooked[slotDate]) {
            slotsBooked[slotDate] = [];
        }
        slotsBooked[slotDate].push(slotTime);

        // Find user data
        const userData = await userModel.findById(userId).select('-password');
        if (!userData) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // const appointmentData = {
        //     userId,
        //     docId,
        //     slotDate,
        //     slotTime,
        //     userData,
        //     docData: { name: docData.name, specialization: docData.specialization },
        //     amount: docData.fees,
        // };

        const appointmentData = {
            userId,
            docId,
            slotDate,
            slotTime,
            userData,
            docData: { 
                name: docData.name, 
                specialization: docData.specialization,
                image: docData.image  // Include image
            },
            amount: docData.fees,
        };
        

        // Save appointment
        const newAppointment = new appointmentModel(appointmentData);
        await newAppointment.save();

        // Update doctor's booked slots
        await doctorModel.findByIdAndUpdate(docId, { slots_booked: slotsBooked });

        res.json({ success: true, message: 'Appointment booked successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};


//API to get user appointments for frontend

// const listAppointment = async(req,res)=>{

//     try {
//         const {userId} = req.body
//         const appointments = await appointmentModel.find({userId})
//         res.json({success:true,appointments})
//     } catch (error) {
//         console.log(error)
//         res.json({success:false,message:error.message})
        
//     }
// }


const listAppointment = async (req, res) => {
    try {
        const { userId } = req.body;

        // Check if userId is provided
        if (!userId) {
            return res.status(400).json({ success: false, message: "User ID is required" });
        }

        // Query appointments for the given userId
        const appointments = await appointmentModel.find({ userId }).populate('docData'); // Use populate if you are referencing a Doctor model

        // Check if appointments are found
        if (!appointments.length) {
            return res.status(404).json({ success: false, message: "No appointments found" });
        }

        // Send appointments along with populated doctor data
        res.status(200).json({ success: true, appointments });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "An error occurred while fetching appointments" });
    }
};


//API to cancel Appointment

// const cancelAppointment = async(req,res)=>{
//     try {

//         const {userId,appointmentId} =req.body
//         const appointmentData = await appointmentModel.findById(appointmentId)

//         //Verify appointment user

//         await appointmentModel.findByIdAndUpdate(appointmentId,{cancelled:true})

//         //releasing doctor list

//         const {docId,slotDate,slotTime} =appointmentData

//         const doctorData = await doctorModel.findById(docId)

//         let slots_booked = doctorData.slots_booked

//         slots_booked [slotDate] = slots_booked[slotDate].filter(e=> e !== slotTime)

//         await doctorModel.findByIdAndDelete(docId,{slots_booked})

//         res.json({success:true,message:"Appointment Cancelled"})
//     } catch (error) {
//         console.log(error)
//         res.json({success:false,message:error.message})
//     }
// }

const cancelAppointment = async (req, res) => {
    try {
      const { userId, appointmentId } = req.body;
      const appointmentData = await appointmentModel.findById(appointmentId);
  
      // Verify if the appointment exists and belongs to the correct user
      if (!appointmentData) {
        return res.status(404).json({ success: false, message: 'Appointment not found' });
      }
  
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



  

  const razorpayInstance = new razorpay({
    key_id:process.env.RAZORPAY_KEY_ID,
    key_secret:process.env.RAZORPAY_KEY_SECRET
  })

  //API to  make payment of appoinment using razorpay


const paymentRazorpay = async(req,res)=>{

    try {
        const { appointmentId } = req.body;
    
        const appointmentData = await appointmentModel.findById(appointmentId);
    
        if (!appointmentData || appointmentData.cancelled) {
          return res.status(400).json({ success: false, message: 'Appointment cancelled or not found' });
        }
    
        // Creating options for Razorpay payment
        const options = {
          amount: appointmentData.amount * 100, // Convert to smallest currency unit (e.g., paise for INR)
          currency: process.env.CURRENCY || 'INR', // Default to INR if not set
          receipt: `receipt_${appointmentId}`,
        };
    
        // Creating the order
        const order = await razorpayInstance.orders.create(options);
    
        res.json({ success: true, order });
      } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
      }
    };


    //API to verify payment of razorpay

    // const verifyRazorpay = async(req,res)=>{
    //     try {
    //         const {razorpay_order_id} = req.body
    //         const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id)
    //         console.log(orderInfo)

    //         if (orderInfo.status==='paid') {
    //             await appointmentModel.findByIdAndUpdate(orderInfo.receipt,{payment:true})
    //             res.json({success:true,message:'Payment Successful'}) 
    //         }
    //         else{
    //             res.json({success:false,message:'Payment Failed'})
    //         }

    //     } catch (error) {
    //         console.error(error);
    //         res.status(500).json({ success: false, message: error.message });
    //     }
    // }


    const verifyRazorpay = async (req, res) => {
        try {
          const { razorpay_order_id } = req.body;
      
          if (!razorpay_order_id) {
            return res.status(400).json({ success: false, message: 'Order ID is required' });
          }
      
          // Fetch order details from Razorpay
          const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id);
          console.log('Fetched Order Info:', orderInfo);
      
          const receiptId = orderInfo.receipt;
      
          // If the receipt ID is not a valid ObjectId, remove the check
          if (!receiptId) {
            return res.status(400).json({ success: false, message: 'Receipt ID not found in order' });
          }
      
          if (orderInfo.status === 'paid') {
            // Update the record without converting receiptId to ObjectId
            await appointmentModel.updateOne({ receipt: receiptId }, { payment: true });
      
            res.json({ success: true, message: 'Payment Successful' });
          } else {
            res.json({ success: false, message: 'Payment Failed' });
          }
      
        } catch (error) {
          console.error('Payment verification error:', error);
          res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
      };
      
    
  

export { registerUser, loginUser, getProfile, updateProfile,bookAppointment,listAppointment,cancelAppointment,paymentRazorpay,verifyRazorpay};
