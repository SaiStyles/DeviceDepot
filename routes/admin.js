const { response } = require('express');
var express = require('express');
const db = require('mongodb');
const app = require('../app');
const { deleteProduct } = require('../helpers/product-helpers');
var router = express.Router();
var productHelpers = require('../helpers/product-helpers')


/* GET users listing. */
router.get('/', function (req,res, next) {

  productHelpers.getALLProducts().then((products) => {
 
    res.render('admin/products', { products, admin: true })

  })
})

router.get('/add-products', function (req, res) {

  res.render('admin/add-products')
})


router.post('/add-products', (req, res) => {

  console.log(req.body)

  productHelpers.addProduct(req.body, (id) => {
    let image = req.files.Image
    image.mv('./public/images/' + id + '.jpg', (err) => {
      if (!err) {
        res.render("admin/add-products")
      } else {
        console.log(err)
      }
    })

  })

  res.redirect('/admin')

})

router.get('/delete-product/:id',(req,res)=>{

  proId=req.params.id

  productHelpers.deleteProduct(proId).then((response)=>{

    res.redirect('/admin/')
  })
 
})

/*
router.get('/edit-product/:id',async (req,res)=>{

  Let product=await productHelpers.getProductDetails(req.params.id)

    res.render('admin/edit-product',{product})

  })
 
}) */

router.get('/edit-product/:id',(req,res)=>{

  productHelpers.getProductDetails(req.params.id).then((product)=>{

    res.render('admin/edit-product',{product})  
  })
})

router.post('/edit-product/:id',(req,res)=>{

  let id=req.params.id
  productHelpers.updateProduct(req.params.id,req.body).then(()=>{

    res.redirect('/admin')
    if(req.files.Image){

      let image = req.files.Image
      image.mv('./public/images/' + id + '.jpg')

    }
  })

})

module.exports = router;