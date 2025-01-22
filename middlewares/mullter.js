import multer from 'multer';

// Configure multer to use memory storage
const storage = multer.memoryStorage();

// Create the multer instance with the configured storage
const upload = multer({
    storage, // Use memory storage
    limits: { fileSize: 5 * 1024 * 1024 }, // Set file size limit to 5MB
    fileFilter: (req, file, callback) => {
        // Validate file type (e.g., allow only image files)
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            callback(null, true); // Accept the file
        } else {
            callback(new Error('Only image files (jpeg, png, gif) are allowed!'), false);
        }
    },
});

export default upload;
