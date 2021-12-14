require('dotenv').config();
const express = require('express');
const mongo = require('mongodb');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const shortId = require('shortid');
const validUrl = require('valid-url');
const cors = require('cors');
const app = express();

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

// create api routes
app.post('api/shorturl', async function(req, res) {
    const url = req.body.url_input;
    const urlCode = shortId.generate();
    
    // check for invalid url
    if(!validUrl.isWebUri(url)) {
        res.status(401).json({
            error: 'Invalid URL'
        });
    }
    else {
        try {
            // check for presense in database
            let findOne = await URL.findOne({
                original_url: url
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
                    original_url: url,
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
            res.status(500).json('Server error...');
        }
    }
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