const routingCliente=require('../routing/routingCliente');
const routingTienda = require('../routing/routingTienda')
const routingPedido = require('../routing/routingPedido')

module.exports=function(servExpress){

    servExpress.use('/api/Cliente', routingCliente); //<---- en modulo routingCliente estan endpoints zona cliente
                                                    // en este fichero se exporta objeto de express tipo router

    servExpress.use('/api/Tienda',routingTienda);

    servExpress.use('/api/Pedido',routingPedido);
} 