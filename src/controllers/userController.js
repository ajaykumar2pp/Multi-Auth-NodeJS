const User = require('../models/user.model')
const bcrypt = require('bcrypt')
const passport = require('passport')
const transporter = require('../config/nodemailer')
const crypto = require('crypto');


//  Register 
exports.registerPage = (req, res) => {
    res.render('auth/register')
}

// Login 
exports.loginPage = (req, res) => {
    res.render('auth/login')
}

// Forget Password Page
exports.forgetPage = (req, res) => {
    res.render('auth/forgetPassword')
}

// Check email page
exports.checkEmail = (req, res) => {
    res.render('auth/checkEmail')
}


// Dashboard 
exports.dashboardPage = (req, res) => {
    // console.log('Logged-in User:', req.user);
    res.render('pages/dashboard', { user: req.user })
}

// POST Register
exports.postRegister = async (req, res) => {
    console.log(req.body);
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        req.flash('error', 'All fields are required')
        req.flash('username', username)
        req.flash('email', email)
        return res.redirect('/')
    }

    try {
        // Check if email exists
        const emailExists = await User.exists({ email: email });
        if (emailExists) {
            req.flash('error', 'Email already taken');
            req.flash('username', username);
            req.flash('email', email);
            return res.redirect('/');
        }

        // Hash password 
        const hashedPassword = await bcrypt.hash(password, 10)

        // Create a user 
        const user = new User({
            username,
            email,
            password: hashedPassword
        })

        // Save the user
        await user.save();

        // Redirect to login Page
        // req.flash('success', 'Registration successful! ');
        return res.redirect('/login');

    } catch (err) {
        console.error(err);
        req.flash('error', 'Something went wrong, please try again.');
        return res.redirect('/');
    }

}

// POST Login
exports.postLogin = (req, res, next) => {
    console.log(req.body);
    const { email, password } = req.body;
    if (!email || !password) {
        req.flash('error', 'All fields are required')
        req.flash('email', email)
        return res.redirect('/login')
    }

    passport.authenticate('local', (err, user, info) => {

        if (err) {
            req.flash('error', 'Something went wrong. Please try again.');
            return res.redirect('/login');
        }

        if (!user) {
            req.flash('error', info.message || 'Invalid login credentials');
            return res.redirect('/login');
        }

        // Login user and redirect to dashboard
        req.logIn(user, (err) => {
            if (err) {
                req.flash('error', 'Login failed. Please try again.');
                return res.redirect('/login');
            }

            req.flash('success', 'Logged in successfully');
            return res.redirect('/dashboard');
        })


    })(req, res, next)
}

// Get Logout 
exports.logoutUser = (req, res) => {
    req.logout(err => {
        if (err) { return next(err); }
        // req.flash('success', 'You have logged out successfully');
        req.session.destroy(() => {
            res.redirect('/');
        });
    });
}



// Forget Password POST
exports.forgetPassword = async (req, res) => {
    console.log(req.body);
    const { email } = req.body;

    const user = await User.findOne({ email });
    // console.log("user email",user.email)
    if (!user) {
        req.flash('error', 'No account with that email found');
        return res.redirect('/forget-password');
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetUrl = `http://${req.headers.host}/reset-password/${token}`;
    console.log("Reset URL Link",resetUrl)

    // Send email
    const mailOptions = {
        to: user.email,
        from: process.env.EMAIL_USER,
        subject: 'Password Reset',
        html: `<p>You requested a password reset.</p>
                   <p>Click this <a href="${resetUrl}" target="_blank">link</a> to set a new password.</p>`
    };

    transporter.sendMail(mailOptions, (err) => {
        if (err) {
            console.error(err);
            req.flash('error', 'Something went wrong');
            return res.redirect('/forget-password');
        }
        res.redirect('/check-email');
    });
}


exports.resetPasswordPage = async(req,res)=>{
    
    const userToken = req.params.token;
    console.log("User Token : ", userToken)

    if (!userToken) {
        req.flash('error', 'Password reset token is invalid or has expired');
        return res.redirect('/forget-password');
    }
    res.render('auth/resetPassword', { token: req.params.token });
}

exports.resetPassword = async(req,res)=>{

    const { password, confirmPassword } = req.body;
    console.log(req.body)

    if (password !== confirmPassword) {
        req.flash('error', 'Passwords do not match');
        return res.redirect(`/reset-password/${req.params.token}`);
    }

    const userToken = req.params.token;

    if (!userToken) {
        req.flash('error', 'Password reset token is invalid or has expired');
        return res.redirect('/forget-password');
    }

    res.redirect('/success');
}


//  Success Page 
exports.successPage=(req,res)=>{
res.render('auth/successPassword')
}