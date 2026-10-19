const express = require('express');
const router = express.Router();
const { createComic, getAllComics, getComicById, likeComic, deleteComic } = require('../controllers/comicsController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', protect, getAllComics);
router.post('/', protect, upload.array('images', 50), createComic);
router.get('/:id', protect, getComicById);
router.post('/:id/like', protect, likeComic);
router.delete('/:id', protect, deleteComic);

module.exports = router;
