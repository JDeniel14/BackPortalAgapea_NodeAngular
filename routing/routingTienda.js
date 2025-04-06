
const express = require('express');
const router = express.Router();

const tiendaController = require('../controllers/tiendaController');


router.get('/RecuperarCategorias', tiendaController.recuperarCategorias);
router.get('/RecuperarLibros',tiendaController.recuperarLibros);
router.get('/RecuperarUnLibro', tiendaController.recuperarUnLibro);
router.post('/RecuperarProvincias',tiendaController.recuperarProvincias);
router.get('/RecuperarMunicipios',tiendaController.recuperarMunicipios);


module.exports=router;