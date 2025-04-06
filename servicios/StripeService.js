const {initializeApp} = require('firebase/app');
const axios=require('axios');

const app = initializeApp(JSON.parse(process.env.FIREBASE_CONFIG));

const {getAuth} = require('firebase/auth');

const aut = getAuth(app);

const {getFirestore, query, collection, where, getDocs, getDoc, doc, setDoc, addDoc} = require('firebase/firestore')

const db = getFirestore();

module.exports= {
    
    createCustomerStripe: async(datosCliente, direccionEnvio)=>{
        try {
            
            let _dirppal ={}
            _dirppal = datosCliente.direcciones.filter(d => d.esPrincipal == true)[0];
            if(_dirppal == undefined){
                _dirppal = direccionEnvio;
            }
            console.log('dir...',_dirppal.municipio)
            let _customerStripeValues = new URLSearchParams(
                {
                    'name': datosCliente.nombre,
                    'email':datosCliente.cuenta.email,
                    'phone': datosCliente.telefono,
                    'address[city]': _dirppal.municipio.DMUN50,
                    'address[state]': _dirppal.provincia.PRO,
                    'address[country]': _dirppal.pais,
                    'address[postal_code]': _dirppal.cp,
                    'address[line1]': _dirppal.calle,
                }
            ).toString()

            let _resp = await axios(
               { method:'POST',
                url:'https://api.stripe.com/v1/customers',
                data : _customerStripeValues,
                headers:{
                    'Authorization': `Bearer ${process.env.STRIPE_PRIVATE_KEY}`
                }}
            );
                console.log('respuesta1...',_resp.data)
            if(_resp.status === 200){
                console.log('respuesta de stripe con create customer...',_resp.data);

                return _resp.data.id;
            }else{
                return null;
            }


        } catch (error) {
            console.log(error)
            return null;
        }
    },

    createCardStripe: async(clienteStripeId)=>{
        try {
            
                
            let _cardStripeValues = new URLSearchParams(
                {
                    'source': 'tok_visa'
                }
            ).toString();

            let _resp = await axios(
               { method:'POST',
                url:`https://api.stripe.com/v1/customers/${clienteStripeId}/sources`,
                data : _cardStripeValues,
                headers:{
                    'Authorization': `Bearer ${process.env.STRIPE_PRIVATE_KEY}`
                }}
            );

            if(_resp.status === 200){
                console.log('respuesta de stripe con create customer...',_resp.data);

                return _resp.data.id;
            }else{
                return null;
            }

        } catch (error) {
            return null;
        }
    },

    createChargeStripe : async(clienteStripeId, cardId, totalPedido, idPedido)=>{

        try {
            
            let _chargeStripeValues = new URLSearchParams(
                {
                    "customer":clienteStripeId,
                    "source":cardId,
                    "amount": (totalPedido * 100).toString(),
                    "currency": "eur",
                    "description":idPedido
                }
            ).toString();

            let _resp = await axios(
                {method:'POST',
                url:'https://api.stripe.com/v1/charges',
                data : _chargeStripeValues,
                headers:{
                    'Authorization': `Bearer ${process.env.STRIPE_PRIVATE_KEY}`
                }}
            );

            if(_resp.status === 200){
                console.log('respuesta de stripe con create customer...',_resp.data);

                return _resp.data.status === "succeeded";
            }else{
                return null;
            }

        } catch (error) {
            return null;
        }
    }
}