import jwt from "jsonwebtoken";

const authDoctor = async (req, res, next) => {
    try {
        // Check for token in both 'authorization' and 'dtoken' headers for flexibility
        const authHeader = req.headers.authorization || req.headers.dtoken;

        if (!authHeader) {
            return res.status(401).json({ success: false, message: 'Not Authorized. Please Login Again' });
        }

        let token;
        // Handle 'Bearer <token>' format or direct token header
        if (authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        } else {
            token = authHeader;  // Assuming token is sent directly in 'dtoken' header
        }

        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        req.body.docId = decoded.id;  // Attach the decoded doctor ID to the request

        next();  // Proceed to next middleware or route handler

    } catch (error) {
        console.error("Auth Error:", error.message);
        res.status(401).json({ success: false, message: 'Invalid or Expired Token. Please Login Again' });
    }
};

export default authDoctor;
