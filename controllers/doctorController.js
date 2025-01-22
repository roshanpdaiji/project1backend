import doctorModel from '../models/doctorModel.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import appointmentModel from '../models/appointmentModel.js'

const changeAvailability = async(req,res)=>{
    try {
        const {docId} = req.body

        const docData = await doctorModel.findById(docId)

        await doctorModel.findByIdAndUpdate(docId,{available:!docData.available})
        res.json({success:true,message:'Availability Changed'})

    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }
}


const doctorList = async(req,res)=>{
    try {
        const doctors = await doctorModel.find({}).select(['-passowrd','-email'])

        res.json({success:true,doctors})

    } catch (error) {
         console.log(error)
        res.json({success:false,message:error.message})
    }
}

//API For doctor login

const loginDoctor = async(req,res)=>{
    try {
        const {email,password}=req.body
        const doctor = await doctorModel.findOne({email})
        if (!doctor) {
            return res.json({success:false,message:'Invalid Credentials'})
        }
        const isMatch = await bcrypt.compare(password,doctor.password)
        if (isMatch) {
            const token = jwt.sign({id:doctor._id},process.env.JWT_SECRET)
            res.json({success:true,token})
        }
        else{
            res.json({success:false,message:'Invalid Credentials'})
        }
    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
        
    }
}


//API to get doctor appointments for doctor panel

const appointmentsDoctor = async(req,res)=>{
    try {
        const {docId}=req.body
        const appointments = await appointmentModel.find({docId})

        res.json({success:true,appointments})

    } catch (error) {
          console.log(error);
        res.json({success:false,message:error.message})
    }
}

// API to mark appointment complete
const appointmentComplete = async (req, res) => {
    try {
        const { docId, appointmentId } = req.body;

        if (!docId || !appointmentId) {
            return res.json({ success: false, message: "Missing required fields" });
        }

        const appointmentData = await appointmentModel.findById(appointmentId);

        if (appointmentData && appointmentData.docId.toString() === docId.toString()) {
            await appointmentModel.findByIdAndUpdate(appointmentId, { isCompleted: true });
            return res.json({ success: true, message: 'Appointment Completed' });
        } else {
            return res.json({ success: false, message: "Mark Failed" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// API to cancel an appointment
const appointmentCancel = async (req, res) => {
    try {
        const { docId, appointmentId } = req.body;

        if (!docId || !appointmentId) {
            return res.json({ success: false, message: "Missing required fields" });
        }

        const appointmentData = await appointmentModel.findById(appointmentId);

        if (appointmentData && appointmentData.docId.toString() === docId.toString()) {
            await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true });
            return res.json({ success: true, message: 'Appointment Cancelled' });
        } else {
            return res.json({ success: false, message: "Cancellation Failed" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};



//API to get dashboard data for doctor panel


// const doctorDashboard = async()=>{
//     try {
//         const {docId} = req.body

//         const appointments = await appointmentModel.find({docId})

//         let earnings = 0

//         appointments.map((item)=>{
// if (item.isCompleted || item.payment) {
//     earnings += item.amount
// }
//         })

//         let patients = []

//         appointments.map((item)=>{
//             if (!patients.includes(item.userId)) {
//                 patients.push(item.userId)
//             }
//         })

//         const dashData = {
//             earnings,
//             appointments:appointments.length,
//             patients:patients.length,
//             latestAppointments:appointments.reverse().slice(0,5)
//         }
// res.json({success:true,dashData})
//     } catch (error) {
//         console.error(error);
//         res.json({success:false,message:error.message})
//     }
// }


const doctorDashboard = async (req, res) => {
    try {
        const { docId } = req.body;

        // Check if docId is provided
        if (!docId) {
            return res.json({ success: false, message: "Doctor ID is required" });
        }

        // Fetch appointments for the given doctor ID
        const appointments = await appointmentModel.find({ docId });

        // Check if appointments are found
        if (appointments.length === 0) {
            return res.json({ success: false, message: "No appointments found for this doctor" });
        }

        let earnings = 0;
        let patients = [];

        // Calculate earnings and gather unique patients
        appointments.forEach((item) => {
            if (item.isCompleted || item.payment) {
                earnings += item.amount;
            }

            // Add unique userIds to the patients array
            if (!patients.includes(item.userId)) {
                patients.push(item.userId);
            }
        });

        const dashData = {
            earnings,
            appointments: appointments.length,
            patients: patients.length,
            latestAppointments: appointments.slice().reverse().slice(0, 5)  // Creating a copy to avoid mutating original array
        };

        console.log("Dashboard Data:", dashData);  // Log the dashboard data to the console

        res.json({ success: true, dashData });
    } catch (error) {
        console.error("Error in fetching dashboard data:", error);
        res.json({ success: false, message: error.message });
    }
};


//API To get doctor profile for Doctor Panel

const doctorProfile = async(req,res)=>{
    try {
        const {docId}=req.body
        const profileData=await doctorModel.findById(docId).select('-password')
        res.json({success:true,profileData})
    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }
}


//API to Update doctor profile data from Doctor model



const updateDoctorProfile = async(req,res)=>{
    try {
        const {docId,fees,address,available}=req.body
        await doctorModel.findByIdAndUpdate(docId,{fees,address,available})
        res.json({success:true,message:'Profile Updated'})
    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }
}



export {changeAvailability,doctorList,loginDoctor,appointmentsDoctor,appointmentComplete,appointmentCancel,doctorDashboard,
    doctorProfile,updateDoctorProfile

}

