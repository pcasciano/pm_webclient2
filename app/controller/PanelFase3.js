Ext.define('PM.controller.PanelFase3', {

    extend: 'Ext.app.Controller',


    views:['PanelFase3'],

    init: function(){
        this.control({
            'panelFase3':{
              //  afterrender: this.onBeforeRender
            }
        });
    },

    beforeRender: function(o, eopts){
        alert('bef rend');
    }

});
