const express = require('express');
const router = express.Router();


const pedidoController = require('../controllers/pedidoController');



router.post('/FinalizarPedido', pedidoController.finalizarPedido);
router.get('/PayPalCallback',pedidoController.paypalCallBack)

module.exports=router;