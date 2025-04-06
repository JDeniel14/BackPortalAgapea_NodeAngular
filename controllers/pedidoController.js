
const {initializeApp} = require('firebase/app');
const axios=require('axios');

const app = initializeApp(JSON.parse(process.env.FIREBASE_CONFIG));

const {getAuth} = require('firebase/auth');

const auth = getAuth(app);

const {getFirestore, query, collection, where, getDocs, getDoc, doc, setDoc, updateDoc, arrayUnion} = require('firebase/firestore')

const db = getFirestore();

const paypalService = require('../servicios/PayPalService');
const stripeService = require('../servicios/StripeService');

module.exports = {
    finalizarPedido: async (req,res,next)=>{
        try {

            let _jwtHeader = req.headers.authorization.split(' ')[1];
            console.log('jwt cabecera....', _jwtHeader)

            let mensaje = "";
            let url;
            let finPedidoOk = false;
            let {pedido,email}=req.body;
            let _clienteSnapShot = await getDocs(query(collection(db,'clientes'), where('cuenta.email','==', email)));
            console.log('datos finalizar pedido...',{email,pedido});


            if(!_clienteSnapShot.empty){
                let _datosClienteSnap =_clienteSnapShot.docs.shift();
                let _idCliente = _datosClienteSnap.id
                


                if(pedido.datosPago.metodoPago ==='pagopaypal'){

                    console.log('id del cliente...', _idCliente)
                   let _resp = await paypalService.crearPagoPaypal(pedido,_idCliente,_jwtHeader)
                   //console.log('_resp...',_resp)
                    if(!_resp) throw new Error('error al generar el pago con paypal...')
                    else finPedidoOk = true;
                
                    mensaje = 'pago creado en paypal, redireccionando al cliente a la pasarela de pago...';
                   url = _resp
                }else{
                    let _datosCliente = _datosClienteSnap.data();
                    console.log('hola datospago..',pedido.datosPago)
                    let _customerId = await stripeService.createCustomerStripe(_datosCliente, pedido.datosPago.direccionEnvio);
                    console.log(_customerId)
                    if(!_customerId) throw new Error('error al intentar crear Customer en Stripe...')

                    let _cardId = await stripeService.createCardStripe(_customerId);
                    if(!_customerId) throw new Error('error al intentar crear objeto Card en Stripe...')

                    let pagoStripe = await stripeService.createChargeStripe(_customerId,_cardId, pedido.totalPedido)

                    if(!pagoStripe){
                        url = `http://localhost:4200/Tienda/MostrarPedido?idcliente=${_idCliente}&idpedido=${pedido.idPedido}`;
                    }else{
                        url = `http://localhost:4200/Tienda/FinalizarPedidoOk?idcliente=${_idCliente}&idpedido=${pedido.idPedido}`
                    }

                }
                
                let datosPago = pedido.datosPago;

                let pedidoCliente = {
                    idPedido : pedido.idPedido,
                    fechaPedido: pedido.fechaPedido,
                    estadoPedido: pedido.estadoPedido,
                    elementosPedido: pedido.elementosPedido,
                    subTotal : pedido.subtotal,
                    gastosEnvio: pedido.gastosEnvio,
                    totalPedido: pedido.totalPedido
                }

                await setDoc(doc(db,'Pedidos',pedido.idPedido), pedidoCliente);

                let _clienteRecup = _datosClienteSnap.data()
                let _dirsCliente = _clienteRecup.direcciones.filter( d => d.idCliente == _idCliente);
                console.log('datos pago..', datosPago)
                console.log('direccion envio...', datosPago.direccionEnvio)
                //console.log('direccion factura...', datosPago.dirFacturacion)

                let _direcGuardar;
                if(datosPago.direccionFacturacion !== undefined){
                     _direcGuardar = {
                    
                        direccionEnvio: {
                            idDireccion : datosPago.direccionEnvio.idDireccion,
                            calle : datosPago.direccionEnvio.calle,
                        pais:datosPago.direccionEnvio.pais,
                        provincia: datosPago.direccionEnvio.provincia,
                        municipio: datosPago.direccionEnvio.municipio,
                        esPrincipal: false,
                        esFacturacion: false,
                        },
                        direccionFacturacion:{
                        idDireccion : datosPago.direccionFacturacion.idDireccion,
                        calle : datosPago.direccionFacturacion.calle,
                        cp: datosPago.direccionFacturacion.cp,
                        pais:datosPago.direccionFacturacion.pais,
                        provincia: datosPago.direccionFacturacion.provincia,
                        municipio: datosPago.direccionFacturacion.municipio,
                        esPrincipal: false,
                        esFacturacion: false,
                        }
                    }
                }else{
                    
                    _direcGuardar = {
                    
                        direccionEnvio: {
                        idDireccion : datosPago.direccionEnvio.idDireccion ,
                        calle : datosPago.direccionEnvio.calle,
                        cp: datosPago.direccionEnvio.cp,
                        pais:datosPago.direccionEnvio.pais,
                        provincia: datosPago.direccionEnvio.provincia,
                        municipio: datosPago.direccionEnvio.municipio,
                        esPrincipal: false,
                        esFacturacion: false,
                        },
                       
                    }
                }
                let dirEnvio;
                let dirFacturacion;
                console.log('direcciones cliente...', _dirsCliente)
                if(_dirsCliente.length === 0){
                    if(datosPago.tipoDireccionFactura == "igualenvio"){
                        console.log('igualenvio..')
                        _direcGuardar.direccionEnvio.esFacturacion = true;
                        _direcGuardar.direccionEnvio.esPrincipal = true;
                        
                        await setDoc(doc(db,'Direcciones', _direcGuardar.direccionEnvio.idDireccion), _direcGuardar.direccionEnvio)
                        dirEnvio = _direcGuardar.direccionEnvio;
                    }else{
                        console.log('distintaenvio..')
                        _direcGuardar.direccionFacturacion.esFacturacion = true;
                        _direcGuardar.direccionFacturacion.esPrincipal = false;
                        
                        await setDoc(doc(db,'Direcciones', _direcGuardar.direccionFacturacion.idDireccion), _direcGuardar.direccionFacturacion)
                        dirFacturacion = _direcGuardar.direccionFacturacion;

                        _direcGuardar.direccionEnvio.esFacturacion = false;
                        _direcGuardar.direccionEnvio.esPrincipal = true;
                        await setDoc(doc(db,'Direcciones', _direcGuardar.direccionEnvio.idDireccion), _direcGuardar.direccionEnvio)

                        dirEnvio = _direcGuardar.direccionEnvio;
                    }
                }else{
                    if(datosPago.tipodireccionenvio == 'otradireccion'){
                        console.log('otraenvio')
                        _direcGuardar.direccionEnvio.esFacturacion = datosPago.tipoDireccionFactura == 'igualenvio';
                        _direcGuardar.direccionEnvio.esPrincipal = true;
                        await setDoc(doc(db,'Direcciones', _direcGuardar.direccionEnvio.idDireccion), _direcGuardar.direccionEnvio)

                        dirEnvio = _direcGuardar.direccionEnvio;
                    }
                    if(datosPago.tipoDireccionFactura == "otra"){
                        console.log('otrafacturacion')
                        _direcGuardar.direccionFacturacion.esFacturacion = true;
                        _direcGuardar.direccionFacturacion.esPrincipal = false;
                        await setDoc(doc(db,'Direcciones', _direcGuardar.direccionFacturacion.idDireccion), _direcGuardar.direccionFacturacion)

                        dirFacturacion = _direcGuardar.direccionFacturacion;
                    }
                }

                
                const refCliente = doc(db,'clientes', _idCliente);
                //console.log('clienteref...',refCliente)

                let _respUpdateClientePedido = await updateDoc(refCliente,{
                    pedidos: arrayUnion(pedidoCliente),
                    
                })

                if(dirEnvio){
                    console.log('direnvio..si')
                    let _respUpdateCliente = await updateDoc(refCliente,{
                        
                        direcciones: arrayUnion(dirEnvio)
                    })
                }

                if(dirFacturacion){
                    console.log('dirfacturacion..si')
                    let _respUpdateCliente = await updateDoc(refCliente,{
                        
                        direcciones: arrayUnion(dirFacturacion)
                    })
                    
                }
                
                let _clienteActualizadoSnapShot = await getDocs(query(collection(db,'clientes'), where('cuenta.email','==', email)));
                let _datosClienteActualizados = _clienteActualizadoSnapShot.docs.shift().data();

                //console.log('datos del cliente actualizados...', _datosClienteActualizados)

                let userCliente = auth.currentUser;
                /*let userReload = await userCliente.reload();
                console.log('userReload...', userCliente)
                */
                res.status(200).send(
                    {
                        codigo:0,
                        mensaje: mensaje,
                        error:null,
                        datoscliente:_datosClienteActualizados,
                        token: (await userCliente.getIdToken()).toString(),
                        otrosdatos: url,
                    }
                )
            }else{
                throw new Error('No se encuenta un cliente con ese email...')
            }
           
    
    
          
    
        } catch (error) {
            console.log('error finalizar pedido...', error);
            res.status(400).send({
                codigo:1,
                mensaje:'error al finalizar el pedido en servicio de node...',
                error: error.message,
                datoscliente:null,
                token:null,
                otrosdatos:null
            });
        }
    },

    /**
     * 
     * @param {Request} req 
     * @param {Response} res 
     * @param {any} next 
     */
    paypalCallBack: async (req,res,next)=>{ 
        try {
            let {idcli,pedid,Cancel} = req.query;

            let _docPagoPaypalSnap = await getDocs(query(collection(db,"pagosPaypal"),where("idPedido","==",pedid)));
            if(!_docPagoPaypalSnap.empty){
                let _pagoPayPal = _docPagoPaypalSnap.docs.shift().data();
                console.log('pedido obtenido de firestore...', _pagoPayPal)

                let _finPagoOK = await paypalService.finalizarPagoPayPal(_pagoPayPal.OrderId);
                console.log('respuesta finalizar pago paypal...',_finPagoOK);
                if(!_finPagoOK || Cancel=='true'){
                return res.redirect(`http://localhost:4200/Tienda/MostrarPedido?idcliente=${idcli}&idpedido=${pedid}`);
                }
                console.log('hola');
                return res.redirect(`http://localhost:4200/Tienda/FinalizarPedidoOk?idcliente=${idcli}&idpedido=${pedid}`);
                
            }
        } catch (error) {
            return null;
        }
    }
}