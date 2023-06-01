//check user login
//if exists return jwt token
//if not return error


//setup authentication only with request with jwt token
const jwt = require('jsonwebtoken');
const CustomAPIError = require('../errors/custom-error');
const login = async (req, res) => {
const { username, password } = req.body;

//mongo
//joi
//check in the controller

if (!username || !password) {
throw new CustomAPIError('Please provide email and password', 400);
}
const id = new Date().getDate();
const token = jwt.sign({id, username }, process.env.JWT_SECRET, {
expiresIn: '30d',
});     
res.status(200).json({ msg: 'user created', token });
};

const dashboard = async (req, res) => {
const luckyNumber = Math.floor(Math.random() * 100);
res.status(200).json({ msg : `Hello, amine hamdi`, secret: `Here is your authorized data, your lucky number is ${luckyNumber}` });
};

module.exports = {
login,
dashboard,
};
