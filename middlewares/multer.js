const multer  = require('multer');

const _storage = multer.diskStorage({})
const fileFilter = (req, file, callback) => {
    if (!file.mimetype.includes('image')){
        return callback("Invalid image format", false)
    }
    callback(null, true)
}

module.exports = multer({storage: _storage, fileFilter})

