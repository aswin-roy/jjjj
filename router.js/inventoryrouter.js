
const express=require("express");
const 
{createInventory,
getAllInventory,
getInventoryById,
updateInventory,
deleteInventory
}=require('../controllers/inventorycontrollers');
const Router=express.Router();

//CREATE
Router.post("/",async(req ,res)=>{
    try {
        await createInventory(req,res);
    } catch (err) {
        console.log(err);
        res.status(500).json({message:"server error",error:err.message})
    }
})
// READ ALL
Router.get("/",async(req,res)=>{
    try{
        await getAllInventory(req,res);
    }catch(err){
        console.log(err);
        res.status(500).json({message:"server error",error:err.message})
    }
    })
// READ BY ID
Router.get("/:id",async(req,res)=>{
    try{
        await getInventoryById(req,res);
    }catch(err){
        console.log(err);
        res.status(500).json({message:"server error",error:err.message})
    }
    })
    //UPDATE
    Router.put("/:id",async(req,res)=>{
        try{
            await updateInventory(req,res);
        }catch(err){
            console.log(err);
            res.status(500).json({message:"server error",error:err.message})
        
        }
    })

    // DELETE
    Router.delete("/:id",async(req,res)=>{
        try{
            await deleteInventory(req,res);
        }catch(err){
            console.log(err);
            res.status(500).json({message:"server error",error:err.message})
        }
    })
module.exports=Router;