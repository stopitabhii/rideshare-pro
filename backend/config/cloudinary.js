const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const streamifier = require('streamifier');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Use memory storage — we stream the buffer directly to Cloudinary
const uploadIdCard = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, PDF, HEIC files are allowed for ID verification'), false);
    }
  }
});

// Upload a buffer to Cloudinary and return { secure_url, public_id }
function uploadToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'rideshare/id-cards',
        resource_type: 'auto',
        access_mode: 'authenticated', // private — no direct public URL
        ...options
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
}

// Generate a short-lived signed URL for admin review (1 hour)
function getSignedUrl(publicId) {
  return cloudinary.url(publicId, {
    secure: true,
    sign_url: true,
    type: 'authenticated',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    resource_type: 'image'
  });
}

// Delete an asset from Cloudinary
async function deleteFromCloudinary(publicId) {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
  } catch (err) {
    console.warn('Cloudinary delete warning:', err.message);
  }
}

module.exports = { cloudinary, uploadIdCard, uploadToCloudinary, getSignedUrl, deleteFromCloudinary };