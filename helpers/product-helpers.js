/* Helps with uploading data to mongo*/


var db= require('../config/connection')
var collection=require('../config/collections')
const { response } = require('express')
var ObjectId = require('mongodb').ObjectId

module.exports={

    addProduct:(product,callback)=>{
      
       db.get().collection('product').insertOne(product).then((data)=>{

        callback(data.insertedId)
          
        })
        
    },getALLProducts:()=>{                                                                          

        return new Promise((resolve,reject)=>{ 
            let products= db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()  
            resolve(products)   
        })  

    },
    
    
    deleteProduct:(proId)=>{
           

       return new Promise((resolve,reject)=>{

        db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({_id:ObjectId(proId)}).then((response)=>{
            
            resolve(response)

            })
       })
  
    },
    getProductDetails:(proId)=>{
        return new Promise((resolve,reject)=>{

            db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:ObjectId(proId)}).then((product)=>{

                resolve(product)
            })

            
        })
    },

    updateProduct:(proId,proDetails)=>{

        return new Promise((resolve,reject)=>{

            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id:ObjectId(proId)},
            {
                $set:{
                    Name:proDetails.Name,
                    Description:proDetails.Description,
                    Price:proDetails.Price,
                    Category:proDetails.Category
                }
            }).then((response)=>{
                 resolve()
            })
        })
    }
    
}