import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './config/mongodb.js';
import connectCloudinary from './config/cloudinary.js';
import adminRouter from './routers/adminRoute.js';
import doctorRouter from './routers/doctorRoute.js';
import userRouter from './routers/userRoute.js';


const app = express();
const port = process.env.PORT || 4000;

connectDB();
connectCloudinary();

//middlewarews
app.use(express.json());
app.use(cors());

//api endpoints
app.use('/api/admin',adminRouter);
app.use('/api/doctor',doctorRouter)
app.use('/api/user',userRouter)


app.get('/', (req, res) => {
    res.send('API WORKING');
});

app.listen(port, () => console.log('Server Started', port));
