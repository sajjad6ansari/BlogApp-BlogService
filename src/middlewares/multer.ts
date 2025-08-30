import multer from "multer";

//to handle file uploads to Cloudinary
const storage = multer.memoryStorage();

const uploadFile = multer({ storage }).single("file");

export default uploadFile;
