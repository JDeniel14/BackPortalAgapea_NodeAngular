/**
 * para inicializar firebase: 
 *  
 * */ 
const {initializeApp} = require('firebase/app');

//OJO, Nombre de variable donde se almacena la cuenta de acceso servicio firebase: FIREBASE_CONFIG (no admite otro nombre)
// no meter el json aqui en fichero de codigo fuente como dice la doc...
const app = initializeApp(JSON.parse(process.env.FIREBASE_CONFIG)); 

//------ CONFIGURACION ACCESO: FIREBASE-AUTHENTICATION -------------
const {getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, applyActionCode, checkActionCode, signInWithCustomToken, updateEmail, updatePassword, EmailAuthCredential, EmailAuthProvider, reauthenticateWithCredential, verifyBeforeUpdateEmail}= require('firebase/auth');

const auth = getAuth(app);// <----- servicio de acceso a firebase-authentication

//------ CONFIGURACION ACCESO: FIREBASE DATABASE -------------------
const {getFirestore, getDocs, query, collection, where, setDoc, doc, addDoc, updateDoc} = require('firebase/firestore');



const db = getFirestore(app);// <---- servicio de acceso a todas las colecciones de la BD definida en firebase-database

//------------ CONFIGURACION ACCESO: FIRBASE-STORAGE ----------------------
const { getStorage, ref, uploadString }=require('firebase/storage');

const storage=getStorage(app); //<---------- servicio de acceso al almacenamiento de ficheros en el storage de firebase...



//para ejecutar nodemon y que no haya que reiniciar el server con cada cambio: npx nodemon .\server.js

 async function uploadImagenCliente(imgSrc,email){
    try {
        //tengo q coger la extension del fichero, en req.body.imagen:  data:image/jpeg
        let _nombrefichero='imagen____' + imgSrc;//  + '.' + req.body.imagen.split(';')[0].split('/')[1]   ;
        console.log('nombre del fichero a guardar en STORGE...',_nombrefichero);
        let _result=await uploadString(ref(storage,`imagenes/${_nombrefichero}`), imgSrc,'data_url'); //objeto respuesta subida UploadResult         
    
        //podrias meter en coleccion clientes de firebase-database en prop. credenciales en prop. imagenAvatar
        //el nombre del fichero y en imagenAvatarBASE&$ el contenido de la imagen...
        let _refcliente=await getDocs(query(collection(db,'clientes'),where('cuenta.email','==',email)));
        _refcliente.forEach( async (result) => { 
            await updateDoc(result.ref, { 'cuenta.imagenAvatarBASE64': imgSrc } );
        });
        
       // generaRespuesta(0,'Imagen avatar subida OK!!! al storage de firebase','',null,null,null,res );
       return true;
    } catch (error) {
        console.log('error subida imagen...',error);
       // generaRespuesta(5,'fallo a la hora de subir imagen al storage',error,null,null,null,res);

        return false;

    }
} 

module.exports={
    login: async (req, res, next)=>{
 
    
        
       try {
        console.log('datos mandados por servicio de angular... ',req.body); //{email:...,pasword:....}

        //1º inicio de sesion en FIREBASE con email y password
        //https://firebase.google.com/docs/auth/web/password-auth?authuser=0&hl=es#sign_in_a_user_with_an_email_address_and_password

        let _userCredencial = await signInWithEmailAndPassword(auth,req.body.email,req.body.password);
        
        //si existe y tiene una cuenta confirmada? te devuelve un user
        console.log('resultado del login en firebase....',_userCredencial);

        //2º recuperar de la bd de firebase-firestore de la coleccion cliente los datos del  cliente asociados al email
        //y almacenar el JWT que firebase ha originado por nosotros
        let _clienteSnapShot = await getDocs(query(collection(db,'clientes'),where('cuenta.email','==',req.body.email)) );

        console.log('snapshot recuperado de clientes...',_clienteSnapShot);

        let _datoscliente = _clienteSnapShot.docs.shift().data(); // <--- aqui, como devuelve un array de solo una posicion, con shift lo quitamos y lo guardamos en el objeto
        console.log('datos del cliente recuperados....',_datoscliente)

        res.status(200).send(
            {
                codigo:0,
                mensaje:'Login realizado correctamente',
                error:null,
                datoscliente:_datoscliente,
                token: await _userCredencial.user.getIdToken(), //<--- devuelve el id del JWT que genera firebase
                otrosdatos:null
            }
        );
        

       } catch (error) {
        console.log('error en el login....',error);

        res.status(400).send({
            codigo:1,
            mensaje:'login fallido',
            error: error.message,
            datoscliente:null,
            token:null,
            otrosdatos:null
        });
       }

    },

    reLogin: async(req,res,next)=> {
        try {
            let {idpedido,idcliente} = req.body;
            console.log('body..',req.body)
            let _docPagoPaypalSnap = await getDocs(query(collection(db,"pagosPaypal"),where("idPedido","==",idpedido)));
            if(!_docPagoPaypalSnap.empty){
                let _pagoPayPal = _docPagoPaypalSnap.docs.shift().data();
                console.log('pedido obtenido de firestore...', _pagoPayPal);

            }
            let _user = auth.currentUser;
            


            console.log('resultado relogin...', _user.email);
            
            let _docClienteSnap = await getDocs(query(collection(db,'clientes'),where('cuenta.email','==', _user.email)))

            let _datosCliente = _docClienteSnap.docs.shift().data();

            console.log('datos del cliente recuperados...',_datosCliente)

            if(_datosCliente){

                res.status(200).send(
                    {
                        codigo:0,
                        mensaje:'ReLogin realizado correctamente',
                        error:null,
                        datoscliente:_datosCliente,
                        token: await _user.getIdToken(), //<--- devuelve el id del JWT que genera firebase
                        otrosdatos:null   
                    }
                )
            }else{
                throw new Error(`Error al intentar reloguear al cliente...${idcliente}, mail: ${_user.email}`)
            }

            

        } catch (error) {
            console.log('error en el login....',error);

        res.status(400).send({
            codigo:1,
            mensaje:'login fallido',
            error: error.message,
            datoscliente:null,
            token:null,
            otrosdatos:null
        });
        }
    },

    registro: async (req,res,next)=>{ 

        try {
            
        console.log('datos mandados por servicio de angular...',req.body);

        
        let {nombre, apellidos, email, repemail, password, repassword, login, telefono,}=req.body;

        //1º paso creacion de cuenta FIREBASE dentro de Authentication basada en email y contraseña
        /*creacion de cuentas firebase:
        https://firebase.google.com/docs/auth/web/password-auth?authuser=0&hl=es#create_a_password-based_account */
       
        let _userCredential = await createUserWithEmailAndPassword(auth,email,password); 
        //crea la cuenta pero no la valida, hay que pasarle un token de verificacion
            console.log('resultado creacion creds. usuario recien registrado....',_userCredential); 

        //2º paso mandar email de activacion de cuenta:
        await sendEmailVerification(_userCredential.user);

        //3º paso almacenar datos del cliente en la coleccion clientes de firebase database
        /**
         * -añadir datos a firebase database :
        https://firebase.google.com/docs/firestore/manage-data/add-data?hl=es&authuser=0#add_a_documen
         */
        
        //no almacenamos la password ya que firebase la hashea solo
        
        await addDoc(collection(db,"clientes"), {
            nombre : nombre,
            apellidos : apellidos,
            cuenta : {
                email:email,
                login:login,
                imagenAvatarBASE64:'',
            },
            telefono:telefono,
            direcciones : [],
            pedidos: [],
            genero:'',
            //fechaNacimiento: ,
            descripcion:''
        });

        res.status(200).send(
            {
                codigo:0,
                mensaje:'registro ok..',
                error:null,
                datoscliente: _userCredential.user,
                token : await _userCredential.user.getIdToken(),
                otrosdatos:null
            }
        );
        
        } catch (error) {
            console.log('error en el registro....',error);

            res.status(400).send({
                codigo:1,
                mensaje:'registro fallido',
                error: error.message,
                datoscliente:null,
                token:null,
                otrosdatos:null
            });  
        }
    },

    comprobarEmail: async(req,res,next)=>{
        try {
            
            let _email = req.query.email;

            let _resultSnap = await getDocs(query(collection(db,'clientes'),where('cuenta.email','==',_email)));

            let _datoscliente = _resultSnap.docs.shift().data();
            console.log('datos del cliente recuperados con ese email...',_datoscliente);

            if(_datoscliente){

                res.status(200).send(
                    {
                        codigo:0,
                        mensaje:'El email ya existe',
                        error:null,
                        datoscliente: _datoscliente,
                        token:null,
                        otrosdatos:null
                    }
                );
            }else{
                throw new Error('no existe cliente con ese email, email no registrado')
            }

        } catch (error) {
            res.status(400).send({
                codigo:1,
                mensaje:'error en comprobacion de email ',
                error: error.message,
                datoscliente:null,
                token:null,
                otrosdatos:null
            });  
        }
    },

    operarCuentaCliente: async(req,res,next)=>{

        try {
            let {mode,oobCode,apiKey} = req.body;

            console.log('valores recibidos en el servidor...', mode,oobCode,apiKey);

            switch (mode) {
                case 'resetPassword':
                    
                    break;

                case 'recoverEmail':
                    break;

                case 'verifyEmail':

                //para activar la cuenta usamos el metodo applyActionCode, este recibe el servicio de Authentication y el codigo
                // de un solo uso que se manda en la url
                await applyActionCode(auth,oobCode).then( (resp) => {

                    res.status(200).send({
                        codigo:0,
                        mensaje:`La operacion (${req.body.mode}) sobre la cuenta, se ha realizado correctamente `,
                        error: null,
                        datoscliente:null,
                        token:null,
                        otrosdatos:null
                    })
                }).catch((error) => {
                    console.error('Error en la operación verifyEmail:', error);
                    res.status(400).send({
                        codigo: 1,
                        mensaje: `Error en la operación ${mode}: ${error.message}`,
                        error: error.message,
                        datoscliente: null,
                        token: null,
                        otrosdatos: null
                    });
                })
                break;
                
            
                default:
                    break;
            }
            
        } catch (error) {
            res.status(400).send({
                codigo:1,
                mensaje:`error en la operacion (${req.body.mode}) sobre la cuenta `,
                error: error.message,
                datoscliente:null,
                token:null,
                otrosdatos:null
            }); 
        }
    },

    activarCuenta: async(req,res,next)=>{
        try {
            let {mod,cod,key} = req.query;

            console.log('valores recibidos en el servidor...', mod,cod,key);

            //1º comprobar si el token de activacion de la cuenta es para verificar el email o no
            // lo ideal tb seria comprobar que el token enviado pertenece al usuario que quiere activar la cuente (su email)

            let _actionCodeInfo = await checkActionCode(auth,cod); //<--- objeto clase ActionCodeInfo
            console.log('actionCodeInfo en activar cuenta usuario firebase...',_actionCodeInfo);

            if(_actionCodeInfo.operation === 'VERIFY_EMAIL'){
                //buscar al cliente que tiene el email que hay en _actionCodeInfo.data
                
                let _querySnapshot =  await getDocs(query(collection(db,'clientes'),where('cuenta.email', '==', _actionCodeInfo.data.email)));

                if(!_querySnapshot.empty){
                    await applyActionCode(auth,cod);

                    res.status(200).send(
                    {codigo:0,
                    mensaje:`activacion cuenta ok `,
                    error: error.message,
                    datoscliente:null,
                    token:null,
                    otrosdatos:null}
                    )   
                }else{
                    throw new Error('No existe un usuario con ese email...')
                }
                
            }else{
                throw new Error('token no valido para verificar email....');
            }
            
        } catch (error) {
            res.status(400).send({
                codigo:1,
                mensaje:`error en activacion de la cuenta `,
                error: error.message,
                datoscliente:null,
                token:null,
                otrosdatos:null
            }); 
        }
    },

    uploadImagen: async(req,res,next)=>{
        try {
            //tengo q coger la extension del fichero, en req.body.imagen:  data:image/jpeg
            let _nombrefichero='imagen____' + req.body.emailcliente;//  + '.' + req.body.imagen.split(';')[0].split('/')[1]   ;
            console.log('nombre del fichero a guardar en STORGE...',_nombrefichero);
            let _result=await uploadString(ref(storage,`imagenes/${_nombrefichero}`), req.body.imagen,'data_url'); //objeto respuesta subida UploadResult         
        
            //podrias meter en coleccion clientes de firebase-database en prop. credenciales en prop. imagenAvatar
            //el nombre del fichero y en imagenAvatarBASE&$ el contenido de la imagen...
            let _refcliente=await getDocs(query(collection(db,'clientes'),where('cuenta.email','==',req.body.emailcliente)));
            _refcliente.forEach( async (result) => { 
                await updateDoc(result.ref, { 'cuenta.imagenAvatarBASE64': req.body.imagen } );
            });
            
           // generaRespuesta(0,'Imagen avatar subida OK!!! al storage de firebase','',null,null,null,res );
            res.status(200).send(
                {
                codigo:0,
                mensaje:'Imagen avatar subida OK!!! al storage de firebase',
                error: null,
                datoscliente:null,
                token:null,
                otrosdatos:res
                }
            )
        } catch (error) {
            console.log('error subida imagen...',error);
           // generaRespuesta(5,'fallo a la hora de subir imagen al storage',error,null,null,null,res);

            res.status(400).send(
                {
                    codigo:1,
                    mensaje:'fallo a la hora de subir imagen al storage',
                    error: error,
                    datoscliente:null,
                    token:null,
                    otrosdatos:res  
                }
            )

        }
    } ,

    updateDatosCliente: async(req,res,next)=>{
        try {
            let {datosCliente,passCambiar, emailCliente}= req.body;
            console.log(datosCliente,passCambiar,emailCliente)
            let _clienteSnap = getDocs(query(collection(db,'clientes'),where('cuenta.email','==',emailCliente)));
            let _idCliente = (await _clienteSnap).docs.shift().id;
            let _datosClienteRecupBd = (await _clienteSnap).docs.shift().data();
            console.log('id cliente...', _idCliente);

            let _clienteRef = await doc(db,'clientes', _idCliente);

            let _resUpdate = await setDoc(_clienteRef, datosCliente, {merge:true})
            let _userCredencial='';
            
            
            if(datosCliente.cuenta.imagenAvatarBASE64 != _datosClienteRecupBd.cuenta.imagenAvatarBASE64){
                let _respUpdateImagen = await uploadImagenCliente(datosCliente.cuenta.imagenAvatarBASE64,emailCliente);
                if(_respUpdateImagen){
                    console.log('imagen actualizada..')
                }
            }

                if(datosCliente.cuenta.email !== emailCliente){
                    console.log('emails distintos...toca actualizar...', datosCliente.cuenta.email, emailCliente);
                   await updateEmail(auth.currentUser, datosCliente.cuenta.email);
                   await verifyBeforeUpdateEmail(auth.currentUser, datosCliente.cuenta.email)         
                }
                if(passCambiar != ''){
                        
                        console.log('current email..',auth.currentUser.email)
                    if(auth.currentUser.email == datosCliente.cuenta.email){
                        
                       let creds= await EmailAuthProvider.credential(emailCliente,passCambiar);
                        
                        let _reauth = await reauthenticateWithCredential(auth.currentUser,creds).catch(
                           async  ()=>{
                                
                                    console.log('toca cambiar contraseña...',passCambiar);
                                    await updatePassword(auth.currentUser, passCambiar);
                                    _userCredencial = await signInWithEmailAndPassword(auth,datosCliente.cuenta.email,passCambiar);
                                    //console.log('_usercredential nuevo..',_userCredencial)
                                    
                                
                            }
                        )
                      
                        if(_reauth != undefined){
                            console.log('contraseñas iguales, no se actualiza...')
                            
                        }
                        
                    }else{
                        console.log('no hay pass a cambiar..')
                    }
                   
                }
           

            let _datosClienteActualizadosSnap = await getDocs(query(collection(db,'clientes'),where('cuenta.email','==',datosCliente.cuenta.email)))
            let _datosClienteActualizados = _datosClienteActualizadosSnap.docs.shift().data();
            console.log('nuevos datos del cliente....',_datosClienteActualizados)
                let token = await auth.currentUser.getIdToken()
                
          if(_userCredencial != ''){
            token = await _userCredencial.user.getIdToken()
           
          }

            res.status(200).send(
                {
                    codigo:0,
                    mensaje:'Datos del cliente actualizados correctamente...',
                    error: null,
                    datoscliente:_datosClienteActualizados,
                    token: token,
                    otrosdatos:null  
                }
            )

        } catch (error) {
            res.status(400).send(
                {
                    codigo:1,
                    mensaje:'fallo a la hora de actualizar datos del cliente',
                    error: error,
                    datoscliente:null,
                    token:null,
                    otrosdatos:null  
                }
            )
        }
    }

} 