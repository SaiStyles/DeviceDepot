var db= require('../config/connection')
var collection=require('../config/collections')
const bcrypt=require('bcrypt')
var ObjectId = require('mongodb').ObjectId
const { response } = require('express')
const { OrderedBulkOperation } = require('mongodb')
const { CART_COLLECTION } = require('../config/collections')
const { resource } = require('../app')
const Razorpay=require('razorpay')
const { resolve } = require('path')


var instance = new Razorpay({
    key_id: "rzp_test_oKqpM9BbxM0iOV",
    key_secret: 'Du9IEzoMGOmc6itsuNufOc7b'
  });

module.exports={

    doSignup:(UserData)=>{

        return new Promise(async(resolve,reject)=>{

        UserData.Password=await bcrypt.hash(UserData.Password,10)
        db.get().collection(collection.USER_COLLECTION).insertOne(UserData)
            resolve(UserData)
        })
         
    },doLogin:(UserData)=>{
        return new Promise(async(resolve,reject)=>{
            
            let response={}
            let user=await db.get().collection(collection.USER_COLLECTION).findOne({Email:UserData.Email}) /*look for the dude with email he requested(UserData.Email)  */
            if(user){   /*if user exist */
                
                 bcrypt.compare(UserData.Password,user.Password).then((status)=>{  /*userData.password=requested password,user.Password=the one in the database */
                    if(status){     /* if the status is true */
                        console.log("Login is successfull")
                        response.user=user
                        response.status=true
                        resolve(response)
                    }else{
                        console.log("shit is unsuccessful")
                        resolve({status:false})
                 }
                })
            }else{
                console.log("login failed")
                resolve({status:false})
            }
        })
    },

    addToCart:(proId,userId)=>{
        let proObj={
            item:ObjectId(proId),
            quantity:1
        }

        return new Promise(async(resolve,reject)=>{
            let userCart= await db.get().collection(collection.CART_COLLECTION).findOne({user:ObjectId(userId)})
            if(userCart){
                let proExist=userCart.products.findIndex(product=> product.item==proId)     /* "product" is each object in products ,it is just a variable*/    /*https://www.javascripttutorial.net/es6/javascript-array-findindex/ */

                if(proExist!=-1){
                    db.get().collection(collection.CART_COLLECTION)
                    .updateOne({user:ObjectId(userId),'products.item':ObjectId(proId)},
                    {
                        $inc:{'products.$.quantity':1} /* $ is used cuz i am changing an element in an array*/
                    }

                    ).then(()=>{
                        resolve()
                    })

                }else{
                    db.get().collection(collection.CART_COLLECTION)
                    .updateOne({user:ObjectId(userId)},{
    
                            $push:{products:proObj}
                       
                    }).then((response)=>{
                        resolve()
                    })
                    }
                
            }else{
              let cartObj={
                    user:ObjectId(userId),
                    products:[proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response)=>{
                    resolve()
                
                })
            }
        })
    },
    getCartProducts:(userId)=>{
        return new Promise(async(resolve,reject)=>{
             let cartItems=await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match:{user:ObjectId(userId)}
                },{
                    $unwind:'$products'
                },{
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },{
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'

                    }
                },{
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                    }
                }
                
             ]).toArray()
             
             resolve(cartItems)

        })
    },
    getCartCount:(userId)=>{
        return new Promise(async(resolve,reject)=>{
         let Count=0
         let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:ObjectId(userId)})
            if(cart){
                Count=cart.products.length
            }
            resolve(Count) 
        })
    },
    changeProductQuanity:(details)=>{
        details.count=parseInt(details.count)
        details.quantity=parseInt(details.quantity)
         
        return new Promise((resolve,reject)=>{
            if(details.count==-1 && details.quantity==1){
                db.get().collection(collection.CART_COLLECTION)
                .updateOne({_id:ObjectId(details.cart)},
                {
                    $pull:{products:{item:ObjectId(details.product)}}
                }
                ).then((response)=>{
                    resolve({removeProduct:true})
                })


            }else{
            db.get().collection(collection.CART_COLLECTION)
            .updateOne({_id:ObjectId(details.cart),'products.item':ObjectId(details.product)},
            {
                $inc:{'products.$.quantity':details.count}/* $ is used cuz i am changing an element in an array*/
            }

            ).then((response)=>{
                resolve({status:true})
            })
            }

        })
    },
    getTotalAmount:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let total=await db.get().collection(collection.CART_COLLECTION).aggregate([
               {
                   $match:{user:ObjectId(userId)}
               },{
                   $unwind:'$products'
               },{
                   $project:{
                       item:'$products.item',
                       quantity:'$products.quantity'
                   }
               },{
                   $lookup:{
                       from:collection.PRODUCT_COLLECTION,
                       localField:'item',
                       foreignField:'_id',
                       as:'product'

                   }
               },{
                   $project:{
                       item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                   }
               },
               {
                   $group:{
                       _id:null,
                       total:{$sum:{$multiply: ['$quantity', {$toInt: '$product.Price'}]}}
                   }
               }
               
            ]).toArray()
            
            resolve(total[0].total)

       })
    },
    placeOrder:(order,products,total)=>{
        return new Promise((resolve,reject)=>{
           console.log(order,products,total )
           let status=order['payment-method']==='COD'?'placed':'pending' /* if payment method is cod then placed if not then pending*/
            let orderObj={
                deliveryDetails:{
                    mobile:order.mobile,
                    address:order.address,
                    pincode:order.pincode
                },
                userId:ObjectId(order.userId),
                PaymentMethod:order['payment-method'], /*it should have been order.payment-method but because it has quotes and to remove it this is done */
                products:products,
                totalAmount:total,
                status:status,
                date:new Date()
            }

            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
                db.get().collection(CART_COLLECTION).deleteOne({user:ObjectId(order.userId)})
                resolve(response.insertedId)
            })
           
        })

    },
    getProductList:(userId)=>{
       return new Promise(async(resolve,reject)=>{
            let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:ObjectId(userId)})
            resolve(cart.products)
        })
    },
    getUserOrders:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let orders=await db.get().collection(collection.ORDER_COLLECTION)
            .find({userId:(ObjectId(userId))}).toArray()
            resolve(orders)
        })
    },
    getOrderProducts:(orderId)=>{
        return new Promise(async(resolve,reject)=>{
             let orderItems=await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match:{user:ObjectId(orderId)}
                },{
                    $unwind:'$products'
                },{
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },{
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'

                    }
                },{
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                    }
                }
                
             ]).toArray()
             
             resolve(orderItems)

        })
    },
    generateRazorpay:(orderId,total)=>{
        return new Promise((resolve,reject)=>{
            console.log(orderId);
            var options={
                amount:total*100,
                currency:'INR',
                receipt:""+orderId //this is to convert it into str 
            };
            instance.orders.create(options,function(err,order){
                if(err){
                    console.log(err);
                }else{
                console.log("new order",order);
                resolve(order)
            }
            })
        })
    },
    verifyPayment:(details)=>{
        return new Promise(async(resolve,reject)=>{
            const { createHmac } = await import('crypto');  //hmac.update()
            const secret = 'Du9IEzoMGOmc6itsuNufOc7b';    //these codes are copied from crypto documentation
                   
    const hash = createHmac('sha256', secret)
        .update(details['payment[razorpay_order_id]']+'|'+details['payment[razorpay_payment_id]']).digest('hex');
    console.log(hash);
            if(hash==details['payment[razorpay_signature]']){
                resolve()
            }else{
                reject()
            }
        })
       

    },
    changePaymentStatus:(orderId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION)
            .updateOne({_id:ObjectId(orderId)},
            {
                $set:{
                    status:'placed'
                }
            }).then(()=>{
                resolve()
            })
        })
    }
}

// generated_signature = hmac_sha256(order_id (which is razor orderid) + "|" + razorpay_payment_id, secret);

//   if (generated_signature == razorpay_signature) {
//     payment is successful
//   }