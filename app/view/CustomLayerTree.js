Ext.define('PM.view.CustomLayerTree', {
    
    alias: 'widget.customlayertree',  
    extend: 'Ext.panel.Panel',
    border:false,
   
    layout:{
        type: 'hbox',  
    },
  
    width:196,
    height:40,
 

   
    items:[{
        xtype:'checkbox',                   
        labelWidth:60,
        width:90
    },{
        xtype:'comboyears',
        fieldLabel: 'Dal',
        disabled:true
    }]
    
}); 
