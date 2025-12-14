const inventory=require("../models.js/inventorymodels");

// CREATE INVENTORY ITEM
const createInventory=async(req ,res)=>{
    try{
        const{productname,skucode,category,price,stock}=req.body;
        const newItem=new inventory({productname,skucode,category,price,stock});
        const savedItem=await newItem.save();
        return res.status(201).json({message:"Inventory item created",data:savedItem})
    }catch(err){
        return res.status(500).json({message:"server error",error:err.message})
    }
    };
    // READ ALL 

    const getAllInventory=async(req,res)=>{
        try{
            const item =await inventory.find({});
            return res.status(200).json({message:'all inventory items',data:item});
        }catch(err){
            return res.status(500).json({message:'server error',error:err.message});
        }
        }
    // READ BY ID INVENTORY
      
    const getInventoryById=async(req,res)=>{
        try{
            const item =await inventory.findById(req.params.id);
            if(!item) return res.status(404).json({message:"inventory not found"})
                return res.status(200).json({data:item});
        }catch(err){
            return res.status(500).json({message:"server error",error:err.message});

        }
        }

    // UPDATE INVENTORY

    const updateInventory=async(req,res)=>{
        try{
            const updated= await inventory.findByIdAndUpdate(req.params.id,req.body,{new:true});
            if(!updated) return res.status(404).json({message:"inventory not found"});
            return res.status(200).json({message:"inventory updated",data:updated});
        }catch(err){
            return res.status(500).json({message:"server error",error:err.message});
        }
    }

    // DELETE

    const deleteInventory=async(req,res)=>{
        try{
            const deleted=await inventory.findByIdAndDelete(req.params.id);
            if(!deleted) return res.status(404).json({message:"inventory not found"});
            return res.status(200).json({message:"inventory deleted",data:deleted});
        }catch(err){
            return res.status(500).json({message:"server error",error:err.message});

        }
    }


    module.exports = {
  createInventory,
  getAllInventory,
  getInventoryById,
  updateInventory,
  deleteInventory
};
    



