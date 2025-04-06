const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const cors = require('cors');

const configRouting = require('./config_routing_middleware');

module.exports = function(servExp){
    servExp.use( cookieParser() );
    servExp.use( bodyParser.json() );
    servExp.use( bodyParser.urlencoded( { extended:true } ) ); 
    servExp.use(cors());


    configRouting(servExp);
}