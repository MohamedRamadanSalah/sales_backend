const express = require('express');
const router = express.Router();
const favoritesController = require('../controllers/favoritesController');
const { authenticate } = require('../middlewares/auth');

// All favorites routes require authentication
router.post('/', authenticate, favoritesController.addFavorite);
router.get('/', authenticate, favoritesController.getMyFavorites);
router.delete('/:propertyId', authenticate, favoritesController.removeFavorite);

module.exports = router;
