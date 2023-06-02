const express = require('express');
const router = express.Router();

const {login, dashboard} = require('../controllers/main');

const authentication = require('../middleware/auth');

router.route('/dashboard').get(authentication ,dashboard);
router.route('/login').post(login);

module.exports = router;