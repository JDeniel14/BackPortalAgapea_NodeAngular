
const {initializeApp} = require('firebase/app');
const axios=require('axios');

const app = initializeApp(JSON.parse(process.env.FIREBASE_CONFIG));

const {getAuth} = require('firebase/auth');

const aut = getAuth(app);

const {getFirestore, query, collection, where, getDocs, getDoc, doc} = require('firebase/firestore')

const db = getFirestore();


module.exports={

    recuperarCategorias: async(req,res,next)=> {

        try {
            console.log('params..,',req.query)
            const {idcat} = req.query;

            console.log('idCategoria recibida por el server...',idcat);

            
            let categorias = [];
 
            const qSnapShot = await getDocs(collection(db,'categorias'));

            if(!qSnapShot.empty){

                
                qSnapShot.forEach((doc) => {
                    if( idcat === 'raices' || typeof(idcat) === 'undefined'){
                        if(new RegExp("^\\d{1,}$").test(doc.data().IdCategoria)){
                            
                            categorias.push(doc.data());
                        }
                    }else{
                     if(new RegExp('^' + idcat + "-\\d{1,}$").test(doc.data().IdCategoria)){
                        
                        categorias.push(doc.data());
                     }   
                    }
                    
                })
    
                
                console.log('categorias recuperadas de la bd', categorias);
    
                res.status(200).send(
                    categorias.sort((a,b) => a.IdCategoria - b.IdCategoria)
                )
            }

        } catch (error) {
            return [];
        }
    },

    recuperarLibros: async (req,res,next)=> {
        try {
            const {idcat} = req.query;
            console.log('categoria mandada para recuperar libros...',idcat);
            
            let libros = [];

            
            const q = query(collection(db, "libros"));

            const qSnapShot = await getDocs(q);

            if(!qSnapShot.empty){
                qSnapShot.forEach((doc)=>{
                    
                    if(new RegExp('^' + idcat + "-\\d{1,}$").test(doc.data().IdCategoria)){
                        
                        libros.push(doc.data());
                     }   
                })
            }
            res.status(200).send(libros);
        } catch (error) {
            console.log('error al recuperar los libros...',error)
            res.status(500).send([]);
        }
    },

    recuperarUnLibro: async (req,res,next)=> {
        try {
            let {isbn} = req.query;
            console.log('isbn recibido por server...',isbn);

            let _librosnaps=await getDocs( query(collection(db,'libros'),where('ISBN13','==',isbn)) );
            let libro = {};
            if(!_librosnaps.empty){
             _librosnaps.forEach(libsnap => libro = libsnap.data()) ; 
            
            res.status(200).send(libro);
            }
        } catch (error) {
            console.log('error al recuperar el libro...',error)
            res.status(400).send(undefined);
        }
    },

    recuperarProvincias: async(req,res,next)=>{
        try {
            console.log('holaaaaaaaaaaaa')
            let _resp=await axios.get(`https://apiv1.geoapi.es/provincias?type=JSON&key=${process.env.GEOAPI_KEY}&sandbox=0`);
            let _provs =_resp.data.data;
            /*let _provinciasSnaps = await getDocs(query(collection(db,'provincias')));

            let provincias = [];
            if(!_provinciasSnaps.empty){
                _provinciasSnaps.forEach(prov => {
                    provincias.push(prov.data())
                });
            }
            console.log('provincias...',provincias)
            res.status(200).send(
                provincias.sort((a,b)=> a.CPRO - b.CPRO)
            )*/
            
            res.status(200).send(_provs);
        } catch (error) {
            res.status(400).send([]);
        }
    },

    recuperarMunicipios: async(req,res,next)=> {
        try {
            let {codpro}=req.query;
            

            let _resp=await axios.get(`https://apiv1.geoapi.es/municipios?CPRO=${codpro}&type=JSON&key=${process.env.GEOAPI_KEY}&sandbox=0`);
            let _munis=_resp.data.data;

            
            /*console.log('codpro recibido en server...',codpro);

            let _municipiosSnaps = await getDocs(query(collection(db,'municipios'),where('CPRO','==',codpro)));
            let municipios = [];
            
            if(!_municipiosSnaps.empty){
                
                _municipiosSnaps.forEach(muni=>{
                    municipios.push(muni.data())
                })    
                
                res.status(200).send(
                    municipios
                )
            }*/
            res.status(200).send(_munis)
        } catch (error) {
            res.status(400).send([]);
        }
    },
  



   
}



