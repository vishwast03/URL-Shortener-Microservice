require('dotenv').config();
const express = require('express');
const mongo = require('mongodb');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const shortId = require('shortid');
const dns = require('dns');
const url = require('url');
// const validUrl = require('valid-url')
const cors = require('cors');
const app = express();


// const URI = require("url").URL;
// const urlExists = require("url-exists");

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({
    extended: false
}));

app.use(cors());

app.use(express.json());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

// connect to the database
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000
});

const connection = mongoose.connection;
connection.on('error', console.error.bind(console, 'connection error:'));
connection.on('open', () => {
    console.log('MongoDB connection established successfully');
});

// create url model
const Schema = mongoose.Schema;
const urlSchema = new Schema({
    original_url: String,
    short_url: String
});
const URL = mongoose.model("URL", urlSchema);

app.post('/api/shorturl', (req, res) => {

  const lookupUrl = req.body.url;
  const parsedLookupUrl = url.parse(lookupUrl);
  const urlCode = shortId.generate();

  const lookupPromise = new Promise((resolve, reject) => {
    dns.lookup(parsedLookupUrl.protocol ? parsedLookupUrl.host
                : parsedLookupUrl.path, (err, address, family) => {
                  if(err) reject(err);
                  resolve(address);
    });
  });

  lookupPromise.then(
    async function (address) {
      try {
        // check for presense in database
        let findOne = await URL.findOne({
          original_url: lookupUrl
        });
        if(findOne) {
          res.json({
            original_url: findOne.original_url,
            short_url: findOne.short_url
          });
        }
        else {
          // if the url doesn't exist in database, create new one
          findOne = new URL({
            original_url: lookupUrl,
            short_url: urlCode
          });
          await findOne.save();
          res.json({
            original_url: findOne.original_url,
            short_url: findOne.short_url
          });
        }
      }
      catch(err) {
        console.error(err);
        res.statur(500).json('Server error...');
      }
    },
    (err) => {
      res.status(401).json({error: 'Invalid URL'});
    }
  );
});

app.get('/api/shorturl/:short_url?', async function(req, res) {
    try {
        const urlParams = await URL.findOne({
          short_url: req.params.short_url
        });
        if(urlParams) {
          return res.redirect(urlParams.original_url);
        }
        else {
            return res.status(404).json('No URL found');
        }
    }
    catch(err) {
        console.error(err);
        res.status(500).json('Server error...');
    }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});