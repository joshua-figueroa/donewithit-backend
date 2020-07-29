require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");
const findOrCreate = require("mongoose-findorcreate");
const argon2 = require("./src/password");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SECRET,
    httpOnly: true,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.DB_URL, { dbName: "donewithit", useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: true }).then(() => {
    console.log("Connected to Atlas Cluster successfully!");
}).catch((err) => console.log(err));

mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: {
        type: String,
        minlength: 8
    },
}, { versionKey: false });

const encKey = process.env.ENC_KEY; //32-byte length 64-bit characters
const sigKey = process.env.SIG_KEY; //64-byte length 64-bit characters

//userSchema.plugin(encrypt, { encryptionKey: encKey, signingKey: sigKey, encryptedFields:['password'] });
userSchema.plugin(findOrCreate);

const User = mongoose.model('User', userSchema);

// use static serialize and deserialize of model for passport session support
passport.serializeUser((user, done) => {
    done(null, user._id);
});
passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => {
        done(err, user);
    });
});

// use static authenticate method of model in LocalStrategy
passport.use(new LocalStrategy(
    function(username, password, done) {
        User.findOne({ email: username }, function (err, user) {
            if(err) { return done(err); }
            else if(!user) { return done(null, false); }
            else {
                argon2.password_verify(user.password, password).then(match => {
                    if(!match) { return done(null, false); }
                    return done(null, user);
                });
            }
        });
    }
));

app.post('/login', (req, res) => {
    const user = new User({
        email: req.body.username,
        password: req.body.password
    });

    req.login(user, err => {
        if(err) throw err;
        //Creates a local cookie
        passport.authenticate('local', { failureRedirect: '/login?error=404' })(req, res, () => {
            res.redirect('/');
        });
    });
})

app.post('/register', (req, res) => {
    console.log(req.body);
    argon2.password_hash(req.body.password).then(hashed => {
        const user = new User({
            name: req.body.name,
            email: req.body.email,
            password: hashed
        });

        user.save(err => {
            if(err) throw err;
            console.log(`Successfully created user ${user._id}`);
        });
    });
});

app.get('/register', (req, res) => {
    res.send("Register")
})

app.listen(port, () => console.log(`App is listening on http://localhost:${port}`));
