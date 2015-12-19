const jwt = require('jsonwebtoken');
const path = require('path');
const nconf = require('nconf');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const Auth0Strategy = require('passport-auth0');

// Initialize configuration.
nconf.argv()
  .env()
  .file({ file: './config.json' });
   
// Initialize authentication.
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));
passport.use(new Auth0Strategy({
  domain: nconf.get('AUTH0_DOMAIN'),
  clientID: nconf.get('AUTH0_CLIENT_ID'),
  clientSecret: nconf.get('AUTH0_CLIENT_SECRET'),
  callbackURL: '/callback',
  passReqToCallback: true
},
  (req, accessToken, refreshToken, extraParams, profile, done) => {
    console.log('Received profile:', JSON.stringify(profile, null, 2));
    req.session.id_token = extraParams.id_token;
    return done(null, profile);
  }
));

// Initialize web application.
const app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
  secret: '123456789',
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

// Configure routes.
app.get('/',
  (req, res) => {
    res.locals = {
      // Don't use "profile" in production.
      scopes: 'openid profile',
      domain: nconf.get('AUTH0_DOMAIN'),
      client_id: nconf.get('AUTH0_CLIENT_ID')
    };

    if (req.user) {
      const decoded = jwt.decode(req.session.id_token);
      if (decoded) {
        res.locals.token = JSON.stringify(decoded, null, 2);
      }
    }

    res.render('index');
  });

app.post('/login',
  (req, res) => {
    res.redirect(`https://${nconf.get('AUTH0_DOMAIN') }/authorize?client_id=${nconf.get('AUTH0_CLIENT_ID') }&respose_type=code&scope=${req.body.scopes}`);
  });

app.get('/callback',
  passport.authenticate('auth0'),
  (req, res) => {
    res.redirect('/');
  });

app.get('/logout',
  (req, res) => {
    req.session.destroy();
    req.logout();
    res.redirect('/');
  });

console.log(`Listening on http://localhost:${nconf.get('PORT') || 3000}`);
app.listen(nconf.get('PORT') || 3000);