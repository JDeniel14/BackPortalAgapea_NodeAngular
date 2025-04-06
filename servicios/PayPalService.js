const {initializeApp} = require('firebase/app');
const axios=require('axios');

const app = initializeApp(JSON.parse(process.env.FIREBASE_CONFIG));

const {getAuth} = require('firebase/auth');

const aut = getAuth(app);

const {getFirestore, query, collection, where, getDocs, getDoc, doc, setDoc, addDoc} = require('firebase/firestore')

const db = getFirestore();

async function  getAccessTokenPaypal(){
    try {
        const clientId = process.env.PAYPAL_ID;
        const clientSecret= process.env.PAYPAL_SECRET;
        const base64Auth= btoa(`${clientId}:${clientSecret}`)

      
            let _resp = await axios.post(
              "https://api-m.sandbox.paypal.com/v1/oauth2/token",
              "grant_type=client_credentials",
              {
                headers: {
                  Authorization: `Basic ${base64Auth}`,
                  "Content-Type": "application/x-www-form-urlencoded",
                },
              }
            );

            if(_resp.status === 200){
                //console.log('token paypal...', _resp.data.access_token)
            
            return _resp.data.access_token;
            }else{
                throw new Error('error al intentar obtener token de servicio de paypal..')
            }
    } catch (error) {
        console.log(error)
        return null;
    }

}


module.exports = {
    crearPagoPaypal: async(pedido,idCliente,_jwtHeader)=>{
        
        try {
            let _accessToken = await getAccessTokenPaypal();

            if(!_accessToken){
                throw new Error('error al tratar de obtener el token de acceso de paypal...')
            }

            let _order={
                intent : "CAPTURE",
                purchase_units: [
                    {
                        items: pedido.elementosPedido.map(elem => {
                            return {
                                name: elem.libroElemento.Titulo,
                                quantity: elem.cantidadElemento.toString(),
                                unit_amount: {currency_code: 'EUR', value: elem.libroElemento.Precio.toString().replace(',', '.') }
                            }
                        }),
                        amount : {
                            currency_code:'EUR',
                            value: pedido.totalPedido.toString().replace(',', '.'),
                            breakdown: {
                                item_total: {
                                    currency_code: 'EUR',
                                    value: pedido.subtotal.toString().replace(',', '.')
                                },
                                shipping: {
                                    currency_code: 'EUR',
                                    value: pedido.gastosEnvio.toString().replace(',', '.')                                   
                                }
                            }
                        }
                    }
                ],
                application_context:{
                    return_url: `http://localhost:3000/api/Pedido/PayPalCallback?idcli=${idCliente}&pedid=${pedido.idPedido}`,
                    cancel_url: `http://localhost:3000/api/Pedido/PayPalCallback?idcli=${idCliente}&pedid=${pedido.idPedido}&Cancel=true`
            },
            };

            let _resp  = await axios(
                {
                    method:'POST',
                    url:'https://api.sandbox.paypal.com/v2/checkout/orders',
                    data:JSON.stringify(_order),
                    headers:{
                        'Content-Type':'application/json',
                        'Authorization':`Bearer ${_accessToken}`
                    }
                }

            );

                //console.log('respuesta recibida de paypal al mandar objeto ORDER...',_resp)

                if(_resp.status === 201 ){
                    let _saveOrderId = await addDoc(collection(db,"pagosPaypal"),{
                        OrderId: _resp.data.id,
                        IdCliente: idCliente,
                        idPedido : pedido.idPedido,
                        jwtCliente: _jwtHeader
                    });

                    console.log('GUARDADO PAGOPAYPAL EN FIREBASE CON ID...', _saveOrderId.id)
                    return _resp.data.links.filter(link => link.rel === 'approve')[0].href;
                }else{
                    throw new Error('error al intentar crear la orden de pago en paypal...')
                }

        } catch (error) {
            console.log('error al crear el pago en paypal...',error)
            return null;
        }
    },

    finalizarPagoPayPal: async (orderid)=>{
        try {
            let _tokenServicioPayPal=await getAccessTokenPaypal();
            if (! _tokenServicioPayPal) throw new Error('error al obtener token de servicio paypal, no puedo finalizar pago');

            let _respuesta=await axios(
                {
                    method: 'POST',
                    url:`https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderid}/capture`,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${_tokenServicioPayPal}`
                    }
                }
            );
            console.log('respuesta finalizar pago por parte de paypal...', _respuesta);

            if (_respuesta.status===201 || _respuesta.status===200 ) { //OJO!!! revisar codigo de respuesta pq paypal puede dar 201...
                return true;
            } else {
                return false;
            }

        } catch (error) {
            console.log('error al capturar pago por paypal y finalizarlo...', error);
            return null;
        }
    }

}
