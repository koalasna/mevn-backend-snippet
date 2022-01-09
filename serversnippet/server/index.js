// npm run dev

const express = require('express');
const bodyParser = require('body-parser');

const app = express();

//middleware
app.use(bodyParser.json());

const projects = require('./routes/api/projects');
app.use('/api', projects);

//port for heroku or 5000 (a port for our localhost)
const port = process.env.PORT || 5000;

    app.use(express.static(__dirname + '/public/'));
    app.get('/', (req, res) => {
        res.sendFile(__dirname + '/public/index.html');
    });
    app.get('/new', (req, res) => {
        res.sendFile(__dirname + '/public/new.html');
    });
    app.get('/login', (req, res) => {
        res.sendFile(__dirname + '/public/login.html');
    });
app.listen(port, () => console.log(`Server started on port ${port} // http://localhost:5000/api/projects`)); //huomaa, et täytyy olla ` eikä '


