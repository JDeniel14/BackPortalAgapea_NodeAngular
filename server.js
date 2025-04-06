require('dotenv').config();
const express = require('express');
var serverExpress = express();

const configServer = require('./config/config_pipeline');

serverExpress.listen(3000, ()=> console.log('...servidor web express escuchando por puerto 3000...'))
configServer(serverExpress);